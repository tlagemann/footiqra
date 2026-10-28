import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import { computePowerRanking } from "./power-ranking";
import type { Snapshot } from "./repository";

// Fictional teams and results. Not real data.
function match(
  p: Partial<StoredMatch> & Pick<StoredMatch, "id" | "homeTeamId" | "awayTeamId">,
): StoredMatch {
  return {
    utcDate: "2026-09-01T14:00:00.000Z",
    status: "FINISHED",
    matchday: 1,
    stage: "REGULAR_SEASON",
    homeGoals: 2,
    awayGoals: 0,
    duration: "REGULAR",
    winner: "HOME_TEAM",
    lastUpdated: "2026-09-01T16:00:00.000Z",
    ...p,
  };
}
const team = (id: number, slug: string) => ({
  id,
  name: slug,
  shortName: null,
  tla: null,
  crest: null,
  slug,
});

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-10-01T00:00:00.000Z",
    competitions: {},
  },
  teams: {
    schemaVersion: 1,
    teams: {
      "1": team(1, "pl-one"),
      "2": team(2, "pl-two"),
      "3": team(3, "l1-one"),
      "4": team(4, "l1-two"),
      "9": team(9, "foreign-club"),
    },
  },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [match({ id: 1, homeTeamId: 1, awayTeamId: 2 })],
    },
    {
      schemaVersion: 1,
      competition: "FL1",
      season: 2026,
      matches: [
        match({ id: 2, homeTeamId: 3, awayTeamId: 4 }),
        match({
          id: 3,
          homeTeamId: 4,
          awayTeamId: 3,
          status: "TIMED",
          homeGoals: null,
          awayGoals: null,
        }),
      ],
    },
    {
      schemaVersion: 1,
      competition: "CL",
      season: 2026,
      matches: [
        match({ id: 10, homeTeamId: 3, awayTeamId: 1, utcDate: "2026-09-20T19:00:00.000Z" }),
        match({ id: 11, homeTeamId: 1, awayTeamId: 9, utcDate: "2026-09-27T19:00:00.000Z" }),
        match({
          id: 12,
          homeTeamId: 2,
          awayTeamId: 4,
          duration: "PENALTY_SHOOTOUT",
          utcDate: "2026-09-28T19:00:00.000Z",
        }),
      ],
    },
  ],
};

describe("computePowerRanking", () => {
  const ranking = computePowerRanking(snapshot);

  it("ranks all league teams and excludes foreign clubs", () => {
    expect(ranking.rows.map((r) => r.team.slug).sort()).toEqual([
      "l1-one",
      "l1-two",
      "pl-one",
      "pl-two",
    ]);
    expect(ranking.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("uses finished regular-time matches between top-five teams only", () => {
    // 2 domestic + 1 cross-league (id 10). Id 3 unfinished, 11 foreign, 12 penalties.
    expect(ranking.matchesUsed).toBe(3);
    expect(ranking.crossLeagueMatches).toBe(1);
  });

  it("moves league strength after a European upset", () => {
    const pl = ranking.leagues.find((l) => l.leagueSlug === "premier-league")!;
    const l1 = ranking.leagues.find((l) => l.leagueSlug === "ligue-1")!;
    expect(pl.currentAdjustment).toBeLessThan(pl.startingOffset);
    expect(l1.currentAdjustment).toBeGreaterThan(l1.startingOffset);
  });

  it("reports the model id", () => {
    expect(ranking.model).toBe("elo-v1");
  });
});
