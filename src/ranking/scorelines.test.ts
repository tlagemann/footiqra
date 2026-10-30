import { describe, expect, it } from "vitest";
import { expectedScore } from "./elo";
import { matchProbabilities } from "./forecast";
import { DEFAULT_GOAL_RATES, fitGoalRates, goalRates, scorelineForecast } from "./scorelines";

const base = { home: 1.6, away: 1.3 };

describe("scorelineForecast", () => {
  it("adds up to the published win / draw / loss forecast", () => {
    for (const diff of [-300, -80, 0, 65, 250, 500]) {
      const p = matchProbabilities(diff);
      const s = scorelineForecast(p, expectedScore(diff, 0), base);
      let home = 0;
      let draw = 0;
      let away = 0;
      let total = 0;
      s.grid.forEach((row, h) =>
        row.forEach((x, a) => {
          total += x;
          if (h > a) home += x;
          else if (h === a) draw += x;
          else away += x;
        }),
      );
      expect(total).toBeCloseTo(1, 9);
      expect(home).toBeCloseTo(p.home, 6);
      expect(draw).toBeCloseTo(p.draw, 6);
      expect(away).toBeCloseTo(p.away, 6);
    }
  });

  it("keeps the expected goals realistic for big mismatches", () => {
    for (const [diff, max] of [
      [0, 3.2],
      [300, 4.5],
      [600, 7],
    ] as const) {
      const s = scorelineForecast(matchProbabilities(diff), expectedScore(diff, 0), base);
      const total = s.expectedGoals.home + s.expectedGoals.away;
      expect(total).toBeGreaterThan(2.5);
      expect(total).toBeLessThan(max);
      if (diff > 0) expect(s.expectedGoals.home).toBeGreaterThan(s.expectedGoals.away * 2);
    }
  });

  it("orders the top scorelines and derives consistent markets", () => {
    const diff = 120;
    const s = scorelineForecast(matchProbabilities(diff), expectedScore(diff, 0), base);
    expect(s.top).toHaveLength(5);
    for (let i = 1; i < s.top.length; i++) {
      expect(s.top[i - 1]!.probability).toBeGreaterThanOrEqual(s.top[i]!.probability);
    }
    expect(s.over25).toBeGreaterThan(0);
    expect(s.over25).toBeLessThan(1);
    expect(s.homeCleanSheet).toBeCloseTo(
      s.grid.reduce((a, row) => a + row[0]!, 0),
      9,
    );
    expect(s.bothScore + s.homeCleanSheet + s.awayCleanSheet - s.grid[0]![0]!).toBeCloseTo(1, 9);
  });
});

describe("fitGoalRates", () => {
  it("gives the stronger home side more goals", () => {
    const even = fitGoalRates(0.5, base);
    const strong = fitGoalRates(0.75, base);
    expect(strong.home).toBeGreaterThan(even.home);
    expect(strong.away).toBeLessThan(even.away);
  });
});

describe("goalRates", () => {
  it("falls back below the minimum number of matches", () => {
    expect(goalRates([{ status: "FINISHED", homeGoals: 9, awayGoals: 9 }])).toEqual(
      DEFAULT_GOAL_RATES,
    );
  });

  it("averages finished matches only", () => {
    const ms = [
      { status: "FINISHED", homeGoals: 2, awayGoals: 1 },
      { status: "FINISHED", homeGoals: 0, awayGoals: 1 },
      { status: "TIMED", homeGoals: null, awayGoals: null },
    ];
    expect(goalRates(ms, 2)).toEqual({ home: 1, away: 1 });
  });
});
