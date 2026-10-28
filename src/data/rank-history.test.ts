import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import { computePowerRanking } from "./power-ranking";
import { rankHistories, weeklyCheckpoints } from "./rank-history";
import type { Snapshot } from "./repository";

describe("weeklyCheckpoints", () => {
  it("ends every week on Monday night and stops before the data timestamp", () => {
    // 2026-09-02 is a Wednesday.
    const points = weeklyCheckpoints("2026-09-02T18:00:00Z", "2026-09-22T10:00:00Z");
    expect(points.map((t) => new Date(t).toISOString())).toEqual([
      "2026-09-07T23:59:59.000Z",
      "2026-09-14T23:59:59.000Z",
      "2026-09-21T23:59:59.000Z",
    ]);
  });
});

// Fictional teams, not real data.
const match = (
  id: number,
  day: string,
  home: number,
  away: number,
  hg: number,
  ag: number,
): StoredMatch => ({
  id,
  utcDate: `2026-09-${day}T14:00:00.000Z`,
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

describe("rankHistories", () => {
  it("tracks weekly positions and ends with today's published rank", () => {
    const snapshot: Snapshot = {
      meta: {
        schemaVersion: 1,
        provider: "football-data",
        lastSuccessfulRunUtc: "2026-09-16T00:00:00.000Z",
        competitions: {},
      },
      teams: { schemaVersion: 1, teams: { "1": team(1, "a"), "2": team(2, "b") } },
      matchFiles: [
        {
          schemaVersion: 1,
          competition: "PL",
          season: 2026,
          // Week 1: a wins. Week 2: b wins big.
          matches: [match(1, "05", 1, 2, 1, 0), match(2, "12", 2, 1, 4, 0)],
        },
      ],
    };
    const ranking = computePowerRanking(snapshot);
    const a = rankHistories(ranking, snapshot.meta.lastSuccessfulRunUtc!).get(1)!;
    expect(a.map((p) => p.kind)).toEqual(["week", "week", "today"]);
    expect(a.map((p) => p.rank)).toEqual([1, 2, 2]);
    expect(a[1]!.change).toBe(-1);
    expect(a.at(-1)!.rank).toBe(ranking.rows.find((r) => r.team.id === 1)!.rank);
  });
});
