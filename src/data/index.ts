import "server-only";
import { dataDir, listHistoryDates, readHistoryFile } from "@/store/fs";
import { referenceDate, utcDay, type HistoryFile, type HistoryTeam } from "./history";
import { upcomingForecasts, type MatchForecast } from "./forecasts";
import { loadSnapshotFromDisk } from "./load";
import { matchDetail, type MatchDetail } from "./match-detail";
import { LEAGUES } from "@/config/leagues";
import { computePowerRanking, type PowerRanking, type PowerRankingRow } from "./power-ranking";
import {
  allLeagueTeams,
  findTeamBySlug,
  leagueTable,
  matchSlugs,
  teamMatches,
  teamsOfLeague,
  type LeagueTable,
  type MatchView,
  type Snapshot,
  type TableRow,
  type TeamSummary,
} from "./repository";
import { highlights, tableVsStrength, type PerformanceGap } from "./table-vs-strength";

/**
 * Read layer used by pages. Pages never call the football API; they read the
 * JSON files committed by the ingestion job, at build time.
 *
 * Missing data is reported as "unavailable" instead of being filled with
 * invented numbers.
 */

export type DataResult<T> =
  { status: "ok"; data: T; lastUpdatedUtc: string } | { status: "unavailable"; reason: string };

export type { HistoryTeam, PerformanceGap };
export { MIN_HIGHLIGHT_GAP, topAcrossLeagues } from "./table-vs-strength";
export type { LeagueTable, MatchView, TableRow, TeamSummary, PowerRanking, PowerRankingRow };

const NO_DATA = "No match data has been imported yet.";

let snapshotPromise: Promise<Snapshot> | undefined;

/** Loads all data once per build. */
function loadSnapshot(): Promise<Snapshot> {
  snapshotPromise ??= loadSnapshotFromDisk(dataDir(), process.cwd());
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

/** Official league table, if one has been fetched. */
export async function getLeagueTable(leagueSlug: string): Promise<LeagueTable | undefined> {
  return leagueTable(await loadSnapshot(), leagueSlug);
}

export interface LeaguePerformance {
  leagueSlug: string;
  gaps: PerformanceGap[];
  over: PerformanceGap[];
  under: PerformanceGap[];
}

/** Table vs. strength for one league, if both a table and ratings exist. */
export async function getTableVsStrength(
  leagueSlug: string,
  limit = 3,
): Promise<LeaguePerformance | undefined> {
  const [snapshot, ranking] = await Promise.all([loadSnapshot(), loadRanking()]);
  const table = leagueTable(snapshot, leagueSlug);
  if (!table || ranking.matchesUsed === 0) return undefined;
  const gaps = tableVsStrength(leagueSlug, table, ranking.rows);
  if (gaps.length === 0) return undefined;
  return { leagueSlug, gaps, ...highlights(gaps, limit) };
}

/** Table vs. strength for all covered leagues that have data. */
export async function getAllTableVsStrength(limit = 3): Promise<LeaguePerformance[]> {
  const all = await Promise.all(LEAGUES.map((l) => getTableVsStrength(l.slug, limit)));
  return all.filter((x): x is LeaguePerformance => x !== undefined);
}

/** Ranking history from about a week before the current data, if recorded. */
export interface HistoryReference {
  date: string;
  teams: ReadonlyMap<string, HistoryTeam>;
}

let referencePromise: Promise<HistoryReference | undefined> | undefined;

export function getWeekAgo(): Promise<HistoryReference | undefined> {
  referencePromise ??= (async () => {
    const snapshot = await loadSnapshot();
    const current = snapshot.meta.lastSuccessfulRunUtc;
    if (!current) return undefined;
    const date = referenceDate(await listHistoryDates(dataDir()), utcDay(current), 7);
    if (!date) return undefined;
    const file = await readHistoryFile<HistoryFile>(dataDir(), date);
    return file ? { date, teams: new Map(file.teams.map((t) => [t.slug, t])) } : undefined;
  })();
  return referencePromise;
}

export type { MatchForecast };

let forecastsPromise: Promise<MatchForecast[]> | undefined;

/** All upcoming forecasts after the current data timestamp (reproducible builds). */
export function getUpcomingForecasts(): Promise<MatchForecast[]> {
  forecastsPromise ??= (async () => {
    const [snapshot, ranking] = await Promise.all([loadSnapshot(), loadRanking()]);
    const asOf = snapshot.meta.lastSuccessfulRunUtc;
    if (!asOf || ranking.matchesUsed === 0) return [];
    return upcomingForecasts(snapshot, ranking, new Date(asOf));
  })();
  return forecastsPromise;
}

export async function getForecastRecord() {
  return (await loadRanking()).forecastRecord;
}

export { biggestMatches, nextWindow } from "./forecasts";

export type { MatchDetail };

/** Slugs of all match pages. */
export async function getAllMatchSlugs(): Promise<string[]> {
  return [...matchSlugs(await loadSnapshot()).values()];
}

export async function getMatch(slug: string): Promise<MatchDetail | undefined> {
  const [snapshot, ranking] = await Promise.all([loadSnapshot(), loadRanking()]);
  const asOf = new Date(snapshot.meta.lastSuccessfulRunUtc ?? Date.now());
  return matchDetail(snapshot, ranking, slug, asOf);
}
