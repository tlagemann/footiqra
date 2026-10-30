/**
 * Scorer power ranking "scorer-index-v1".
 *
 *   points = (goals - 1/4 x penalty goals) x league factor x reference matches / club matches
 *
 * - Penalty goals count 0.75: they say less about a striker than open play goals.
 * - League factor: 10^(league adjustment / 1600), the league strength from the
 *   club ranking, damped so it moves close cases only (about 0.9 to 1.15).
 * - Scaled to the same number of matches: goals per league match of the
 *   player's club, times the most league matches any club has played. This
 *   way a league with fewer matchdays so far is not behind.
 */
export const SCORER_INDEX_V1 = {
  id: "scorer-index-v1",
  penaltyWeight: 0.75,
  leagueDamping: 1600,
  /** Clubs need this many league matches before their scorers are ranked. */
  minClubMatches: 3,
} as const;

export interface ScorerIndexInput {
  goals: number;
  penalties: number | null;
  /** League matches played by the player's club. */
  clubMatches: number;
  /** League strength adjustment in rating points (0 = average). */
  leagueAdjustment: number;
}

export function leagueFactor(adjustment: number): number {
  return 10 ** (adjustment / SCORER_INDEX_V1.leagueDamping);
}

/** Index points, or null if the club has not played enough league matches. */
export function scorerIndex(input: ScorerIndexInput, referenceMatches: number): number | null {
  if (input.clubMatches < SCORER_INDEX_V1.minClubMatches || referenceMatches <= 0) return null;
  const penalties = input.penalties ?? 0;
  const weighted = input.goals - penalties * (1 - SCORER_INDEX_V1.penaltyWeight);
  return (weighted * leagueFactor(input.leagueAdjustment) * referenceMatches) / input.clubMatches;
}
