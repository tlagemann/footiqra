import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  ELO_OPTIONS,
  expectedScore,
  goalRates,
  matchProbabilities,
  scorelineForecast,
  toPercentages,
  type MatchProbabilities,
  type ScorelineForecast,
} from "@/ranking";
import type { StoredMatch } from "@/store/types";
import type { PowerRanking, PowerRankingRow } from "./power-ranking";
import {
  crestPath,
  leagueTable,
  matchSlugs,
  teamLeagueMap,
  teamMatches,
  type FormResult,
  type MatchView,
  type Snapshot,
  type TableRow,
} from "./repository";

export interface Record3 {
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

/** League numbers of the current season, from stored matches. */
export interface SeasonStats extends Record3 {
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  /** Matches in which both teams scored. */
  bothScored: number;
  /** Matches with three or more goals. */
  over25: number;
  home: Record3;
  away: Record3;
}

export interface MatchSide {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  crest: string | null;
  leagueSlug: string;
  ranking: PowerRankingRow | undefined;
  table: TableRow | undefined;
  stats: SeasonStats;
  form: FormResult[];
  recent: MatchView[];
}

export interface MatchDetail {
  id: number;
  slug: string;
  utcDate: string;
  status: string;
  competition: string;
  competitionName: string;
  /** League of the match, null for European competitions. */
  leagueSlug: string | null;
  matchday: number | null;
  stage: string;
  season: number;
  homeGoals: number | null;
  awayGoals: number | null;
  home: MatchSide;
  away: MatchSide;
  /**
   * For finished matches: the forecast with the ratings before kick-off.
   * Otherwise: the forecast with the current ratings. Null if a side has no rating.
   */
  forecast: {
    probabilities: MatchProbabilities;
    percentages: MatchProbabilities;
    basis: "pre-match" | "current";
    /** Exact results and goal markets from the same forecast (scores-v1). */
    scorelines: ScorelineForecast;
  } | null;
  headToHead: MatchView[];
}

const COMPETITION_NAME: Record<string, string> = {
  ...Object.fromEntries(LEAGUES.map((l) => [l.providerCodes.footballData, l.name])),
  CL: "Champions League",
};

const emptyRecord = (): Record3 => ({ played: 0, won: 0, drawn: 0, lost: 0 });

function addResult(r: Record3, gf: number, ga: number): void {
  r.played++;
  if (gf > ga) r.won++;
  else if (gf === ga) r.drawn++;
  else r.lost++;
}

const finished = (m: StoredMatch) =>
  m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;

/** League statistics of one team in its latest league season. */
export function seasonStats(snapshot: Snapshot, teamId: number): SeasonStats {
  const league = teamLeagueMap(snapshot).get(teamId);
  const code = league?.providerCodes.footballData;
  const files = snapshot.matchFiles.filter((f) => f.competition === code);
  const latest = files.reduce<(typeof files)[number] | undefined>(
    (a, f) => (!a || f.season > a.season ? f : a),
    undefined,
  );
  const stats: SeasonStats = {
    ...emptyRecord(),
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    bothScored: 0,
    over25: 0,
    home: emptyRecord(),
    away: emptyRecord(),
  };
  for (const m of latest?.matches ?? []) {
    if (!finished(m)) continue;
    const isHome = m.homeTeamId === teamId;
    if (!isHome && m.awayTeamId !== teamId) continue;
    const gf = isHome ? m.homeGoals! : m.awayGoals!;
    const ga = isHome ? m.awayGoals! : m.homeGoals!;
    addResult(stats, gf, ga);
    addResult(isHome ? stats.home : stats.away, gf, ga);
    stats.goalsFor += gf;
    stats.goalsAgainst += ga;
    if (ga === 0) stats.cleanSheets++;
    if (gf > 0 && ga > 0) stats.bothScored++;
    if (gf + ga >= 3) stats.over25++;
  }
  return stats;
}

function findMatch(
  snapshot: Snapshot,
  id: number,
): { match: StoredMatch; competition: string; season: number } | undefined {
  for (const file of snapshot.matchFiles) {
    const match = file.matches.find((m) => m.id === id);
    if (match) return { match, competition: file.competition, season: file.season };
  }
  return undefined;
}

/** Everything shown on a match page. `asOf` is the data timestamp. */
export function matchDetail(
  snapshot: Snapshot,
  ranking: PowerRanking,
  slug: string,
  asOf: Date,
): MatchDetail | undefined {
  const id = [...matchSlugs(snapshot)].find(([, s]) => s === slug)?.[0];
  if (id === undefined) return undefined;
  const found = findMatch(snapshot, id);
  if (!found) return undefined;
  const { match: m, competition, season } = found;
  const leagues = teamLeagueMap(snapshot);
  const rankingById = new Map(ranking.rows.map((r) => [r.team.id, r]));

  const side = (teamId: number): MatchSide | undefined => {
    const team = snapshot.teams.teams[String(teamId)];
    const league = leagues.get(teamId);
    if (!team || !league) return undefined;
    const table = leagueTable(snapshot, league.slug);
    const row = rankingById.get(teamId);
    const recent = teamMatches(snapshot, team.slug, asOf, { results: 5, fixtures: 0 }).results;
    return {
      id: teamId,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName || team.name,
      crest: crestPath(snapshot, teamId),
      leagueSlug: league.slug,
      ranking: row,
      table: table?.rows.find((r) => r.team.slug === team.slug),
      stats: seasonStats(snapshot, teamId),
      form: row?.form ?? [],
      recent,
    };
  };
  const home = side(m.homeTeamId);
  const away = side(m.awayTeamId);
  if (!home || !away) return undefined;

  const file = snapshot.matchFiles.find(
    (f) => f.competition === competition && f.season === season,
  );
  const rates = goalRates(file?.matches ?? []);
  const build = (diff: number, basis: "pre-match" | "current"): MatchDetail["forecast"] => {
    const probabilities = matchProbabilities(diff);
    return {
      probabilities,
      percentages: toPercentages(probabilities),
      basis,
      scorelines: scorelineForecast(probabilities, expectedScore(diff, 0), rates),
    };
  };
  let forecast: MatchDetail["forecast"] = null;
  if (finished(m)) {
    const diff = ranking.preMatchDiff.get(m.id);
    if (diff !== undefined) forecast = build(diff, "pre-match");
  } else if (home.ranking && away.ranking) {
    const neutral = m.stage === "FINAL";
    const diff =
      home.ranking.rating + (neutral ? 0 : ELO_OPTIONS.homeAdvantage) - away.ranking.rating;
    forecast = build(diff, "current");
  }

  const pair = new Set([m.homeTeamId, m.awayTeamId]);
  const slugs = matchSlugs(snapshot);
  const headToHead: MatchView[] = [];
  for (const file of snapshot.matchFiles) {
    for (const x of file.matches) {
      if (x.id === m.id || !finished(x)) continue;
      if (!pair.has(x.homeTeamId) || !pair.has(x.awayTeamId)) continue;
      const ref = (tid: number) => {
        const t = snapshot.teams.teams[String(tid)];
        return {
          slug: t?.slug ?? null,
          name: t?.shortName || t?.name || "Unknown team",
          crest: crestPath(snapshot, tid),
        };
      };
      headToHead.push({
        id: x.id,
        utcDate: x.utcDate,
        status: x.status,
        competition: file.competition,
        home: ref(x.homeTeamId),
        away: ref(x.awayTeamId),
        homeGoals: x.homeGoals,
        awayGoals: x.awayGoals,
        slug: slugs.get(x.id) ?? null,
      });
    }
  }
  headToHead.sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate));

  const leagueSlug =
    LEAGUES.find((l) => l.providerCodes.footballData === competition)?.slug ?? null;
  return {
    id: m.id,
    slug,
    utcDate: m.utcDate,
    status: m.status,
    competition,
    competitionName: COMPETITION_NAME[competition] ?? competition,
    leagueSlug: leagueSlug && getLeagueBySlug(leagueSlug) ? leagueSlug : null,
    matchday: m.matchday,
    stage: m.stage,
    season,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    home,
    away,
    forecast,
    headToHead,
  };
}
