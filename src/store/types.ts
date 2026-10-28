/**
 * Shape of the versioned data files in /data.
 *
 * The repository is the database: every ingestion run that changes data is a
 * git commit, so the full history is preserved and every number on the site
 * can be traced back to the provider response it came from.
 *
 *   data/meta.json                       run timestamps per competition
 *   data/teams.json                      team registry with stable URL slugs
 *   data/matches/{CODE}/{season}.json    matches per competition and season
 *   data/standings/{CODE}/{season}.json  official league table per competition and season
 */

export const STORE_SCHEMA_VERSION = 1;

export interface StoredMatch {
  /** football-data.org match id (unique per provider). */
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  /** REGULAR, EXTRA_TIME, PENALTY_SHOOTOUT */
  duration: string;
  winner: string | null;
  /** Provider's last change timestamp, used to decide which version wins. */
  lastUpdated: string;
}

export interface MatchFile {
  schemaVersion: number;
  competition: string;
  /** Season start year, e.g. 2026 for 2026-27. */
  season: number;
  matches: StoredMatch[];
}

export interface StoredTeam {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  /** Assigned once, never changed afterwards (URLs must stay stable). */
  slug: string;
}

export interface TeamRegistry {
  schemaVersion: number;
  teams: Record<string, StoredTeam>;
}

export interface CompetitionRunInfo {
  season: number;
  lastSuccessUtc: string;
  matchCount: number;
}

export interface StoreMeta {
  schemaVersion: number;
  provider: "football-data";
  lastSuccessfulRunUtc: string | null;
  competitions: Record<string, CompetitionRunInfo>;
}

export interface StoredStandingRow {
  position: number;
  teamId: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface StandingsFile {
  schemaVersion: number;
  competition: string;
  season: number;
  /** When the table was fetched from the provider. */
  fetchedUtc: string;
  rows: StoredStandingRow[];
}
