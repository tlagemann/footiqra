import { describe, expect, it } from "vitest";
import { fdMatchSchema } from "@/ingestion/providers/football-data/schemas";
import {
  currentSeasonStartYear,
  emptyTeamRegistry,
  mergeMatches,
  toStoredMatch,
  upsertTeams,
} from "./merge";
import type { StoredMatch } from "./types";

// Synthetic fixtures with fictional teams. Not real data.
function stored(partial: Partial<StoredMatch> & Pick<StoredMatch, "id">): StoredMatch {
  return {
    utcDate: "2026-09-12T14:00:00.000Z",
    status: "TIMED",
    matchday: 3,
    stage: "REGULAR_SEASON",
    homeTeamId: 1,
    awayTeamId: 2,
    homeGoals: null,
    awayGoals: null,
    duration: "REGULAR",
    winner: null,
    lastUpdated: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

describe("toStoredMatch", () => {
  it("flattens the provider shape", () => {
    const match = fdMatchSchema.parse({
      id: 7,
      utcDate: "2026-09-12T14:00:00Z",
      status: "FINISHED",
      matchday: 3,
      stage: "REGULAR_SEASON",
      lastUpdated: "2026-09-12T16:05:00Z",
      homeTeam: { id: 1, name: "Example United" },
      awayTeam: { id: 2, name: "Sample City" },
      score: { winner: "HOME_TEAM", duration: "REGULAR", fullTime: { home: 2, away: 1 } },
    });
    expect(toStoredMatch(match)).toEqual({
      id: 7,
      utcDate: "2026-09-12T14:00:00.000Z",
      status: "FINISHED",
      matchday: 3,
      stage: "REGULAR_SEASON",
      homeTeamId: 1,
      awayTeamId: 2,
      homeGoals: 2,
      awayGoals: 1,
      duration: "REGULAR",
      winner: "HOME_TEAM",
      lastUpdated: "2026-09-12T16:05:00.000Z",
    });
  });
});

describe("mergeMatches", () => {
  it("adds new matches and keeps one record per id", () => {
    const { matches, stats } = mergeMatches(
      [stored({ id: 1 })],
      [stored({ id: 1 }), stored({ id: 2 })],
    );
    expect(matches.map((m) => m.id)).toEqual([1, 2]);
    expect(stats).toEqual({ added: 1, updated: 0, unchanged: 1 });
  });

  it("updates when the provider reports a newer version", () => {
    const old = stored({ id: 1 });
    const finished = stored({
      id: 1,
      status: "FINISHED",
      homeGoals: 1,
      awayGoals: 0,
      lastUpdated: "2026-09-12T16:00:00.000Z",
    });
    const { matches, stats } = mergeMatches([old], [finished]);
    expect(matches[0].status).toBe("FINISHED");
    expect(stats.updated).toBe(1);
  });

  it("never lets an older response overwrite newer data", () => {
    const newer = stored({ id: 1, status: "FINISHED", lastUpdated: "2026-09-12T16:00:00.000Z" });
    const stale = stored({ id: 1, status: "TIMED", lastUpdated: "2026-09-10T00:00:00.000Z" });
    const { matches, stats } = mergeMatches([newer], [stale]);
    expect(matches[0].status).toBe("FINISHED");
    expect(stats.unchanged).toBe(1);
  });

  it("sorts by kick-off, then id", () => {
    const { matches } = mergeMatches(
      [],
      [
        stored({ id: 3, utcDate: "2026-09-13T14:00:00.000Z" }),
        stored({ id: 2, utcDate: "2026-09-12T14:00:00.000Z" }),
        stored({ id: 1, utcDate: "2026-09-12T14:00:00.000Z" }),
      ],
    );
    expect(matches.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});

describe("upsertTeams", () => {
  it("assigns slugs once and keeps them when names change", () => {
    let registry = upsertTeams(emptyTeamRegistry(), [{ id: 5, name: "Example United" }]);
    expect(registry.teams["5"].slug).toBe("example-united");
    registry = upsertTeams(registry, [{ id: 5, name: "Example United FC", crest: "x.svg" }]);
    expect(registry.teams["5"]).toMatchObject({
      slug: "example-united",
      name: "Example United FC",
      crest: "x.svg",
    });
  });

  it("never reuses an existing slug", () => {
    let registry = upsertTeams(emptyTeamRegistry(), [{ id: 1, name: "Sample City" }]);
    registry = upsertTeams(registry, [{ id: 9, name: "Sample-City" }]);
    expect(registry.teams["9"].slug).toBe("sample-city-2");
  });

  it("is deterministic regardless of input order", () => {
    const refs = [
      { id: 2, name: "Twin FC" },
      { id: 1, name: "Twin F.C." },
    ];
    const a = upsertTeams(emptyTeamRegistry(), refs);
    const b = upsertTeams(emptyTeamRegistry(), [...refs].reverse());
    expect(a).toEqual(b);
    expect(a.teams["1"].slug).toBe("twin-f-c");
  });
});

describe("currentSeasonStartYear", () => {
  it("switches in July", () => {
    expect(currentSeasonStartYear(new Date("2026-10-28T00:00:00Z"))).toBe(2026);
    expect(currentSeasonStartYear(new Date("2027-03-01T00:00:00Z"))).toBe(2026);
    expect(currentSeasonStartYear(new Date("2027-07-01T00:00:00Z"))).toBe(2027);
  });
});
