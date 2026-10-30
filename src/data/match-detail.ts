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
  archivedMatchIds,
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
  /** Home stadium from the provider's club details, if known. */
  venue: string | null;
  /** Best league scorers of the club this season (provider's top-100 list), most goals first. */
  scorers: TeamScorer[];
}

export interface TeamScorer {
  name: string;
  goals: number;
  assists: number | null;
  penalties: number | null;
  /** Position in the league's scorer list (shared ranks for equal goals). */
  leagueRank: number;
}

/** How this match compares with the other matches of the season. */
export interface MatchProfile {
  /** Share of this season's matches with a lower "big game" score (0..1). */
  percentile: number;
  /** Rank among the matches within 3.5 days of kick-off, biggest first. */
  weekRank: number;
  weekMatches: number;
  /** Absolute rating difference (without home advantage). */
  ratingGap: number;
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
  /** Finished more than 30 days ago: shown as a slim archive page. */
  archived: boolean;
  /**
   * The current page for this pairing, if it is another match: the next
   * upcoming meeting of the two clubs, otherwise their latest one. Archive
   * pages point to it, so search engines and readers find the current match.
   */
  currentMeeting: {
    slug: string;
    utcDate: string;
    upcoming: boolean;
    competitionName: string;
    homeShortName: string;
    awayShortName: string;
  } | null;
  /** Stadium of the home club; null for neutral finals or unknown. */
  venue: string | null;
  profile: MatchProfile | null;
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
  const archived = archivedMatchIds(snapshot).has(m.id);
  const leagues = teamLeagueMap(snapshot);
  const rankingById = new Map(ranking.rows.map((r) => [r.team.id, r]));

  const side = (teamId: number): MatchSide | undefined => {
    const team = snapshot.teams.teams[String(teamId)];
    const league = leagues.get(teamId);
    if (!team || !league) return undefined;
    const table = leagueTable(snapshot, league.slug);
    const row = rankingById.get(teamId);
    const recent = teamMatches(snapshot, team.slug, asOf, { results: 5, fixtures: 0 }).results;
    const code = league.providerCodes.footballData;
    const venue =
      snapshot.clubs?.find((f) => f.competition === code)?.clubs.find((c) => c.teamId === teamId)
        ?.venue ?? null;
    const list = snapshot.scorers?.find((f) => f.competition === code)?.scorers ?? [];
    const scorers = list
      .map((s) => ({ s, leagueRank: 1 + list.filter((o) => o.goals > s.goals).length }))
      .filter(({ s }) => s.teamId === teamId)
      .sort((x, y) => y.s.goals - x.s.goals || x.s.name.localeCompare(y.s.name))
      .slice(0, 3)
      .map(({ s, leagueRank }) => ({
        name: s.name,
        goals: s.goals,
        assists: s.assists,
        penalties: s.penalties,
        leagueRank,
      }));
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
      venue: venue && venue.trim() ? venue.trim() : null,
      scorers,
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
    archived,
    currentMeeting: currentMeeting(snapshot, m, asOf),
    venue: m.stage === "FINAL" ? null : home.venue,
    profile: archived ? null : matchProfile(snapshot, ranking, m),
  };
}

function currentMeeting(
  snapshot: Snapshot,
  match: StoredMatch,
  asOf: Date,
): MatchDetail["currentMeeting"] {
  const slugs = matchSlugs(snapshot);
  const pair = new Set([match.homeTeamId, match.awayTeamId]);
  const now = asOf.getTime();
  const others: { m: StoredMatch; competition: string; slug: string }[] = [];
  for (const file of snapshot.matchFiles) {
    for (const x of file.matches) {
      const slug = slugs.get(x.id);
      if (!slug || x.id === match.id) continue;
      if (!pair.has(x.homeTeamId) || !pair.has(x.awayTeamId)) continue;
      if (x.status === "CANCELLED") continue;
      others.push({ m: x, competition: file.competition, slug });
    }
  }
  const t = (x: StoredMatch) => Date.parse(x.utcDate);
  const upcoming = others
    .filter((o) => t(o.m) >= now && !finished(o.m))
    .sort((a, b) => t(a.m) - t(b.m))[0];
  // Without an upcoming meeting: the latest one, but only if it is newer than this match.
  const latest = others.filter((o) => t(o.m) > t(match)).sort((a, b) => t(b.m) - t(a.m))[0];
  const pick = upcoming ?? latest;
  if (!pick) return null;
  const short = (id: number) => {
    const team = snapshot.teams.teams[String(id)];
    return team?.shortName || team?.name || "Unknown team";
  };
  return {
    slug: pick.slug,
    utcDate: pick.m.utcDate,
    upcoming: pick === upcoming,
    competitionName: COMPETITION_NAME[pick.competition] ?? pick.competition,
    homeShortName: short(pick.m.homeTeamId),
    awayShortName: short(pick.m.awayTeamId),
  };
}

/** "Big game" score as on the predictions page: high when both clubs are strong. */
const bigGameScore = (a: number, b: number) => a + b - Math.abs(a - b);

export function matchProfile(
  snapshot: Snapshot,
  ranking: PowerRanking,
  match: StoredMatch,
): MatchProfile | null {
  const rating = new Map(ranking.rows.map((r) => [r.team.id, r.rating]));
  const rh = rating.get(match.homeTeamId);
  const ra = rating.get(match.awayTeamId);
  if (rh === undefined || ra === undefined) return null;
  const own = bigGameScore(rh, ra);
  // Current season of every competition.
  const latest = new Map<string, number>();
  for (const f of snapshot.matchFiles) {
    latest.set(f.competition, Math.max(latest.get(f.competition) ?? 0, f.season));
  }
  const kickoff = Date.parse(match.utcDate);
  const window = 3.5 * 24 * 3600 * 1000;
  let total = 0;
  let lower = 0;
  let weekMatches = 0;
  let weekHigher = 0;
  for (const f of snapshot.matchFiles) {
    if (f.season !== latest.get(f.competition)) continue;
    for (const x of f.matches) {
      if (x.status === "CANCELLED") continue;
      const a = rating.get(x.homeTeamId);
      const b = rating.get(x.awayTeamId);
      if (a === undefined || b === undefined) continue;
      const score = bigGameScore(a, b);
      total++;
      if (score < own) lower++;
      if (Math.abs(Date.parse(x.utcDate) - kickoff) <= window) {
        weekMatches++;
        if (score > own || (score === own && x.id < match.id)) weekHigher++;
      }
    }
  }
  if (total === 0 || weekMatches === 0) return null;
  return {
    percentile: lower / total,
    weekRank: weekHigher + 1,
    weekMatches,
    ratingGap: Math.abs(rh - ra),
  };
}
