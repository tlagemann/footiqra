import { LEAGUES } from "@/config/leagues";
import {
  readMatchFile,
  readMeta,
  readSeasonFile,
  writeSeasonFile,
  readTeams,
  writeMatchFile,
  writeStandingsFile,
  writeMeta,
  writeTeams,
} from "@/store/fs";
import { emptyMatchFile, mergeMatches, toStoredMatch, upsertTeams } from "@/store/merge";
import { STORE_SCHEMA_VERSION } from "@/store/types";
import type { FootballDataClient } from "./providers/football-data/client";

/**
 * Competitions fetched on every run: all covered leagues plus the Champions League.
 * The Champions League is the only cross-league competition in the free tier and
 * is the basis for comparing leagues with each other (see docs/ARCHITECTURE.md).
 */
export const INGEST_COMPETITIONS: readonly string[] = [
  ...LEAGUES.map((l) => l.providerCodes.footballData),
  "CL",
];

export interface CompetitionResult {
  competition: string;
  ok: boolean;
  added?: number;
  updated?: number;
  unchanged?: number;
  error?: string;
}

export interface IngestResult {
  season: number;
  requestsMade: number;
  results: CompetitionResult[];
}

/**
 * Fetches each competition independently: one failing competition does not
 * stop the others, and data that was fetched successfully is written.
 * Writes are atomic per file. Meta timestamps are only set for successes.
 */
export async function runIngest(options: {
  client: Pick<FootballDataClient, "getCompetitionMatches" | "requestsMade">;
  dataDir: string;
  season: number;
  competitions?: readonly string[];
  now?: () => Date;
  log?: (line: string) => void;
}): Promise<IngestResult> {
  const { client, dataDir, season } = options;
  const competitions = options.competitions ?? INGEST_COMPETITIONS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});

  let teams = await readTeams(dataDir);
  const meta = await readMeta(dataDir);
  const results: CompetitionResult[] = [];

  for (const code of competitions) {
    try {
      const fetched = await client.getCompetitionMatches(code, season);
      const existing = (await readMatchFile(dataDir, code, season)) ?? emptyMatchFile(code, season);
      const { matches, stats } = mergeMatches(existing.matches, fetched.map(toStoredMatch));
      await writeMatchFile(dataDir, { ...existing, matches });
      teams = upsertTeams(
        teams,
        fetched.flatMap((m) => [m.homeTeam, m.awayTeam]),
      );
      meta.competitions[code] = {
        season,
        lastSuccessUtc: now().toISOString(),
        matchCount: matches.length,
      };
      results.push({ competition: code, ok: true, ...stats });
      log(
        `${code} ${season}: +${stats.added} new, ${stats.updated} updated, ${stats.unchanged} unchanged`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ competition: code, ok: false, error: message });
      log(`${code} ${season}: FAILED (${message})`);
    }
  }

  await writeTeams(dataDir, teams);
  if (results.some((r) => r.ok)) {
    meta.lastSuccessfulRunUtc = now().toISOString();
  }
  await writeMeta(dataDir, meta);

  return { season, requestsMade: client.requestsMade, results };
}

/** League tables plus the Champions League league phase table. */
export const STANDINGS_COMPETITIONS: readonly string[] = [
  ...LEAGUES.map((l) => l.providerCodes.footballData),
  "CL",
];

/**
 * Fetches the official league tables of all covered leagues. Runs after
 * runIngest; failures are reported per league and leave the previous table in place.
 */
export async function runStandingsIngest(options: {
  client: Pick<FootballDataClient, "getStandings">;
  dataDir: string;
  season: number;
  competitions?: readonly string[];
  now?: () => Date;
  log?: (line: string) => void;
}): Promise<CompetitionResult[]> {
  const competitions = options.competitions ?? STANDINGS_COMPETITIONS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const results: CompetitionResult[] = [];
  for (const code of competitions) {
    try {
      const table = await options.client.getStandings(code, options.season);
      await writeStandingsFile(options.dataDir, {
        schemaVersion: STORE_SCHEMA_VERSION,
        competition: code,
        season: options.season,
        fetchedUtc: now().toISOString(),
        rows: table.map((r) => ({
          position: r.position,
          teamId: r.team.id,
          playedGames: r.playedGames,
          won: r.won,
          draw: r.draw,
          lost: r.lost,
          points: r.points,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          goalDifference: r.goalDifference,
        })),
      });
      results.push({ competition: code, ok: true });
      log(`${code} ${options.season} table: ${table.length} teams`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ competition: code, ok: false, error: message });
      log(`${code} ${options.season} table: FAILED (${message})`);
    }
  }
  return results;
}

/** Leagues whose scorers and club details are fetched (not the Champions League). */
export const DETAIL_COMPETITIONS: readonly string[] = LEAGUES.map(
  (l) => l.providerCodes.footballData,
);

/** Club details (stadium) change rarely: refetched after this many days. */
export const CLUB_DETAILS_MAX_AGE_DAYS = 7;

/**
 * Top scorers (every run) and club details (weekly) of all covered leagues.
 * Extra information only: failures are reported but never block the site
 * update, and the previous file stays in place.
 */
export async function runDetailsIngest(options: {
  client: Pick<FootballDataClient, "getScorers" | "getCompetitionTeams">;
  dataDir: string;
  season: number;
  competitions?: readonly string[];
  now?: () => Date;
  log?: (line: string) => void;
}): Promise<CompetitionResult[]> {
  const competitions = options.competitions ?? DETAIL_COMPETITIONS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const results: CompetitionResult[] = [];
  for (const code of competitions) {
    try {
      const existing = await readSeasonFile(options.dataDir, "clubs", code, options.season);
      const age = existing ? now().getTime() - Date.parse(existing.fetchedUtc) : Infinity;
      if (!(age < CLUB_DETAILS_MAX_AGE_DAYS * 24 * 3600 * 1000)) {
        const teams = await options.client.getCompetitionTeams(code, options.season);
        await writeSeasonFile(options.dataDir, "clubs", {
          schemaVersion: STORE_SCHEMA_VERSION,
          competition: code,
          season: options.season,
          fetchedUtc: now().toISOString(),
          clubs: teams
            .map((t) => ({ teamId: t.id, venue: t.venue ?? null, founded: t.founded ?? null }))
            .sort((a, b) => a.teamId - b.teamId),
        });
        log(`${code} ${options.season} clubs: ${teams.length}`);
      }
      const scorers = await options.client.getScorers(code, options.season);
      await writeSeasonFile(options.dataDir, "scorers", {
        schemaVersion: STORE_SCHEMA_VERSION,
        competition: code,
        season: options.season,
        fetchedUtc: now().toISOString(),
        scorers: scorers
          .filter((s) => s.goals !== null)
          .map((s) => ({
            playerId: s.player.id,
            name: s.player.name,
            teamId: s.team.id,
            goals: s.goals!,
            assists: s.assists ?? null,
            penalties: s.penalties ?? null,
            playedMatches: s.playedMatches ?? null,
          })),
      });
      results.push({ competition: code, ok: true });
      log(`${code} ${options.season} scorers: ${scorers.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ competition: code, ok: false, error: message });
      log(`${code} ${options.season} scorers/clubs: FAILED (${message})`);
    }
  }
  return results;
}
