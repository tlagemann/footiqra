import { describe, expect, it, vi } from "vitest";
import {
  backoffDelay,
  fetchWithRetry,
  HttpError,
  parseRetryAfter,
  RateLimiter,
  type FetchLike,
} from "./http";

const noSleep = vi.fn(async () => {});
const fixedRandom = () => 1; // jitter factor 1.0

function responses(...items: Array<Response | Error>): FetchLike {
  const queue = [...items];
  return vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("no more responses");
    if (next instanceof Error) throw next;
    return next;
  });
}

describe("RateLimiter", () => {
  it("spaces requests evenly", async () => {
    let clock = 0;
    const waits: number[] = [];
    const limiter = new RateLimiter(
      10,
      () => clock,
      async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    );
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(waits).toEqual([6000, 6000]);
  });

  it("does not wait when enough time has passed", async () => {
    let clock = 0;
    const sleep = vi.fn(async () => {});
    const limiter = new RateLimiter(10, () => clock, sleep);
    await limiter.acquire();
    clock = 10_000;
    await limiter.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds and HTTP dates", () => {
    expect(parseRetryAfter("7")).toBe(7000);
    expect(
      parseRetryAfter("Wed, 28 Oct 2026 10:00:10 GMT", Date.parse("2026-10-28T10:00:00Z")),
    ).toBe(10_000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
  });
});

describe("backoffDelay", () => {
  it("grows exponentially and is capped", () => {
    const opts = { baseDelayMs: 1000, maxDelayMs: 5000, random: fixedRandom };
    expect([1, 2, 3, 4].map((a) => backoffDelay(a, opts))).toEqual([1000, 2000, 4000, 5000]);
  });
});

describe("fetchWithRetry", () => {
  const opts = { sleep: noSleep, random: fixedRandom, baseDelayMs: 10 };

  it("returns the first successful response", async () => {
    const fetchImpl = responses(new Response("ok"));
    const res = await fetchWithRetry("https://x.test", {}, fetchImpl, opts);
    expect(await res.text()).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries 429 and honours Retry-After", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = responses(
      new Response("slow down", { status: 429, headers: { "retry-after": "3" } }),
      new Response("ok"),
    );
    const res = await fetchWithRetry("https://x.test", {}, fetchImpl, { ...opts, sleep });
    expect(res.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("retries network errors and 5xx", async () => {
    const fetchImpl = responses(
      new TypeError("fetch failed"),
      new Response("boom", { status: 503 }),
      new Response("ok"),
    );
    const res = await fetchWithRetry("https://x.test", {}, fetchImpl, opts);
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry other 4xx errors", async () => {
    const fetchImpl = responses(new Response("forbidden", { status: 403 }));
    await expect(fetchWithRetry("https://x.test", {}, fetchImpl, opts)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts", async () => {
    const fetchImpl = responses(
      new Response("", { status: 500 }),
      new Response("", { status: 500 }),
    );
    await expect(
      fetchWithRetry("https://x.test", {}, fetchImpl, { ...opts, maxAttempts: 2 }),
    ).rejects.toMatchObject({ status: 500 });
  });
});
