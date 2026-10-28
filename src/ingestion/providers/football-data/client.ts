import { fetchWithRetry, RateLimiter, type FetchLike, type RetryOptions } from "@/ingestion/http";
import { fdMatchListSchema, fdStandingsSchema, type FdMatch, type FdStandingRow } from "./schemas";

export const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";

export interface FootballDataClientOptions {
  token: string;
  requestsPerMinute: number;
  fetchImpl?: FetchLike;
  retry?: Partial<RetryOptions>;
  limiter?: RateLimiter;
}

/**
 * Minimal football-data.org v4 client: rate limited, retried, validated.
 * The token is only ever placed in the X-Auth-Token header, never in URLs or logs.
 */
export class FootballDataClient {
  private readonly limiter: RateLimiter;
  private readonly fetchImpl: FetchLike;
  requestsMade = 0;

  constructor(private readonly options: FootballDataClientOptions) {
    this.limiter = options.limiter ?? new RateLimiter(options.requestsPerMinute);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async getJson(pathAndQuery: string): Promise<unknown> {
    await this.limiter.acquire();
    this.requestsMade++;
    const response = await fetchWithRetry(
      `${FOOTBALL_DATA_BASE_URL}${pathAndQuery}`,
      { headers: { "X-Auth-Token": this.options.token, Accept: "application/json" } },
      this.fetchImpl,
      this.options.retry,
    );
    return response.json();
  }

  /** All matches of one competition and season (scheduled, live and finished). */
  async getCompetitionMatches(code: string, season: number): Promise<FdMatch[]> {
    if (!/^[A-Z0-9]{2,5}$/.test(code)) throw new Error(`Invalid competition code: ${code}`);
    const raw = await this.getJson(`/competitions/${code}/matches?season=${season}`);
    const parsed = fdMatchListSchema.safeParse(raw);
    if (!parsed.success) {
      const where = parsed.error.issues
        .slice(0, 3)
        .map((i) => i.path.join("."))
        .join(", ");
      throw new Error(`Unexpected response shape for ${code} ${season} (${where})`);
    }
    return parsed.data.matches;
  }

  /**
   * Official league table (overall, not home/away) of one competition and season.
   * Uses the provider's order, so league-specific tie-breakers and point
   * deductions are respected.
   */
  async getStandings(code: string, season: number): Promise<FdStandingRow[]> {
    if (!/^[A-Z0-9]{2,5}$/.test(code)) throw new Error(`Invalid competition code: ${code}`);
    const raw = await this.getJson(`/competitions/${code}/standings?season=${season}`);
    const parsed = fdStandingsSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`Unexpected standings shape for ${code} ${season}`);
    const total = parsed.data.standings.find((s) => s.type === "TOTAL");
    if (!total) throw new Error(`No overall table for ${code} ${season}`);
    return [...total.table].sort((a, b) => a.position - b.position);
  }
}
