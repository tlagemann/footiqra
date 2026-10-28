import type { RankableMatch, RatingChange } from "./types";

/**
 * Baseline rating model (v0): Elo with home advantage and a goal-difference multiplier,
 * in the style of the World Football Elo Ratings.
 *
 * This is a deliberately simple, well-understood starting point so the pipeline
 * (ingest -> compute -> store -> render) can be built and tested end to end.
 * The final Footiqra methodology is still open (see docs/ARCHITECTURE.md,
 * "Open questions"); it can replace this module without touching the UI.
 */
export interface EloOptions {
  /** Rating of a team the first time it appears. */
  initialRating: number;
  /** Base update size per match. */
  kFactor: number;
  /** Rating points added to the home side when computing the expected result. */
  homeAdvantage: number;
}

export const DEFAULT_ELO_OPTIONS: EloOptions = {
  initialRating: 1500,
  kFactor: 20,
  homeAdvantage: 65,
};

export interface EloResult {
  ratings: Map<string, number>;
  matchesPlayed: Map<string, number>;
  changes: RatingChange[];
}

/** Probability-like expected score of A against B (0..1). */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/** 1 for a one-goal margin or draw, 1.5 for two goals, (11 + n) / 8 for three or more. */
export function goalDifferenceMultiplier(goalDifference: number): number {
  const n = Math.abs(goalDifference);
  if (n <= 1) return 1;
  if (n === 2) return 1.5;
  return (11 + n) / 8;
}

function actualScore(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 1;
  if (goalsFor < goalsAgainst) return 0;
  return 0.5;
}

function assertValidMatch(match: RankableMatch): void {
  const goalsOk = [match.homeGoals, match.awayGoals].every((g) => Number.isInteger(g) && g >= 0);
  if (!goalsOk) {
    throw new Error(`Match ${match.id}: goals must be non-negative integers`);
  }
  if (match.homeTeamId === match.awayTeamId) {
    throw new Error(`Match ${match.id}: a team cannot play itself`);
  }
  if (Number.isNaN(Date.parse(match.kickoffUtc))) {
    throw new Error(`Match ${match.id}: invalid kickoffUtc "${match.kickoffUtc}"`);
  }
}

/**
 * Removes exact duplicates (same id, same content) and rejects conflicting
 * duplicates (same id, different content), then sorts chronologically.
 * Sorting makes the result independent of input order.
 */
export function normaliseMatches(matches: readonly RankableMatch[]): RankableMatch[] {
  const byId = new Map<string, RankableMatch>();
  for (const match of matches) {
    assertValidMatch(match);
    const existing = byId.get(match.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(match)) {
        throw new Error(`Conflicting duplicate for match ${match.id}`);
      }
      continue;
    }
    byId.set(match.id, match);
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc) || a.id.localeCompare(b.id),
  );
}

export function computeEloRatings(
  matches: readonly RankableMatch[],
  options: Partial<EloOptions> = {},
  /** Ratings carried over from a previous run (e.g. last season). */
  startingRatings: ReadonlyMap<string, number> = new Map(),
): EloResult {
  const opts = { ...DEFAULT_ELO_OPTIONS, ...options };
  const ratings = new Map(startingRatings);
  const matchesPlayed = new Map<string, number>();
  const changes: RatingChange[] = [];

  const ratingOf = (teamId: string) => ratings.get(teamId) ?? opts.initialRating;

  for (const match of normaliseMatches(matches)) {
    const home = ratingOf(match.homeTeamId);
    const away = ratingOf(match.awayTeamId);
    const advantage = match.neutralVenue ? 0 : opts.homeAdvantage;

    const expectedHome = expectedScore(home + advantage, away);
    const scoreHome = actualScore(match.homeGoals, match.awayGoals);
    const k = opts.kFactor * goalDifferenceMultiplier(match.homeGoals - match.awayGoals);
    const delta = k * (scoreHome - expectedHome);

    // Zero-sum: whatever the home side gains, the away side loses.
    ratings.set(match.homeTeamId, home + delta);
    ratings.set(match.awayTeamId, away - delta);

    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      matchesPlayed.set(teamId, (matchesPlayed.get(teamId) ?? 0) + 1);
    }
    changes.push(
      { matchId: match.id, teamId: match.homeTeamId, before: home, after: home + delta },
      { matchId: match.id, teamId: match.awayTeamId, before: away, after: away - delta },
    );
  }

  return { ratings, matchesPlayed, changes };
}
