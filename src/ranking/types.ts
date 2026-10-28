/**
 * Input/output types of the ranking engine.
 *
 * The engine is pure TypeScript: no database, no HTTP, no React, no Next.js.
 * It can run inside the ingestion job, in tests, or in a one-off script.
 */

/** A finished match as the ranking engine sees it. */
export interface RankableMatch {
  /** Stable, provider-independent match id (used for ordering and de-duplication). */
  id: string;
  /** Kick-off time in UTC (ISO 8601). Used to process matches chronologically. */
  kickoffUtc: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  /** True for matches without home advantage (e.g. finals at a neutral venue). */
  neutralVenue?: boolean;
}

export interface RatingChange {
  matchId: string;
  teamId: string;
  before: number;
  after: number;
}

export interface RankingEntry {
  rank: number;
  teamId: string;
  rating: number;
  matchesPlayed: number;
}
