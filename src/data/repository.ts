import { LEAGUES, type LeagueDefinition } from "@/config/leagues";
import type { MatchFile, StoredMatch, StoredTeam, StoreMeta, TeamRegistry } from "@/store/types";

/**
 * Pure query logic over the stored data (no file system access), so it can be
 * unit-tested with in-memory fixtures. src/data/index.ts loads the files.
 */
export interface Snapshot {
  meta: StoreMeta;
  teams: TeamRegistry;
  matchFiles: MatchFile[];
}

export interface TeamSummary {
  slug: string;
  name: string;
  shortName: string | null;
  crest: string | null;
  leagueSlug: string;
}

export interface MatchView {
  id: number;
  utcDate: string;
  status: string;
  competition: string;
  home: { slug: string | null; name: string };
  away: { slug: string | null; name: string };
  homeGoals: number | null;
  awayGoals: number | null;
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

function summary(team: StoredTeam, league: LeagueDefinition): TeamSummary {
  return {
    slug: team.slug,
    name: team.name,
    shortName: team.shortName,
    crest: team.crest,
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
    if (team) result.push(summary(team, league));
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
    return { slug: t?.slug ?? null, name: t?.shortName || t?.name || "Unknown team" };
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
  };
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
