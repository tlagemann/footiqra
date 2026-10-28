import { describe, expect, it } from "vitest";
import { leagueStartingOffsets } from "@/config/league-strength";
import { computeLeagueElo } from "./league-elo";
import type { RankableMatch } from "./types";

// Synthetic fixtures: fictional teams "a1", "a2" in league A and "b1", "b2" in league B.
const teamLeague = new Map([
  ["a1", "A"],
  ["a2", "A"],
  ["b1", "B"],
  ["b2", "B"],
]);
const offsets = { A: 20, B: -20 };

function match(partial: Partial<RankableMatch> & Pick<RankableMatch, "id">): RankableMatch {
  return {
    kickoffUtc: "2026-09-01T15:00:00Z",
    homeTeamId: "a1",
    awayTeamId: "a2",
    homeGoals: 1,
    awayGoals: 0,
    ...partial,
  };
}

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe("computeLeagueElo", () => {
  it("starts every team at base rating plus its league offset", () => {
    const { ratings, leagueAdjustments } = computeLeagueElo([], teamLeague, offsets);
    expect(Object.fromEntries(ratings)).toEqual({ a1: 1520, a2: 1520, b1: 1480, b2: 1480 });
    expect(Object.fromEntries(leagueAdjustments)).toEqual({ A: 20, B: -20 });
  });

  it("does not change league strength through domestic matches", () => {
    const result = computeLeagueElo(
      [match({ id: "1", homeGoals: 5, awayGoals: 0 })],
      teamLeague,
      offsets,
    );
    expect(Object.fromEntries(result.leagueAdjustments)).toEqual({ A: 20, B: -20 });
    expect(result.crossLeagueMatches).toBe(0);
  });

  it("moves both leagues (zero-sum) after a cross-league upset", () => {
    const result = computeLeagueElo(
      [match({ id: "1", homeTeamId: "b1", awayTeamId: "a1", homeGoals: 3, awayGoals: 0 })],
      teamLeague,
      offsets,
    );
    const adj = Object.fromEntries(result.leagueAdjustments);
    expect(adj.B).toBeGreaterThan(-20);
    expect(adj.A).toBeLessThan(20);
    expect(adj.A + adj.B).toBeCloseTo(0, 9);
    // The whole league benefits, not only the team that played.
    expect(result.ratings.get("b2")!).toBeGreaterThan(1480);
    expect(result.ratings.get("a2")!).toBeLessThan(1520);
    expect(result.crossLeagueMatches).toBe(1);
  });

  it("keeps total rating constant (zero-sum overall)", () => {
    const before = sum(computeLeagueElo([], teamLeague, offsets).ratings);
    const after = sum(
      computeLeagueElo(
        [
          match({ id: "1" }),
          match({ id: "2", homeTeamId: "b1", awayTeamId: "a2", homeGoals: 2, awayGoals: 2 }),
          match({ id: "3", homeTeamId: "a1", awayTeamId: "b2", homeGoals: 0, awayGoals: 1 }),
        ],
        teamLeague,
        offsets,
      ).ratings,
    );
    expect(after).toBeCloseTo(before, 9);
  });

  it("is independent of input order", () => {
    const matches = [
      match({ id: "1", kickoffUtc: "2026-09-01T15:00:00Z" }),
      match({ id: "2", kickoffUtc: "2026-09-08T15:00:00Z", homeTeamId: "b1", awayTeamId: "a1" }),
    ];
    const a = computeLeagueElo(matches, teamLeague, offsets);
    const b = computeLeagueElo([...matches].reverse(), teamLeague, offsets);
    expect([...a.ratings]).toEqual([...b.ratings]);
  });

  it("rejects teams without a league", () => {
    expect(() =>
      computeLeagueElo([match({ id: "1", awayTeamId: "x" })], teamLeague, offsets),
    ).toThrow(/No league known/);
  });
});

describe("leagueStartingOffsets", () => {
  it("centres offsets on zero and keeps the coefficient order", () => {
    const o = leagueStartingOffsets(
      {
        "premier-league": 120,
        "serie-a": 100,
        "la-liga": 100,
        bundesliga: 90,
        "ligue-1": 90,
        "primeira-liga": 100,
        eredivisie: 100,
      },
      2,
    );
    expect(o["premier-league"]).toBe(40); // mean is 100
    expect(o["ligue-1"]).toBe(-20);
    expect(Object.values(o).reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
  });
});

describe("rating timeline", () => {
  it("starts each team at its starting value and ends at its current rating", () => {
    const result = computeLeagueElo(
      [
        match({ id: "1" }),
        match({
          id: "2",
          kickoffUtc: "2026-09-08T15:00:00Z",
          homeTeamId: "a2",
          awayTeamId: "a1",
          homeGoals: 2,
          awayGoals: 2,
        }),
      ],
      teamLeague,
      offsets,
    );
    const a1 = result.timeline.filter((t) => t.teamId === "a1");
    expect(a1.map((t) => t.matchId)).toEqual([null, "1", "2"]);
    expect(a1[0]!.rating).toBe(1520); // base 1500 + league offset 20
    expect(a1[1]!.rating).toBeGreaterThan(1520); // won match 1
    expect(a1.at(-1)!.rating).toBeCloseTo(result.ratings.get("a1")!, 10);
    expect(result.timeline.some((t) => t.teamId === "b1")).toBe(false); // no match played
  });
});
