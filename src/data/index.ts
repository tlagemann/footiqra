import { ELO_MODEL_ID } from "@/ranking";
import "server-only";
import { dataDir, listHistoryDates, readHistoryFile } from "@/store/fs";
import { referenceDate, utcDay, type HistoryFile, type HistoryTeam } from "./history";
import { upcomingForecasts, type MatchForecast } from "./forecasts";
import { loadSnapshotFromDisk } from "./load";
import { rankHistories, type RankPoint } from "./rank-history";
import { ratingHistory, type RatingPoint } from "./rating-history";
import { leagueProjection, type LeagueProjection, type ProjectionRow } from "./projection";
import { matchDetail, type MatchDetail } from "./match-detail";
import { LEAGUES } from "@/config/leagues";
import { computePowerRanking, type PowerRanking, type PowerRankingRow } from "./power-ranking";
import {
  allLeagueTeams,
  findTeamBySlug,
  competitionMatches,
  competitionTable,
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
    // Ranks from another rating model are not comparable.
    if (file && file.model !== ELO_MODEL_ID) return undefined;
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

export type { LeagueProjection, ProjectionRow };

const projectionCache = new Map<string, Promise<LeagueProjection | undefined>>();

/** Simulated final table of a league, computed once per build. */
export function getLeagueProjection(leagueSlug: string): Promise<LeagueProjection | undefined> {
  let cached = projectionCache.get(leagueSlug);
  if (!cached) {
    cached = Promise.all([loadSnapshot(), loadRanking()]).then(([snapshot, ranking]) =>
      leagueProjection(snapshot, ranking, leagueSlug),
    );
    projectionCache.set(leagueSlug, cached);
  }
  return cached;
}

export interface ChampionsLeagueData {
  season: number | null;
  table: LeagueTable | undefined;
  results: MatchView[];
  fixtures: MatchView[];
  /** Covered clubs that play in the competition, in power ranking order. */
  clubs: PowerRankingRow[];
}

/** Champions League overview: table, latest results, next matches. */
export async function getChampionsLeague(): Promise<ChampionsLeagueData> {
  const [snapshot, ranking] = await Promise.all([loadSnapshot(), loadRanking()]);
  const files = snapshot.matchFiles.filter((f) => f.competition === "CL");
  const file = files.reduce<(typeof files)[number] | undefined>(
    (a, f) => (!a || f.season > a.season ? f : a),
    undefined,
  );
  if (!file) return { season: null, table: undefined, results: [], fixtures: [], clubs: [] };
  const views = competitionMatches(snapshot, file);
  const asOf = Date.parse(snapshot.meta.lastSuccessfulRunUtc ?? "") || Date.now();
  const results = views
    .filter((m) => m.status === "FINISHED" && m.homeGoals !== null)
    .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate) || b.id - a.id);
  const fixtures = views
    .filter(
      (m) => (m.status === "SCHEDULED" || m.status === "TIMED") && Date.parse(m.utcDate) >= asOf,
    )
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id);
  const ids = new Set(file.matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
  return {
    season: file.season,
    table: competitionTable(snapshot, "CL"),
    results,
    fixtures,
    clubs: ranking.rows.filter((r) => ids.has(r.team.id)),
  };
}

export type { RatingPoint };

export async function getRatingHistory(teamSlug: string): Promise<RatingPoint[]> {
  const [snapshot, ranking] = await Promise.all([loadSnapshot(), loadRanking()]);
  const team = ranking.rows.find((r) => r.team.slug === teamSlug);
  return team
    ? ratingHistory(
        snapshot,
        ranking,
        team.team.id,
        snapshot.meta.lastSuccessfulRunUtc ?? undefined,
      )
    : [];
}

export type { RankPoint };

let rankHistoryPromise: Promise<Map<number, RankPoint[]>> | undefined;

/** Weekly power ranking positions of one club this season. */
export async function getRankHistory(teamSlug: string): Promise<RankPoint[]> {
  rankHistoryPromise ??= Promise.all([loadSnapshot(), loadRanking()]).then(([snapshot, ranking]) =>
    rankHistories(ranking, snapshot.meta.lastSuccessfulRunUtc ?? new Date().toISOString()),
  );
  const ranking = await loadRanking();
  const team = ranking.rows.find((r) => r.team.slug === teamSlug);
  return team ? ((await rankHistoryPromise).get(team.team.id) ?? []) : [];
}
