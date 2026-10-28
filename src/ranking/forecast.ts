import { expectedScore } from "./elo";

/**
 * Match forecast "forecast-v1": win / draw / loss probabilities from the
 * Footiqra rating difference.
 *
 * 1. Elo expected score for the home side:  E = 1 / (1 + 10^(-d / 400)),
 *    d = home rating + home advantage - away rating (league strength included).
 * 2. Draw probability, highest for even matches and shrinking for mismatches:
 *    P(draw) = DRAW_MAX * (1 - |2E - 1|^DRAW_SHAPE)
 * 3. E counts a draw as half a win, so P(home) = E - P(draw) / 2 and
 *    P(away) = 1 - E - P(draw) / 2.
 *
 * DRAW_MAX and DRAW_SHAPE were chosen by log loss on the 593 matches of the
 * 2026/27 season up to 28 Oct 2026 (log loss 1.050 vs 1.072 for always
 * predicting the average home/draw/away rates).
 */
export const FORECAST_V1 = {
  id: "forecast-v1",
  drawMax: 0.25,
  drawShape: 2,
  /** Lower bound for any outcome, so no result is ever shown as impossible. */
  floor: 0.02,
} as const;

export interface MatchProbabilities {
  home: number;
  draw: number;
  away: number;
}

export function matchProbabilities(ratingDiff: number): MatchProbabilities {
  if (!Number.isFinite(ratingDiff)) throw new Error("ratingDiff must be a finite number");
  const e = expectedScore(ratingDiff, 0);
  const draw = FORECAST_V1.drawMax * (1 - Math.abs(2 * e - 1) ** FORECAST_V1.drawShape);
  const home = Math.max(e - draw / 2, FORECAST_V1.floor);
  const away = Math.max(1 - e - draw / 2, FORECAST_V1.floor);
  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

/** Rounds to whole percentages that always add up to exactly 100. */
export function toPercentages(p: MatchProbabilities): MatchProbabilities {
  const raw = [p.home * 100, p.draw * 100, p.away * 100];
  const floored = raw.map(Math.floor);
  let rest = 100 - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    floored[i]! += 1;
    rest -= 1;
  }
  return { home: floored[0]!, draw: floored[1]!, away: floored[2]! };
}

export interface ForecastRecord {
  matches: number;
  /** Share of matches the most likely outcome actually happened. */
  hitRate: number;
  logLoss: number;
  /** Log loss when always predicting the average home/draw/away frequencies. */
  baselineLogLoss: number;
}

/** Evaluates forecasts made before each match against the actual results. */
export function evaluateForecasts(
  matches: readonly { ratingDiff: number; homeGoals: number; awayGoals: number }[],
): ForecastRecord | null {
  if (matches.length === 0) return null;
  const outcome = (m: { homeGoals: number; awayGoals: number }) =>
    m.homeGoals > m.awayGoals ? "home" : m.homeGoals < m.awayGoals ? "away" : "draw";
  const freq = { home: 0, draw: 0, away: 0 };
  for (const m of matches) freq[outcome(m)] += 1 / matches.length;

  let hits = 0;
  let loss = 0;
  let baseline = 0;
  for (const m of matches) {
    const p = matchProbabilities(m.ratingDiff);
    const o = outcome(m);
    const best = (["home", "draw", "away"] as const).reduce((a, b) => (p[b] > p[a] ? b : a));
    if (best === o) hits++;
    loss -= Math.log(p[o]);
    baseline -= Math.log(freq[o]);
  }
  return {
    matches: matches.length,
    hitRate: hits / matches.length,
    logLoss: loss / matches.length,
    baselineLogLoss: baseline / matches.length,
  };
}
