import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { dataDir, readAllMatchFiles, readMeta, readTeams } from "@/store/fs";
import { computePowerRanking, type PowerRanking, type PowerRankingRow } from "./power-ranking";
import {
  allLeagueTeams,
  findTeamBySlug,
  teamMatches,
  teamsOfLeague,
  type MatchView,
  type Snapshot,
  type TeamSummary,
} from "./repository";

/**
 * Read layer used by pages. Pages never call the football API; they read the
 * JSON files committed by the ingestion job, at build time.
 *
 * Missing data is reported as "unavailable" instead of being filled with
 * invented numbers.
 */

export type DataResult<T> =
  { status: "ok"; data: T; lastUpdatedUtc: string } | { status: "unavailable"; reason: string };

export type { MatchView, TeamSummary, PowerRanking, PowerRankingRow };

const NO_DATA = "No match data has been imported yet.";

let snapshotPromise: Promise<Snapshot> | undefined;

/** Team ids that have a downloaded crest in public/crests. */
async function readCrestIds(): Promise<Set<number>> {
  try {
    const files = await readdir(path.join(process.cwd(), "public", "crests"));
    return new Set(files.filter((f) => /^\d+\.png$/.test(f)).map((f) => Number(f.slice(0, -4))));
  } catch {
    return new Set();
  }
}

/** Loads all data once per build. */
function loadSnapshot(): Promise<Snapshot> {
  snapshotPromise ??= (async () => {
    const dir = dataDir();
    const [meta, teams, matchFiles, crestIds] = await Promise.all([
      readMeta(dir),
      readTeams(dir),
      readAllMatchFiles(dir),
      readCrestIds(),
    ]);
    return { meta, teams, matchFiles, crestIds };
  })();
  return snapshotPromise;
}

function ok<T>(snapshot: Snapshot, data: T): DataResult<T> {
  const updated = snapshot.meta.lastSuccessfulRunUtc;
  return updated
    ? { status: "ok", data, lastUpdatedUtc: updated }
    : { status: "unavailable", reason: NO_DATA };
}

let rankingPromise: Promise<PowerRanking> | undefined;

async function loadRanking(): Promise<PowerRanking> {
  rankingPromise ??= loadSnapshot().then(computePowerRanking);
  return rankingPromise;
}

export async function getPowerRanking(): Promise<DataResult<PowerRanking>> {
  const snapshot = await loadSnapshot();
  const ranking = await loadRanking();
  return ranking.matchesUsed > 0
    ? ok(snapshot, ranking)
    : { status: "unavailable", reason: NO_DATA };
}

/** Rank and rating of one team, if it is ranked. */
export async function getTeamRanking(slug: string): Promise<PowerRankingRow | undefined> {
  const ranking = await loadRanking();
  return ranking.matchesUsed > 0 ? ranking.rows.find((r) => r.team.slug === slug) : undefined;
}

export async function getLeagueTeams(leagueSlug: string): Promise<DataResult<TeamSummary[]>> {
  const snapshot = await loadSnapshot();
  const teams = teamsOfLeague(snapshot, leagueSlug);
  return teams.length > 0 ? ok(snapshot, teams) : { status: "unavailable", reason: NO_DATA };
}

export interface TeamProfile {
  team: TeamSummary;
  results: MatchView[];
  fixtures: MatchView[];
}

export async function getTeam(slug: string): Promise<DataResult<TeamProfile>> {
  const snapshot = await loadSnapshot();
  const team = findTeamBySlug(snapshot, slug);
  if (!team) return { status: "unavailable", reason: "Team not found." };
  // Reference time for "upcoming" = the data snapshot, so builds are reproducible.
  const asOf = new Date(snapshot.meta.lastSuccessfulRunUtc ?? Date.now());
  return ok(snapshot, { team, ...teamMatches(snapshot, slug, asOf) });
}

/** Slugs to prerender at build time. */
export async function getAllTeamSlugs(): Promise<string[]> {
  return allLeagueTeams(await loadSnapshot()).map((t) => t.slug);
}

export async function getLastUpdated(): Promise<string | null> {
  return (await loadSnapshot()).meta.lastSuccessfulRunUtc;
}
