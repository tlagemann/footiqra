import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMatchFile, readMeta, readTeams } from "@/store/fs";
import { RateLimiter } from "./http";
import { parseIngestEnv } from "./env";
import { FootballDataClient } from "./providers/football-data/client";
import { runIngest } from "./run";

// Synthetic API payloads in the documented v4 shape. Fictional teams, not real data.
function apiMatch(id: number, home: number, away: number, lastUpdated = "2026-09-12T16:05:00Z") {
  return {
    id,
    utcDate: "2026-09-12T14:00:00Z",
    status: "FINISHED",
    matchday: 3,
    stage: "REGULAR_SEASON",
    lastUpdated,
    homeTeam: { id: home, name: `Example Team ${home}`, shortName: null, tla: null, crest: null },
    awayTeam: { id: away, name: `Example Team ${away}`, shortName: null, tla: null, crest: null },
    score: { winner: "DRAW", duration: "REGULAR", fullTime: { home: 1, away: 1 } },
  };
}

const noWaitLimiter = new RateLimiter(
  60,
  () => 0,
  async () => {},
);

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "footiqra-ingest-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FootballDataClient", () => {
  it("sends the token as header only and validates the response", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ matches: [apiMatch(1, 10, 11)] }));
    const client = new FootballDataClient({
      token: "secret-token-123",
      requestsPerMinute: 60,
      fetchImpl,
      limiter: noWaitLimiter,
    });
    const matches = await client.getCompetitionMatches("PL", 2026);
    expect(matches).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.football-data.org/v4/competitions/PL/matches?season=2026");
    expect(url).not.toContain("secret");
    expect((init.headers as Record<string, string>)["X-Auth-Token"]).toBe("secret-token-123");
    expect(client.requestsMade).toBe(1);
  });

  it("rejects malformed responses and invalid codes", async () => {
    const client = new FootballDataClient({
      token: "secret-token-123",
      requestsPerMinute: 60,
      fetchImpl: async () => Response.json({ matches: [{ id: "x" }] }),
      limiter: noWaitLimiter,
    });
    await expect(client.getCompetitionMatches("PL", 2026)).rejects.toThrow(/Unexpected response/);
    await expect(client.getCompetitionMatches("../x", 2026)).rejects.toThrow(/Invalid competition/);
  });
});

describe("runIngest", () => {
  it("writes matches, teams and meta, and is idempotent", async () => {
    const client = {
      requestsMade: 0,
      getCompetitionMatches: vi.fn(async () => {
        const { fdMatchListSchema } = await import("./providers/football-data/schemas");
        return fdMatchListSchema.parse({ matches: [apiMatch(1, 10, 11), apiMatch(2, 11, 10)] })
          .matches;
      }),
    };
    const now = () => new Date("2026-10-28T10:00:00Z");

    const first = await runIngest({
      client,
      dataDir: dir,
      season: 2026,
      competitions: ["PL"],
      now,
    });
    expect(first.results[0]).toMatchObject({ competition: "PL", ok: true, added: 2 });
    expect((await readMatchFile(dir, "PL", 2026))?.matches).toHaveLength(2);
    expect(Object.keys((await readTeams(dir)).teams)).toEqual(["10", "11"]);
    expect(await readMeta(dir)).toMatchObject({
      lastSuccessfulRunUtc: "2026-10-28T10:00:00.000Z",
      competitions: { PL: { season: 2026, matchCount: 2 } },
    });

    const second = await runIngest({
      client,
      dataDir: dir,
      season: 2026,
      competitions: ["PL"],
      now,
    });
    expect(second.results[0]).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
  });

  it("keeps going when one competition fails", async () => {
    const client = {
      requestsMade: 0,
      getCompetitionMatches: vi.fn(async (code: string) => {
        if (code === "PL") throw new Error("HTTP 503");
        return [];
      }),
    };
    const result = await runIngest({
      client,
      dataDir: dir,
      season: 2026,
      competitions: ["PL", "BL1"],
    });
    expect(result.results).toEqual([
      { competition: "PL", ok: false, error: "HTTP 503" },
      { competition: "BL1", ok: true, added: 0, updated: 0, unchanged: 0 },
    ]);
    const meta = await readMeta(dir);
    expect(meta.competitions.PL).toBeUndefined();
    expect(meta.competitions.BL1).toBeDefined();
  });
});

describe("parseIngestEnv", () => {
  it("requires the token and reports names only", () => {
    expect(() => parseIngestEnv({})).toThrow("FOOTBALL_DATA_API_TOKEN");
  });

  it("applies defaults", () => {
    const env = parseIngestEnv({ FOOTBALL_DATA_API_TOKEN: "abcdefghijkl" });
    expect(env.FOOTBALL_DATA_REQUESTS_PER_MINUTE).toBe(8);
    expect(env.FOOTIQRA_SEASON).toBeUndefined();
  });
});
