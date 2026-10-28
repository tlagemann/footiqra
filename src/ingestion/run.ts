import { LEAGUES } from "@/config/leagues";
import {
  readMatchFile,
  readMeta,
  readTeams,
  writeMatchFile,
  writeMeta,
  writeTeams,
} from "@/store/fs";
import { emptyMatchFile, mergeMatches, toStoredMatch, upsertTeams } from "@/store/merge";
import type { FootballDataClient } from "./providers/football-data/client";

/**
 * Competitions fetched on every run: the five leagues plus the Champions League.
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
