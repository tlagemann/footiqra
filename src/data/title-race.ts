import { LEAGUES } from "@/config/leagues";
import { ELO_MODEL_ID, ELO_OPTIONS, marginShares, SIM_V1, simulateSeason } from "@/ranking";
import type { StoredMatch } from "@/store/types";
import { computePowerRanking, type PowerRanking } from "./power-ranking";
import type { Snapshot } from "./repository";

/**
 * Title race: how every club's title chance developed over the current season.
 *
 * For every checkpoint (the first kickoff of the season, then every Monday
 * 06:00 UTC) the season is replayed as it stood at that moment:
 *
 * - ratings from all matches played before the checkpoint (same model as the
 *   power ranking, all leagues at once, so league strength is right too),
 * - the table rebuilt from the league results before the checkpoint
 *   (3 points per win, 1 per draw; official point deductions are not known),
 * - every league match not yet played at that time as the remaining fixtures,
 * - the same season simulation and seed as the predicted final table.
 *
 * Past checkpoints never change, so `npm run title-race` stores them in
 * data/title-race/{season}.json and only computes the missing ones. The site
 * adds today's chances from the live predicted table as the last point.
 */

export const TITLE_RACE_SCHEMA_VERSION = 1;

/** One checkpoint of one league. Chances by team id, 0..1, rounded to 4 decimals. */
export interface StoredTitleRacePoint {
  at: string;
  /** League matches played before the checkpoint. */
  played: number;
  chances: Record<string, number>;
}

export interface TitleRaceFile {
  schemaVersion: number;
  season: number;
  /** Rating model, simulation model and runs; a change recomputes everything. */
  model: string;
  runs: number;
  leagues: Record<string, StoredTitleRacePoint[]>;
}

export const titleRaceModelId = () => `${ELO_MODEL_ID}+${SIM_V1.id}`;

const DAY = 24 * 60 * 60 * 1000;

const isPlayedBefore = (m: StoredMatch, at: number) =>
  m.status === "FINISHED" &&
  m.homeGoals !== null &&
  m.awayGoals !== null &&
  Date.parse(m.utcDate) < at;

/** The data as it stood at `at`: later results are removed (those matches become scheduled). */
export function snapshotAt(snapshot: Snapshot, at: number): Snapshot {
  const cut = (m: StoredMatch): StoredMatch =>
    Date.parse(m.utcDate) < at
      ? m
      : { ...m, status: "SCHEDULED", homeGoals: null, awayGoals: null, winner: null };
  return {
    ...snapshot,
    matchFiles: snapshot.matchFiles.map((f) => ({ ...f, matches: f.matches.map(cut) })),
  };
}

/** Checkpoints up to (not including) `until`: the first kickoff, then every Monday 06:00 UTC. */
export function checkpoints(firstKickoff: number, until: number): number[] {
  const start = new Date(firstKickoff);
  const day0 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 6);
  const weekday = new Date(day0).getUTCDay(); // 0 = Sunday, 1 = Monday
  let monday = day0 + ((8 - weekday) % 7) * DAY;
  if (monday <= firstKickoff) monday += 7 * DAY;
  const list = firstKickoff < until ? [firstKickoff] : [];
  for (let t = monday; t < until; t += 7 * DAY) list.push(t);
  return list;
}

export interface LeagueMatches {
  slug: string;
  season: number;
  matches: StoredMatch[];
}

/** League matches of the newest season of every covered league. */
export function currentLeagueMatches(snapshot: Snapshot): LeagueMatches[] {
  const out: LeagueMatches[] = [];
  for (const league of LEAGUES) {
    const code = league.providerCodes.footballData;
    const file = snapshot.matchFiles
      .filter((f) => f.competition === code)
      .sort((a, b) => b.season - a.season)[0];
    if (file && file.matches.length > 0) {
      out.push({ slug: league.slug, season: file.season, matches: file.matches });
    }
  }
  return out;
}

/** Points, goal difference and matches played from the results before `at`; every club listed. */
export function tableAt(matches: readonly StoredMatch[], at: number) {
  const table = new Map<number, { points: number; goalDifference: number; played: number }>();
  const row = (id: number) => {
    let r = table.get(id);
    if (!r) table.set(id, (r = { points: 0, goalDifference: 0, played: 0 }));
    return r;
  };
  for (const m of matches) {
    const home = row(m.homeTeamId);
    const away = row(m.awayTeamId);
    if (!isPlayedBefore(m, at)) continue;
    const diff = m.homeGoals! - m.awayGoals!;
    home.goalDifference += diff;
    away.goalDifference -= diff;
    home.played += 1;
    away.played += 1;
    if (diff > 0) home.points += 3;
    else if (diff < 0) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  return table;
}

export function playedBefore(matches: readonly StoredMatch[], at: number): number {
  return matches.filter((m) => isPlayedBefore(m, at)).length;
}

/** Title chances of one league at `at`, with the ranking as it stood then. */
export function titleChancesAt(
  league: LeagueMatches,
  ranking: PowerRanking,
  at: number,
  runs: number,
): StoredTitleRacePoint | null {
  const rating = new Map(ranking.rows.map((r) => [r.team.id, r.rating]));
  const table = tableAt(league.matches, at);
  if (table.size === 0 || [...table.keys()].some((id) => !rating.has(id))) return null;
  const played = league.matches.filter((m) => isPlayedBefore(m, at));
  const remaining = league.matches.filter((m) => !isPlayedBefore(m, at));
  const leagueIndex = [...league.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const results = simulateSeason(
    [...table.entries()].map(([id, r]) => ({
      id,
      points: r.points,
      goalDifference: r.goalDifference,
      rating: rating.get(id)!,
    })),
    remaining.map((m) => ({ homeId: m.homeTeamId, awayId: m.awayTeamId })),
    {
      runs,
      seed: SIM_V1.seed + leagueIndex,
      homeAdvantage: ELO_OPTIONS.homeAdvantage,
      kFactor: ELO_OPTIONS.kFactor,
      marginDistribution: marginShares(played.map((m) => Math.abs(m.homeGoals! - m.awayGoals!))),
    },
  );
  const chances: Record<string, number> = {};
  for (const r of results)
    chances[String(r.id)] = Math.round((r.positionProbabilities[0] ?? 0) * 1e4) / 1e4;
  return { at: new Date(at).toISOString(), played: played.length, chances };
}

/**
 * Brings the stored title race up to date: keeps every stored checkpoint that is
 * still valid and computes the missing ones before `now`. One ranking per
 * checkpoint serves all seven leagues.
 */
export function updateTitleRace(
  snapshot: Snapshot,
  existing: TitleRaceFile | null,
  now: number,
  runs: number = SIM_V1.runs,
  computeRanking: (s: Snapshot) => PowerRanking = computePowerRanking,
): { file: TitleRaceFile | null; added: number } {
  const leagues = currentLeagueMatches(snapshot);
  const season = Math.max(...leagues.map((l) => l.season), 0);
  const current = leagues.filter((l) => l.season === season);
  const kickoffs = current.flatMap((l) =>
    l.matches.filter((m) => isPlayedBefore(m, Infinity)).map((m) => Date.parse(m.utcDate)),
  );
  if (current.length === 0 || kickoffs.length === 0) return { file: existing, added: 0 };

  const model = titleRaceModelId();
  const reuse =
    existing &&
    existing.schemaVersion === TITLE_RACE_SCHEMA_VERSION &&
    existing.season === season &&
    existing.model === model &&
    existing.runs === runs;
  const file: TitleRaceFile = reuse
    ? existing
    : { schemaVersion: TITLE_RACE_SCHEMA_VERSION, season, model, runs, leagues: {} };

  let added = 0;
  for (const at of checkpoints(Math.min(...kickoffs), now)) {
    const iso = new Date(at).toISOString();
    const missing = current.filter((l) => !(file.leagues[l.slug] ?? []).some((p) => p.at === iso));
    if (missing.length === 0) continue;
    const ranking = computeRanking(snapshotAt(snapshot, at));
    for (const league of missing) {
      const point = titleChancesAt(league, ranking, at, runs);
      if (!point) continue;
      const list = (file.leagues[league.slug] ??= []);
      list.push(point);
      list.sort((a, b) => a.at.localeCompare(b.at));
      added += 1;
    }
  }
  return { file, added };
}

/**
 * The checkpoints worth drawing for one league: from the last one before its
 * own first match (its pre-season chances) onwards.
 */
export function trimPreseason<T extends { played: number }>(points: readonly T[]): T[] {
  const firstPlayed = points.findIndex((p) => p.played > 0);
  if (firstPlayed <= 0) return firstPlayed === -1 ? points.slice(-1) : [...points];
  return points.slice(firstPlayed - 1);
}

/** Clubs worth drawing: everyone who reached `minChance` at any point, best today first. */
export function contenders(
  points: readonly { chances: ReadonlyMap<number, number> }[],
  minChance = 0.1,
  max = 5,
): number[] {
  const peak = new Map<number, number>();
  for (const p of points) {
    for (const [id, c] of p.chances) peak.set(id, Math.max(peak.get(id) ?? 0, c));
  }
  const last = points.at(-1)?.chances ?? new Map<number, number>();
  return [...peak.entries()]
    .filter(([, c]) => c >= minChance)
    .sort((a, b) => (last.get(b[0]) ?? 0) - (last.get(a[0]) ?? 0) || b[1] - a[1])
    .slice(0, max)
    .map(([id]) => id);
}

export interface TitleRaceSeries {
  teamId: number;
  slug: string;
  name: string;
  crest: string | null;
  /** Chance at every checkpoint of the race, 0..1. */
  chances: number[];
}

export interface TitleRace {
  leagueSlug: string;
  season: number;
  runs: number;
  /** Checkpoint times (UTC ms); the last one is today's live data. */
  times: number[];
  /** League matches played before each checkpoint. */
  played: number[];
  /** Up to five clubs that reached 10% at some point, best today first. */
  series: TitleRaceSeries[];
}

/**
 * Stored checkpoints of one league plus today's chances from the live predicted
 * table, as series for the chart. `teams` resolves ids to names and pages.
 */
export function buildTitleRace(
  leagueSlug: string,
  file: TitleRaceFile,
  live: { at: number; played: number; chances: ReadonlyMap<number, number> } | null,
  team: (id: number) => { slug: string; name: string; crest: string | null } | undefined,
): TitleRace | null {
  const stored = trimPreseason(file.leagues[leagueSlug] ?? []).map((p) => ({
    t: Date.parse(p.at),
    played: p.played,
    chances: new Map(Object.entries(p.chances).map(([id, c]) => [Number(id), c])),
  }));
  // Today replaces a stored checkpoint from the same day or later.
  const points = live
    ? [...stored.filter((p) => p.t < live.at - DAY / 2), { t: live.at, ...live }]
    : stored;
  if (points.length < 2) return null;
  const series = contenders(points)
    .map((id) => {
      const info = team(id);
      return info
        ? { teamId: id, ...info, chances: points.map((p) => p.chances.get(id) ?? 0) }
        : null;
    })
    .filter((s): s is TitleRaceSeries => s !== null);
  return {
    leagueSlug,
    season: file.season,
    runs: file.runs,
    times: points.map((p) => p.t),
    played: points.map((p) => p.played),
    series,
  };
}
