import { expectedScore, goalDifferenceMultiplier } from "./elo";
import { matchProbabilities } from "./forecast";

/**
 * Season simulation "sim-v1": plays the remaining fixtures of a league many
 * times with the forecast model and counts where every club finishes.
 *
 * - Each run starts from the official table (points and goal difference).
 * - Every fixture is drawn from the forecast probabilities. Winning margins
 *   follow the margins observed in the league this season.
 * - Ratings move after every simulated match with the normal Elo update
 *   ("hot" simulation), so a run where a club starts winning also makes it
 *   stronger in that run. This keeps the uncertainty about team strength in
 *   the results instead of treating today's ratings as exact.
 * - Ties on points are split by goal difference, then at random. League
 *   specific tie-breakers (head-to-head and so on) are not modelled.
 *
 * Deterministic for a given seed, so every build shows the same numbers.
 */
export interface SimTeam {
  id: number;
  points: number;
  goalDifference: number;
  /** Effective rating today. */
  rating: number;
}

export interface SimFixture {
  homeId: number;
  awayId: number;
}

export interface SimOptions {
  runs: number;
  seed: number;
  homeAdvantage: number;
  kFactor: number;
  /** Share of decisive matches won by 1, 2, 3, ... goals (sums to 1). */
  marginDistribution: readonly number[];
}

export interface SimTeamResult {
  id: number;
  expectedPoints: number;
  /** positionProbabilities[i] = chance of finishing (i + 1)th. */
  positionProbabilities: number[];
}

export const SIM_V1 = { id: "sim-v1", runs: 10000, seed: 20262027 } as const;

/** Small, fast, seedable PRNG (mulberry32). */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Winning margins of decided matches, as shares of 1, 2, 3 and 4+ goals. */
export function marginShares(margins: readonly number[]): number[] {
  const counts = [0, 0, 0, 0];
  for (const m of margins) {
    if (m <= 0) continue;
    counts[Math.min(m, 4) - 1]! += 1;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  // Without data, fall back to typical top-flight shares.
  return total === 0 ? [0.5, 0.28, 0.14, 0.08] : counts.map((c) => c / total);
}

/**
 * Final positions of both clubs of one fixture, split by the result of that
 * fixture in each run: counts[outcome][side][position], outcome 0 = home win,
 * 1 = draw, 2 = away win; side 0 = home, 1 = away.
 */
export interface FixtureStakes {
  /** Index of the fixture in the input list. */
  fixture: number;
  runs: [number, number, number];
  counts: number[][][];
}

export function simulateSeason(
  teams: readonly SimTeam[],
  fixtures: readonly SimFixture[],
  options: SimOptions,
): SimTeamResult[] {
  return simulateSeasonWithStakes(teams, fixtures, options, []).teams;
}

/**
 * Same simulation, additionally recording for the `tracked` fixtures how the
 * final positions of both clubs depend on that fixture's result. Uses the
 * same runs, so tracking changes none of the other numbers.
 */
export function simulateSeasonWithStakes(
  teams: readonly SimTeam[],
  fixtures: readonly SimFixture[],
  options: SimOptions,
  tracked: readonly number[],
): { teams: SimTeamResult[]; stakes: FixtureStakes[] } {
  const n = teams.length;
  const index = new Map(teams.map((t, i) => [t.id, i]));
  const fx = fixtures
    .map((f, k) => [index.get(f.homeId), index.get(f.awayId), k] as const)
    .filter(
      (f): f is readonly [number, number, number] => f[0] !== undefined && f[1] !== undefined,
    );
  const trackedSet = new Set(tracked);
  const stakes: FixtureStakes[] = [];
  /** Position in `stakes` per entry of `fx`, -1 if not tracked. */
  const stakeOf = fx.map(([h, a, k]) => {
    if (!trackedSet.has(k) || h === a) return -1;
    stakes.push({
      fixture: k,
      runs: [0, 0, 0],
      counts: [0, 1, 2].map(() => [0, 1].map(() => new Array<number>(n).fill(0))),
    });
    return stakes.length - 1;
  });
  /** Result of every tracked fixture in the current run. */
  const runOutcome = new Array<number>(stakes.length).fill(0);
  const random = createRandom(options.seed);
  const cumulative: number[] = [];
  options.marginDistribution.reduce((acc, p, i) => (cumulative[i] = acc + p), 0);

  const positionCounts = teams.map(() => new Array<number>(n).fill(0));
  const pointsSum = new Array<number>(n).fill(0);
  const points = new Array<number>(n);
  const gd = new Array<number>(n);
  const rating = new Array<number>(n);
  const tiebreak = new Array<number>(n);
  const order = teams.map((_, i) => i);
  const finalPos = new Array<number>(n).fill(0);

  for (let run = 0; run < options.runs; run++) {
    for (let i = 0; i < n; i++) {
      points[i] = teams[i]!.points;
      gd[i] = teams[i]!.goalDifference;
      rating[i] = teams[i]!.rating;
    }
    for (let f = 0; f < fx.length; f++) {
      const [h, a] = fx[f]!;
      const diff = rating[h]! + options.homeAdvantage - rating[a]!;
      const p = matchProbabilities(diff);
      const r = random();
      let margin = 0;
      if (r >= p.home + p.draw || r < p.home) {
        const m = random();
        margin = 1 + cumulative.findIndex((c) => m < c);
        if (margin === 0) margin = cumulative.length;
        if (r >= p.home + p.draw) margin = -margin;
      }
      const st = stakeOf[f]!;
      if (st >= 0) runOutcome[st] = margin > 0 ? 0 : margin < 0 ? 2 : 1;
      if (margin > 0) points[h]! += 3;
      else if (margin < 0) points[a]! += 3;
      else {
        points[h]! += 1;
        points[a]! += 1;
      }
      gd[h]! += margin;
      gd[a]! -= margin;
      const actual = margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
      const delta =
        options.kFactor * goalDifferenceMultiplier(margin) * (actual - expectedScore(diff, 0));
      rating[h]! += delta;
      rating[a]! -= delta;
    }
    for (let i = 0; i < n; i++) tiebreak[i] = random();
    order.sort((x, y) => points[y]! - points[x]! || gd[y]! - gd[x]! || tiebreak[y]! - tiebreak[x]!);
    for (let pos = 0; pos < n; pos++) {
      const i = order[pos]!;
      positionCounts[i]![pos]! += 1;
      pointsSum[i]! += points[i]!;
      finalPos[i] = pos;
    }
    for (let f = 0; f < fx.length; f++) {
      const st = stakeOf[f]!;
      if (st < 0) continue;
      const o = runOutcome[st]!;
      const entry = stakes[st]!;
      entry.runs[o]! += 1;
      entry.counts[o]![0]![finalPos[fx[f]![0]]!]! += 1;
      entry.counts[o]![1]![finalPos[fx[f]![1]]!]! += 1;
    }
  }

  const results = teams.map((t, i) => ({
    id: t.id,
    expectedPoints: pointsSum[i]! / options.runs,
    positionProbabilities: positionCounts[i]!.map((c) => c / options.runs),
  }));
  return { teams: results, stakes };
}
