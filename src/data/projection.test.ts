import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import { computePowerRanking } from "./power-ranking";
import { leagueProjection } from "./projection";
import type { Snapshot } from "./repository";

// Fictional three-team league, not real data.
const match = (
  id: number,
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
): StoredMatch => ({
  id,
  utcDate: `2026-09-${String(id).padStart(2, "0")}T14:00:00.000Z`,
  status: hg === null ? "TIMED" : "FINISHED",
  matchday: id,
  stage: "REGULAR_SEASON",
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  duration: "REGULAR",
  winner: null,
  lastUpdated: "2026-09-30T00:00:00.000Z",
});
const team = (id: number, slug: string) => ({
  id,
  name: slug,
  shortName: null,
  tla: null,
  crest: null,
  slug,
});
const row = (position: number, teamId: number, points: number) => ({
  position,
  teamId,
  playedGames: 2,
  won: 0,
  draw: 0,
  lost: 0,
  points,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
});

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-09-10T00:00:00.000Z",
    competitions: {},
  },
  teams: { schemaVersion: 1, teams: { "1": team(1, "a"), "2": team(2, "b"), "3": team(3, "c") } },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [
        match(1, 1, 2, 3, 0),
        match(2, 2, 3, 2, 0),
        match(3, 3, 1, 0, 2),
        match(20, 2, 1, null, null),
        match(21, 3, 2, null, null),
        match(22, 1, 3, null, null),
      ],
    },
  ],
  standings: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      fetchedUtc: "2026-09-10T00:00:00.000Z",
      rows: [row(1, 1, 6), row(2, 2, 3), row(3, 3, 0)],
    },
  ],
};

describe("leagueProjection", () => {
  it("simulates the remaining fixtures from the official table", () => {
    const p = leagueProjection(snapshot, computePowerRanking(snapshot), "premier-league", 500)!;
    expect(p.remainingMatches).toBe(3);
    expect(p.rows[0]!.team.slug).toBe("a");
    expect(p.rows[0]!.expectedPoints).toBeGreaterThan(6);
    expect(p.rows[0]!.title).toBeGreaterThan(0.5);
    for (const r of p.rows) {
      expect(r.positionProbabilities.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 10);
    }
  });

  it("needs a stored table", () => {
    const noTable = { ...snapshot, standings: [] };
    expect(
      leagueProjection(noTable, computePowerRanking(noTable), "premier-league", 100),
    ).toBeUndefined();
  });
});
