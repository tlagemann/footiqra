import { LEAGUES, type LeagueDefinition } from "@/config/leagues";
import type {
  MatchFile,
  StandingsFile,
  StoredMatch,
  StoredTeam,
  StoreMeta,
  TeamRegistry,
} from "@/store/types";

/**
 * Pure query logic over the stored data (no file system access), so it can be
 * unit-tested with in-memory fixtures. src/data/index.ts loads the files.
 */
export interface Snapshot {
  meta: StoreMeta;
  teams: TeamRegistry;
  matchFiles: MatchFile[];
  /** Team ids with a self-hosted crest in public/crests (see ingestion/crests.ts). */
  crestIds?: ReadonlySet<number>;
  /** Newest official league table per competition. */
  standings?: StandingsFile[];
}

export type FormResult = "W" | "D" | "L";

export interface TeamSummary {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  /** Local crest path (e.g. /crests/5.png) or null if not available. */
  crest: string | null;
  leagueSlug: string;
}

export interface TeamRef {
  slug: string | null;
  name: string;
  crest: string | null;
}

export interface MatchView {
  id: number;
  utcDate: string;
  status: string;
  competition: string;
  home: TeamRef;
  away: TeamRef;
  homeGoals: number | null;
  awayGoals: number | null;
  /** Match page slug, or null if the match has no page. */
  slug: string | null;
}

const leagueByCode = new Map(LEAGUES.map((l) => [l.providerCodes.footballData, l]));

/** Most recent season file per league competition. */
function latestLeagueFiles(
  snapshot: Snapshot,
): Array<{ league: LeagueDefinition; file: MatchFile }> {
  const latest = new Map<string, MatchFile>();
  for (const file of snapshot.matchFiles) {
    if (!leagueByCode.has(file.competition)) continue;
    const current = latest.get(file.competition);
    if (!current || file.season > current.season) latest.set(file.competition, file);
  }
  return [...latest.values()].map((file) => ({
    league: leagueByCode.get(file.competition)!,
    file,
  }));
}

/** Team id -> league, based on the latest league season each team appears in. */
export function teamLeagueMap(snapshot: Snapshot): Map<number, LeagueDefinition> {
  const map = new Map<number, LeagueDefinition>();
  for (const { league, file } of latestLeagueFiles(snapshot)) {
    for (const m of file.matches) {
      map.set(m.homeTeamId, league);
      map.set(m.awayTeamId, league);
    }
  }
  return map;
}

export function crestPath(snapshot: Snapshot, teamId: number): string | null {
  return snapshot.crestIds?.has(teamId) ? `/crests/${teamId}.png` : null;
}

function summary(snapshot: Snapshot, team: StoredTeam, league: LeagueDefinition): TeamSummary {
  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    shortName: team.shortName,
    crest: crestPath(snapshot, team.id),
    leagueSlug: league.slug,
  };
}

const byName = (a: TeamSummary, b: TeamSummary) => a.name.localeCompare(b.name, "en");

/** All teams of the covered leagues. Teams that only appear in the Champions League are excluded. */
export function allLeagueTeams(snapshot: Snapshot): TeamSummary[] {
  const leagues = teamLeagueMap(snapshot);
  const result: TeamSummary[] = [];
  for (const [id, league] of leagues) {
    const team = snapshot.teams.teams[String(id)];
    if (team) result.push(summary(snapshot, team, league));
  }
  return result.sort(byName);
}

export function teamsOfLeague(snapshot: Snapshot, leagueSlug: string): TeamSummary[] {
  return allLeagueTeams(snapshot).filter((t) => t.leagueSlug === leagueSlug);
}

export function findTeamBySlug(snapshot: Snapshot, slug: string): TeamSummary | undefined {
  return allLeagueTeams(snapshot).find((t) => t.slug === slug);
}

function toView(snapshot: Snapshot, competition: string, m: StoredMatch): MatchView {
  const ref = (id: number) => {
    const t = snapshot.teams.teams[String(id)];
    return {
      slug: t?.slug ?? null,
      name: t?.shortName || t?.name || "Unknown team",
      crest: crestPath(snapshot, id),
    };
  };
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    competition,
    home: ref(m.homeTeamId),
    away: ref(m.awayTeamId),
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    slug: matchSlugs(snapshot).get(m.id) ?? null,
  };
}

const slugCache = new WeakMap<Snapshot, Map<number, string>>();

/**
 * Match pages exist for kick-offs from 30 days before to 14 days after the
 * data timestamp. Far-future pages would be near-duplicates of each other,
 * and interest in a match fades within weeks after it was played.
 */
export const MATCH_PAGE_WINDOW = { pastDays: 30, futureDays: 14 } as const;

/**
 * Stable page slugs for matches that get a page: every match of the current
 * league seasons, and Champions League matches between two clubs of covered
 * leagues. The slug has no date, so a rescheduled match keeps its URL:
 *   {home}-vs-{away}-{2026-27}[-champions-league]
 * In the rare case of a repeat pairing, later matches get their id appended.
 */
export function matchSlugs(snapshot: Snapshot): Map<number, string> {
  const cached = slugCache.get(snapshot);
  if (cached) return cached;
  const leagues = teamLeagueMap(snapshot);
  const latestLeague = new Set(latestLeagueFiles(snapshot).map((x) => x.file));
  const currentSeason = Math.max(0, ...[...latestLeague].map((f) => f.season));
  const candidates: { id: number; base: string; utcDate: string }[] = [];
  for (const file of snapshot.matchFiles) {
    const isLeague = latestLeague.has(file);
    const isEuropean = !leagueByCode.has(file.competition) && file.season === currentSeason;
    if (!isLeague && !isEuropean) continue;
    for (const m of file.matches) {
      const home = snapshot.teams.teams[String(m.homeTeamId)];
      const away = snapshot.teams.teams[String(m.awayTeamId)];
      if (!home || !away) continue;
      if (!leagues.has(m.homeTeamId) || !leagues.has(m.awayTeamId)) continue;
      const season = `${file.season}-${String(file.season + 1).slice(2)}`;
      const suffix = isLeague
        ? ""
        : `-${file.competition === "CL" ? "champions-league" : file.competition.toLowerCase()}`;
      candidates.push({
        id: m.id,
        base: `${home.slug}-vs-${away.slug}-${season}${suffix}`,
        utcDate: m.utcDate,
      });
    }
  }
  candidates.sort((a, b) => a.id - b.id);
  const asOf = Date.parse(snapshot.meta.lastSuccessfulRunUtc ?? "");
  const day = 24 * 3600 * 1000;
  const used = new Set<string>();
  const slugs = new Map<number, string>();
  for (const c of candidates) {
    // Collisions are resolved over all matches, so a slug never changes with the window.
    const slug = used.has(c.base) ? `${c.base}-${c.id}` : c.base;
    used.add(slug);
    const kickoff = Date.parse(c.utcDate);
    const inWindow =
      Number.isFinite(asOf) &&
      kickoff >= asOf - MATCH_PAGE_WINDOW.pastDays * day &&
      kickoff <= asOf + MATCH_PAGE_WINDOW.futureDays * day;
    if (inWindow) slugs.set(c.id, slug);
  }
  slugCache.set(snapshot, slugs);
  return slugs;
}

/** Finished matches (newest first) and upcoming matches (soonest first) of a team, across all stored competitions. */
export function teamMatches(
  snapshot: Snapshot,
  teamSlug: string,
  now: Date,
  limits = { results: 10, fixtures: 5 },
): { results: MatchView[]; fixtures: MatchView[] } {
  const team = Object.values(snapshot.teams.teams).find((t) => t.slug === teamSlug);
  if (!team) return { results: [], fixtures: [] };

  const all: MatchView[] = [];
  for (const file of snapshot.matchFiles) {
    for (const m of file.matches) {
      if (m.homeTeamId === team.id || m.awayTeamId === team.id) {
        all.push(toView(snapshot, file.competition, m));
      }
    }
  }
  const t = now.getTime();
  const results = all
    .filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate) || b.id - a.id)
    .slice(0, limits.results);
  const fixtures = all
    .filter((m) => (m.status === "SCHEDULED" || m.status === "TIMED") && Date.parse(m.utcDate) >= t)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id)
    .slice(0, limits.fixtures);
  return { results, fixtures };
}

/**
 * Last results of every team (newest last), from finished matches in all stored
 * competitions of the current season files. Used for the form column.
 */
export function recentForm(snapshot: Snapshot, length = 5): Map<number, FormResult[]> {
  const matches: StoredMatch[] = [];
  for (const file of snapshot.matchFiles) {
    for (const m of file.matches) {
      if (m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null) matches.push(m);
    }
  }
  matches.sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id);
  const form = new Map<number, FormResult[]>();
  const push = (teamId: number, r: FormResult) => {
    const list = form.get(teamId) ?? [];
    list.push(r);
    if (list.length > length) list.shift();
    form.set(teamId, list);
  };
  for (const m of matches) {
    const h = m.homeGoals!;
    const a = m.awayGoals!;
    push(m.homeTeamId, h > a ? "W" : h < a ? "L" : "D");
    push(m.awayTeamId, a > h ? "W" : a < h ? "L" : "D");
  }
  return form;
}

export interface TableRow {
  position: number;
  team: TeamRef;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Last league results, newest last. */
  form: FormResult[];
}

export interface LeagueTable {
  season: number;
  fetchedUtc: string;
  rows: TableRow[];
}

/** Official table of a league (provider order), or undefined if none is stored. */
export function leagueTable(snapshot: Snapshot, leagueSlug: string): LeagueTable | undefined {
  const league = LEAGUES.find((l) => l.slug === leagueSlug);
  return league ? competitionTable(snapshot, league.providerCodes.footballData) : undefined;
}

/**
 * Official table of any stored competition. Team slugs are only set for clubs
 * that have a team page (clubs of the covered leagues), so tables of European
 * competitions never link to missing pages.
 */
export function competitionTable(snapshot: Snapshot, code: string): LeagueTable | undefined {
  const file = snapshot.standings?.find((s) => s.competition === code);
  if (!file || file.rows.length === 0) return undefined;
  const withPage = teamLeagueMap(snapshot);
  // Form from this competition and season only, like a printed table.
  const form = recentForm({
    ...snapshot,
    matchFiles: snapshot.matchFiles.filter(
      (f) => f.competition === code && f.season === file.season,
    ),
  });
  return {
    season: file.season,
    fetchedUtc: file.fetchedUtc,
    rows: file.rows.map((r) => {
      const t = snapshot.teams.teams[String(r.teamId)];
      return {
        position: r.position,
        team: {
          slug: t && withPage.has(r.teamId) ? t.slug : null,
          name: t?.shortName || t?.name || "Unknown team",
          crest: crestPath(snapshot, r.teamId),
        },
        playedGames: r.playedGames,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: form.get(r.teamId) ?? [],
      };
    }),
  };
}

/** All matches of one stored competition file as views. */
export function competitionMatches(snapshot: Snapshot, file: MatchFile): MatchView[] {
  return file.matches.map((m) => toView(snapshot, file.competition, m));
}
