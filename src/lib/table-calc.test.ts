import { describe, expect, it } from "vitest";
import { applyResults, type CalcFixture, type CalcTeam } from "./table-calc";

// Fictional clubs, not real data.
const team = (id: number, position: number, points: number, gf: number, ga: number): CalcTeam => ({
  id,
  slug: `club-${id}`,
  name: `Club ${id}`,
  crest: null,
  position,
  played: 5,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: gf,
  goalsAgainst: ga,
  points,
});
const fixture = (id: number, homeId: number, awayId: number): CalcFixture => ({
  id,
  matchday: 6,
  utcDate: "2026-11-01T14:00:00Z",
  status: "TIMED",
  homeId,
  awayId,
  slug: null,
});

const teams = [team(1, 1, 12, 10, 4), team(2, 2, 10, 8, 5), team(3, 3, 9, 7, 7)];
const fixtures = [fixture(100, 2, 1), fixture(101, 3, 2)];

describe("applyResults", () => {
  it("keeps the official order when nothing is entered", () => {
    const rows = applyResults(teams, fixtures, new Map());
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.change === 0)).toBe(true);
  });

  it("adds points, goals and matches and re-sorts", () => {
    const rows = applyResults(
      teams,
      fixtures,
      new Map([
        [100, { home: 3, away: 0 }],
        [101, { home: 1, away: 1 }],
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual([2, 1, 3]);
    const two = rows[0]!;
    expect(two).toMatchObject({
      points: 14,
      played: 7,
      won: 1,
      drawn: 1,
      goalsFor: 12,
      goalsAgainst: 6,
    });
    expect(two.change).toBe(1);
    expect(rows[1]!.change).toBe(-1);
  });

  it("splits ties on points by goal difference, then goals scored", () => {
    const tied = [team(1, 1, 10, 9, 5), team(2, 2, 10, 12, 8), team(3, 3, 7, 4, 4)];
    const rows = applyResults(tied, [fixture(100, 3, 1)], new Map([[100, { home: 0, away: 0 }]]));
    // Club 1: 11 pts, Club 2: 10, Club 3: 8
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    const even = applyResults(
      [team(1, 1, 10, 9, 5), team(2, 2, 10, 12, 8)],
      [fixture(100, 1, 2)],
      new Map([[100, { home: 1, away: 1 }]]),
    );
    // Both +4 goal difference after 1:1, club 2 scored more.
    expect(even.map((r) => r.id)).toEqual([2, 1]);
  });
});
