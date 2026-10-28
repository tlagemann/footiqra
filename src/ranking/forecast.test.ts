import { describe, expect, it } from "vitest";
import { evaluateForecasts, matchProbabilities, toPercentages } from "./forecast";

describe("matchProbabilities", () => {
  it("is symmetric and sums to one", () => {
    const even = matchProbabilities(0);
    expect(even.home).toBeCloseTo(0.375, 6);
    expect(even.draw).toBeCloseTo(0.25, 6);
    expect(even.away).toBeCloseTo(0.375, 6);
    const p = matchProbabilities(120);
    const q = matchProbabilities(-120);
    expect(p.home).toBeCloseTo(q.away, 10);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
  });

  it("favours the stronger side more as the gap grows, with fewer draws", () => {
    const small = matchProbabilities(50);
    const big = matchProbabilities(300);
    expect(big.home).toBeGreaterThan(small.home);
    expect(big.draw).toBeLessThan(small.draw);
    expect(matchProbabilities(5000).away).toBeGreaterThan(0.01);
  });

  it("rejects invalid input", () => {
    expect(() => matchProbabilities(Number.NaN)).toThrow();
  });
});

describe("toPercentages", () => {
  it("always adds up to 100", () => {
    for (const d of [-400, -133, -7, 0, 1, 65, 222, 999]) {
      const pct = toPercentages(matchProbabilities(d));
      expect(pct.home + pct.draw + pct.away).toBe(100);
    }
    expect(toPercentages({ home: 1 / 3, draw: 1 / 3, away: 1 / 3 })).toEqual({
      home: 34,
      draw: 33,
      away: 33,
    });
  });
});

describe("evaluateForecasts", () => {
  it("counts hits and compares with the frequency baseline", () => {
    const record = evaluateForecasts([
      { ratingDiff: 200, homeGoals: 2, awayGoals: 0 },
      { ratingDiff: 200, homeGoals: 1, awayGoals: 0 },
      { ratingDiff: -200, homeGoals: 0, awayGoals: 1 },
      { ratingDiff: 150, homeGoals: 0, awayGoals: 2 },
    ])!;
    expect(record.matches).toBe(4);
    expect(record.hitRate).toBe(0.75);
    expect(record.logLoss).toBeGreaterThan(0);
    expect(evaluateForecasts([])).toBeNull();
  });
});
