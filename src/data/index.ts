import "server-only";
import { dataDir, readAllMatchFiles, readMeta, readTeams } from "@/store/fs";
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

export type { MatchView, TeamSummary };

const NO_DATA = "No match data has been imported yet.";

let snapshotPromise: Promise<Snapshot> | undefined;

/** Loads all data once per build. */
function loadSnapshot(): Promise<Snapshot> {
  snapshotPromise ??= (async () => {
    const dir = dataDir();
    const [meta, teams, matchFiles] = await Promise.all([
      readMeta(dir),
      readTeams(dir),
      readAllMatchFiles(dir),
    ]);
    return { meta, teams, matchFiles };
  })();
  return snapshotPromise;
}

function ok<T>(snapshot: Snapshot, data: T): DataResult<T> {
  const updated = snapshot.meta.lastSuccessfulRunUtc;
  return updated
    ? { status: "ok", data, lastUpdatedUtc: updated }
    : { status: "unavailable", reason: NO_DATA };
}

export async function getPowerRanking(): Promise<DataResult<never[]>> {
  return {
    status: "unavailable",
    reason: "The power ranking will be published once the rating methodology has been finalised.",
  };
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
