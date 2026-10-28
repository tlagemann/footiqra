import { describe, expect, it } from "vitest";
import {
  computeEloRatings,
  DEFAULT_ELO_OPTIONS,
  expectedScore,
  goalDifferenceMultiplier,
  normaliseMatches,
} from "./elo";
import { toRanking } from "./ranking";
import type { RankableMatch } from "./types";

// Synthetic test fixtures with fictional team ids. Not real results.
function match(partial: Partial<RankableMatch> & Pick<RankableMatch, "id">): RankableMatch {
  return {
    kickoffUtc: "2026-01-01T15:00:00Z",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    homeGoals: 1,
    awayGoals: 0,
    ...partial,
  };
}

const sum = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0);

describe("expectedScore", () => {
  it("is 0.5 for equal ratings and symmetric", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1600, 1500) + expectedScore(1500, 1600)).toBeCloseTo(1, 12);
  });

  it("gives about 0.64 for a 100-point edge", () => {
    expect(expectedScore(1600, 1500)).toBeCloseTo(0.64, 2);
  });
});

describe("goalDifferenceMultiplier", () => {
  it("follows the 1 / 1.5 / (11+n)/8 scheme", () => {
    expect(goalDifferenceMultiplier(0)).toBe(1);
    expect(goalDifferenceMultiplier(-1)).toBe(1);
    expect(goalDifferenceMultiplier(2)).toBe(1.5);
    expect(goalDifferenceMultiplier(3)).toBe(1.75);
    expect(goalDifferenceMultiplier(-4)).toBe(1.875);
  });
});

describe("computeEloRatings", () => {
  it("is zero-sum", () => {
    const { ratings } = computeEloRatings([
      match({ id: "1", homeGoals: 3, awayGoals: 0 }),
      match({ id: "2", homeTeamId: "team-c", awayTeamId: "team-a", homeGoals: 2, awayGoals: 2 }),
      match({ id: "3", homeTeamId: "team-b", awayTeamId: "team-c", homeGoals: 0, awayGoals: 1 }),
    ]);
    expect(sum(ratings.values())).toBeCloseTo(3 * DEFAULT_ELO_OPTIONS.initialRating, 9);
  });

  it("rewards an away win more than a home win between equal teams", () => {
    const home = computeEloRatings([match({ id: "1", homeGoals: 1, awayGoals: 0 })]);
    const away = computeEloRatings([match({ id: "1", homeGoals: 0, awayGoals: 1 })]);
    const homeGain = home.ratings.get("team-a")! - 1500;
    const awayGain = away.ratings.get("team-b")! - 1500;
    expect(awayGain).toBeGreaterThan(homeGain);
    expect(homeGain).toBeGreaterThan(0);
  });

  it("costs the home side points when drawing against an equal team", () => {
    const { ratings } = computeEloRatings([match({ id: "1", homeGoals: 1, awayGoals: 1 })]);
    expect(ratings.get("team-a")!).toBeLessThan(1500);
    expect(ratings.get("team-b")!).toBeGreaterThan(1500);
  });

  it("ignores home advantage at neutral venues", () => {
    const { ratings } = computeEloRatings([
      match({ id: "1", homeGoals: 1, awayGoals: 1, neutralVenue: true }),
    ]);
    expect(ratings.get("team-a")).toBe(1500);
    expect(ratings.get("team-b")).toBe(1500);
  });

  it("moves ratings more for bigger wins", () => {
    const narrow = computeEloRatings([match({ id: "1", homeGoals: 1, awayGoals: 0 })]);
    const big = computeEloRatings([match({ id: "1", homeGoals: 4, awayGoals: 0 })]);
    expect(big.ratings.get("team-a")!).toBeGreaterThan(narrow.ratings.get("team-a")!);
  });

  it("does not depend on input order", () => {
    const matches = [
      match({ id: "1", kickoffUtc: "2026-01-01T15:00:00Z", homeGoals: 2, awayGoals: 0 }),
      match({
        id: "2",
        kickoffUtc: "2026-01-08T15:00:00Z",
        homeTeamId: "team-b",
        awayTeamId: "team-a",
        homeGoals: 3,
        awayGoals: 1,
      }),
    ];
    const forward = computeEloRatings(matches);
    const reversed = computeEloRatings([...matches].reverse());
    expect([...reversed.ratings]).toEqual([...forward.ratings]);
  });

  it("counts an exact duplicate only once", () => {
    const once = computeEloRatings([match({ id: "1" })]);
    const twice = computeEloRatings([match({ id: "1" }), match({ id: "1" })]);
    expect([...twice.ratings]).toEqual([...once.ratings]);
    expect(twice.matchesPlayed.get("team-a")).toBe(1);
  });

  it("rejects conflicting duplicates and invalid data", () => {
    expect(() => normaliseMatches([match({ id: "1" }), match({ id: "1", homeGoals: 5 })])).toThrow(
      /Conflicting duplicate/,
    );
    expect(() => normaliseMatches([match({ id: "x", homeGoals: -1 })])).toThrow(/non-negative/);
    expect(() => normaliseMatches([match({ id: "x", awayTeamId: "team-a" })])).toThrow(/itself/);
    expect(() => normaliseMatches([match({ id: "x", kickoffUtc: "not a date" })])).toThrow(
      /kickoffUtc/,
    );
  });

  it("continues from starting ratings", () => {
    const { ratings } = computeEloRatings([], {}, new Map([["team-a", 1620]]));
    expect(ratings.get("team-a")).toBe(1620);
  });

  it("records one change per team per match", () => {
    const { changes } = computeEloRatings([match({ id: "1" }), match({ id: "2" })]);
    expect(changes).toHaveLength(4);
    expect(changes[0]).toMatchObject({ matchId: "1", teamId: "team-a", before: 1500 });
  });
});

describe("toRanking", () => {
  it("orders by rating and shares ranks on ties", () => {
    const ranking = toRanking(
      new Map([
        ["team-c", 1490],
        ["team-a", 1510.04],
        ["team-b", 1510.01],
      ]),
      new Map([["team-a", 3]]),
    );
    expect(ranking).toEqual([
      { rank: 1, teamId: "team-a", rating: 1510, matchesPlayed: 3 },
      { rank: 1, teamId: "team-b", rating: 1510, matchesPlayed: 0 },
      { rank: 3, teamId: "team-c", rating: 1490, matchesPlayed: 0 },
    ]);
  });
});
