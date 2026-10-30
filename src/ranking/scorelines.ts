import type { MatchProbabilities } from "./forecast";

/**
 * Scoreline model "scores-v1": turns a match forecast into probabilities for
 * exact results and goal markets.
 *
 * 1. Expected goals start from the league's average home and away goals this
 *    season. A strength factor f scales them (home x f, away / f) until the
 *    two Poisson distributions give the same expected score as the Elo model
 *    (P(home win) + P(draw) / 2 = E).
 * 2. Every cell of the score grid is then rescaled per outcome (home win,
 *    draw, away win) so the grid adds up to exactly the published win / draw
 *    / loss forecast. Plain independent Poisson underrates draws; this keeps
 *    the scorelines consistent with the forecast bar on the same page.
 */
export const SCORES_V1 = { id: "scores-v1", maxGoals: 15 } as const;

export interface GoalRates {
  home: number;
  away: number;
}

export interface ScorelineForecast {
  expectedGoals: GoalRates;
  /** grid[h][a] = probability of the final score h:a. */
  grid: number[][];
  top: { home: number; away: number; probability: number }[];
  over25: number;
  bothScore: number;
  /** Home side keeps a clean sheet (away side scores nothing). */
  homeCleanSheet: number;
  awayCleanSheet: number;
}

/** Fallback when a competition has too few finished matches. */
export const DEFAULT_GOAL_RATES: GoalRates = { home: 1.55, away: 1.25 };

function poisson(lambda: number, max: number): number[] {
  const p = [Math.exp(-lambda)];
  for (let k = 1; k <= max; k++) p.push((p[k - 1]! * lambda) / k);
  return p;
}

function rawGrid(home: number, away: number): number[][] {
  const ph = poisson(home, SCORES_V1.maxGoals);
  const pa = poisson(away, SCORES_V1.maxGoals);
  return ph.map((x) => pa.map((y) => x * y));
}

function outcomes(grid: number[][]): MatchProbabilities {
  let home = 0;
  let draw = 0;
  let away = 0;
  grid.forEach((row, h) =>
    row.forEach((p, a) => {
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }),
  );
  // Normalise, so goals beyond the grid edge do not bias the fit.
  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

/** Goal rates whose Poisson expected score equals the Elo expected score. */
export function fitGoalRates(expectedScore: number, base: GoalRates): GoalRates {
  if (!(expectedScore > 0 && expectedScore < 1)) throw new Error("expectedScore must be in (0, 1)");
  let lo = Math.log(0.05);
  let hi = Math.log(20);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const f = Math.exp(mid);
    const o = outcomes(rawGrid(base.home * f, base.away / f));
    if (o.home + o.draw / 2 < expectedScore) lo = mid;
    else hi = mid;
  }
  const f = Math.exp((lo + hi) / 2);
  return { home: base.home * f, away: base.away / f };
}

export function scorelineForecast(
  forecast: MatchProbabilities,
  expectedScore: number,
  base: GoalRates,
  topCount = 5,
): ScorelineForecast {
  const rates = fitGoalRates(expectedScore, base);
  const grid = rawGrid(rates.home, rates.away);
  const raw = outcomes(grid);
  const scale = {
    home: forecast.home / raw.home,
    draw: forecast.draw / raw.draw,
    away: forecast.away / raw.away,
  };
  let total = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h]!.length; a++) {
      const key = h > a ? "home" : h === a ? "draw" : "away";
      grid[h]![a]! *= scale[key];
      total += grid[h]![a]!;
    }
  }
  let over25 = 0;
  let bothScore = 0;
  let homeCleanSheet = 0;
  let awayCleanSheet = 0;
  const cells: ScorelineForecast["top"] = [];
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h]!.length; a++) {
      const p = grid[h]![a]! / total;
      grid[h]![a] = p;
      if (h + a >= 3) over25 += p;
      if (h > 0 && a > 0) bothScore += p;
      if (a === 0) homeCleanSheet += p;
      if (h === 0) awayCleanSheet += p;
      cells.push({ home: h, away: a, probability: p });
    }
  }
  cells.sort((x, y) => y.probability - x.probability || x.home + x.away - (y.home + y.away));
  return {
    expectedGoals: rates,
    grid,
    top: cells.slice(0, topCount),
    over25,
    bothScore,
    homeCleanSheet,
    awayCleanSheet,
  };
}

/** Average home and away goals of finished matches; fallback below `minMatches`. */
export function goalRates(
  matches: readonly { homeGoals: number | null; awayGoals: number | null; status: string }[],
  minMatches = 30,
): GoalRates {
  let n = 0;
  let home = 0;
  let away = 0;
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeGoals === null || m.awayGoals === null) continue;
    n++;
    home += m.homeGoals;
    away += m.awayGoals;
  }
  return n < minMatches ? DEFAULT_GOAL_RATES : { home: home / n, away: away / n };
}
