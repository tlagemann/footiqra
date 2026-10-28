import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMatchFile, readMeta, readStandingsFile, readTeams } from "@/store/fs";
import { RateLimiter } from "./http";
import { parseIngestEnv } from "./env";
import { FootballDataClient } from "./providers/football-data/client";
import { runIngest, runStandingsIngest } from "./run";

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

describe("standings", () => {
  const standingRow = (position: number, id: number) => ({
    position,
    team: { id, name: `Example Team ${id}`, shortName: null, tla: null, crest: null },
    playedGames: 9,
    form: null,
    won: 5,
    draw: 2,
    lost: 2,
    points: 17,
    goalsFor: 14,
    goalsAgainst: 9,
    goalDifference: 5,
  });

  it("fetches the overall table in position order", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        standings: [
          { stage: "REGULAR_SEASON", type: "HOME", group: null, table: [standingRow(1, 11)] },
          {
            stage: "REGULAR_SEASON",
            type: "TOTAL",
            group: null,
            table: [standingRow(2, 10), standingRow(1, 11)],
          },
        ],
      }),
    );
    const client = new FootballDataClient({
      token: "secret-token-123",
      requestsPerMinute: 60,
      fetchImpl,
      limiter: noWaitLimiter,
    });
    const table = await client.getStandings("PL", 2026);
    expect(table.map((r) => r.team.id)).toEqual([11, 10]);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.football-data.org/v4/competitions/PL/standings?season=2026");
  });

  it("writes one file per league and keeps going after a failure", async () => {
    const client = {
      getStandings: vi.fn(async (code: string) => {
        if (code === "BL1") throw new Error("boom");
        return [standingRow(1, 10)];
      }),
    };
    const results = await runStandingsIngest({
      client,
      dataDir: dir,
      season: 2026,
      competitions: ["PL", "BL1"],
      now: () => new Date("2026-10-01T00:00:00Z"),
    });
    expect(results.map((r) => r.ok)).toEqual([true, false]);
    const file = await readStandingsFile(dir, "PL", 2026);
    expect(file?.fetchedUtc).toBe("2026-10-01T00:00:00.000Z");
    expect(file?.rows[0]).toMatchObject({ position: 1, teamId: 10, points: 17 });
    expect(await readStandingsFile(dir, "BL1", 2026)).toBeNull();
  });
});

describe("standings competitions", () => {
  it("include the Champions League", async () => {
    const { STANDINGS_COMPETITIONS } = await import("./run");
    expect(STANDINGS_COMPETITIONS).toContain("CL");
    expect(STANDINGS_COMPETITIONS).toContain("PL");
  });
});
