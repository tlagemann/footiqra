import { describe, expect, it } from "vitest";
import { leagueFactor, scorerIndex } from "./scorer-index";

describe("scorerIndex", () => {
  const base = { goals: 8, penalties: 0, clubMatches: 10, leagueAdjustment: 0 };

  it("equals goals for an average league at the reference number of matches", () => {
    expect(scorerIndex(base, 10)).toBeCloseTo(8, 10);
  });

  it("counts penalty goals as three quarters", () => {
    expect(scorerIndex({ ...base, penalties: 4 }, 10)).toBeCloseTo(7, 10);
  });

  it("scales clubs with fewer matches up to the reference", () => {
    expect(scorerIndex({ ...base, goals: 7, clubMatches: 7 }, 10)).toBeCloseTo(10, 10);
  });

  it("keeps the league factor small", () => {
    expect(leagueFactor(90)).toBeGreaterThan(1.1);
    expect(leagueFactor(90)).toBeLessThan(1.16);
    expect(leagueFactor(-75)).toBeGreaterThan(0.88);
  });

  it("skips clubs with too few matches", () => {
    expect(scorerIndex({ ...base, clubMatches: 2 }, 10)).toBeNull();
  });
});
