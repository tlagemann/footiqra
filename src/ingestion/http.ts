/**
 * Generic HTTP helpers for talking to external football data providers:
 * client-side rate limiting and retries with exponential backoff.
 *
 * Only used by the ingestion job (server/cron). Never imported by UI code.
 */

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly bodySnippet: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

/**
 * Spaces out requests so we never exceed `requestsPerMinute`.
 * football-data.org free tier allows 10 requests per minute, so we keep a margin.
 */
export class RateLimiter {
  private nextSlot = 0;
  private readonly intervalMs: number;

  constructor(
    requestsPerMinute: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: Sleep = realSleep,
  ) {
    if (!(requestsPerMinute > 0)) throw new Error("requestsPerMinute must be > 0");
    this.intervalMs = Math.ceil(60_000 / requestsPerMinute);
  }

  /** Resolves when the caller may send the next request. */
  async acquire(): Promise<void> {
    const now = this.now();
    const slot = Math.max(now, this.nextSlot);
    this.nextSlot = slot + this.intervalMs;
    const wait = slot - now;
    if (wait > 0) await this.sleep(wait);
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: Sleep;
  /** 0..1, injectable for deterministic tests. */
  random: () => number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 2_000,
  maxDelayMs: 60_000,
  sleep: realSleep,
  random: Math.random,
};

/** 429 and 5xx are worth retrying; other 4xx (bad token, wrong code) are not. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Retry-After header in seconds or as HTTP date. */
export function parseRetryAfter(header: string | null, now: number = Date.now()): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export function backoffDelay(
  attempt: number,
  opts: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "random">,
): number {
  const exp = opts.baseDelayMs * 2 ** (attempt - 1);
  const jitter = 0.5 + opts.random() / 2; // 50 % - 100 %
  return Math.min(opts.maxDelayMs, Math.round(exp * jitter));
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * GET with retries. Network errors, 429 and 5xx are retried; Retry-After is honoured.
 * Throws HttpError for non-retryable responses or when attempts are exhausted.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike = fetch,
  options: Partial<RetryOptions> = {},
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    let delay: number;
    try {
      const response = await fetchImpl(url, init);
      if (response.ok) return response;

      const body = (await response.text().catch(() => "")).slice(0, 300);
      lastError = new HttpError(response.status, url, body);
      if (!isRetryableStatus(response.status)) throw lastError;
      delay = parseRetryAfter(response.headers.get("retry-after")) ?? backoffDelay(attempt, opts);
    } catch (error) {
      if (error instanceof HttpError && !isRetryableStatus(error.status)) throw error;
      lastError = error;
      delay = backoffDelay(attempt, opts);
    }
    if (attempt < opts.maxAttempts) await opts.sleep(Math.min(delay, opts.maxDelayMs));
  }
  throw lastError;
}
