import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import { computePowerRanking } from "./power-ranking";
import { ratingHistory } from "./rating-history";
import type { Snapshot } from "./repository";

// Fictional teams, not real data.
const match = (id: number, home: number, away: number, hg: number, ag: number): StoredMatch => ({
  id,
  utcDate: `2026-09-${String(id).padStart(2, "0")}T14:00:00.000Z`,
  status: "FINISHED",
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

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-09-30T00:00:00.000Z",
    competitions: {},
  },
  teams: { schemaVersion: 1, teams: { "1": team(1, "a"), "2": team(2, "b"), "3": team(3, "c") } },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [match(1, 1, 2, 2, 0), match(2, 3, 1, 1, 1)],
    },
  ],
};

describe("ratingHistory", () => {
  it("lists the season start and every match with opponent, score and change", () => {
    const ranking = computePowerRanking(snapshot);
    const h = ratingHistory(snapshot, ranking, 1, snapshot.meta.lastSuccessfulRunUtc!);
    expect(h.map((p) => p.kind)).toEqual(["start", "match", "match"]);
    expect(h[1]!.match).toMatchObject({ opponent: "b", home: true, goalsFor: 2, goalsAgainst: 0 });
    expect(h[1]!.change).toBeGreaterThan(0);
    expect(h[2]!.match).toMatchObject({ opponent: "c", home: false });
    expect(h.at(-1)!.rating).toBeCloseTo(ranking.rows.find((r) => r.team.id === 1)!.rating, 1);
  });

  it("is empty for a team without rated matches", () => {
    expect(ratingHistory(snapshot, computePowerRanking(snapshot), 99)).toEqual([]);
  });
});
