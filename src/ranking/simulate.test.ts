import { describe, expect, it } from "vitest";
import {
  createRandom,
  marginShares,
  simulateSeason,
  simulateSeasonWithStakes,
  type SimOptions,
} from "./simulate";

const options: SimOptions = {
  runs: 2000,
  seed: 1,
  homeAdvantage: 65,
  kFactor: 20,
  marginDistribution: [0.5, 0.3, 0.15, 0.05],
};

// Fictional four-team league, double round robin still to play.
const teams = [
  { id: 1, points: 0, goalDifference: 0, rating: 1700 },
  { id: 2, points: 0, goalDifference: 0, rating: 1550 },
  { id: 3, points: 0, goalDifference: 0, rating: 1500 },
  { id: 4, points: 0, goalDifference: 0, rating: 1350 },
];
const fixtures = teams.flatMap((h) =>
  teams.filter((a) => a.id !== h.id).map((a) => ({ homeId: h.id, awayId: a.id })),
);

describe("simulateSeason", () => {
  it("returns a full probability distribution per team", () => {
    const result = simulateSeason(teams, fixtures, options);
    for (const r of result) {
      expect(r.positionProbabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
    for (let pos = 0; pos < 4; pos++) {
      expect(result.reduce((s, r) => s + r.positionProbabilities[pos]!, 0)).toBeCloseTo(1, 10);
    }
  });

  it("favours stronger teams and is deterministic for a seed", () => {
    const a = simulateSeason(teams, fixtures, options);
    const b = simulateSeason(teams, fixtures, options);
    expect(a).toEqual(b);
    expect(a[0]!.positionProbabilities[0]).toBeGreaterThan(0.5);
    expect(a[3]!.positionProbabilities[3]).toBeGreaterThan(0.5);
    expect(a[0]!.expectedPoints).toBeGreaterThan(a[3]!.expectedPoints);
  });

  it("keeps a decided table decided when nothing is left to play", () => {
    const done = teams.map((t, i) => ({ ...t, points: 30 - i * 5 }));
    const result = simulateSeason(done, [], options);
    expect(result.map((r) => r.positionProbabilities.indexOf(1))).toEqual([0, 1, 2, 3]);
    expect(result[0]!.expectedPoints).toBe(30);
  });
});

describe("helpers", () => {
  it("random numbers are seeded and in [0, 1)", () => {
    const r1 = createRandom(42);
    const r2 = createRandom(42);
    for (let i = 0; i < 100; i++) {
      const x = r1();
      expect(x).toBe(r2());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("margin shares group 4+ goals", () => {
    expect(marginShares([1, 1, 2, 5, 0])).toEqual([0.5, 0.25, 0, 0.25]);
    expect(marginShares([])).toHaveLength(4);
  });
});

describe("simulateSeasonWithStakes", () => {
  it("leaves the season numbers unchanged and splits runs by result", () => {
    const plain = simulateSeason(teams, fixtures, options);
    // Fixture 1 vs 2 (index 0) and 2 vs 3 (index 4).
    const { teams: tracked, stakes } = simulateSeasonWithStakes(teams, fixtures, options, [0, 4]);
    expect(tracked).toEqual(plain);
    expect(stakes.map((s) => s.fixture)).toEqual([0, 4]);
    for (const st of stakes) {
      expect(st.runs.reduce((a, b) => a + b, 0)).toBe(options.runs);
      st.counts.forEach((bySide, o) =>
        bySide.forEach((pos) => expect(pos.reduce((a, b) => a + b, 0)).toBe(st.runs[o])),
      );
    }
    // Team 1 wins the title more often after beating team 2 than after losing.
    const [first] = stakes;
    const title = (o: number) => first!.counts[o]![0]![0]! / first!.runs[o]!;
    expect(title(0)).toBeGreaterThan(title(2));
  });
});
