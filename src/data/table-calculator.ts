import { getLeagueBySlug } from "@/config/leagues";
import type { CalcFixture, CalcTeam } from "@/lib/table-calc";
import { crestPath, leagueTable, type Snapshot } from "./repository";

export interface TableCalculatorData {
  leagueSlug: string;
  season: number;
  teams: CalcTeam[];
  fixtures: CalcFixture[];
}

const OPEN = new Set(["SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED", "IN_PLAY", "PAUSED"]);

/** Official table plus every open league fixture of the season, for the table calculator. */
export function tableCalculator(
  snapshot: Snapshot,
  slugs: ReadonlyMap<number, string>,
  leagueSlug: string,
): TableCalculatorData | undefined {
  const league = getLeagueBySlug(leagueSlug);
  const table = leagueTable(snapshot, leagueSlug);
  const standings = snapshot.standings?.find(
    (s) => s.competition === league?.providerCodes.footballData,
  );
  if (!league || !table || !standings) return undefined;
  const file = snapshot.matchFiles.find(
    (f) => f.competition === league.providerCodes.footballData && f.season === table.season,
  );
  if (!file) return undefined;

  const teams: CalcTeam[] = standings.rows.map((r, i) => ({
    id: r.teamId,
    slug: table.rows[i]?.team.slug ?? null,
    name: table.rows[i]?.team.name ?? "Unknown team",
    crest: crestPath(snapshot, r.teamId),
    position: r.position,
    played: r.playedGames,
    won: r.won,
    drawn: r.draw,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    points: r.points,
  }));
  const inTable = new Set(teams.map((t) => t.id));

  const fixtures: CalcFixture[] = file.matches
    .filter((m) => OPEN.has(m.status) && inTable.has(m.homeTeamId) && inTable.has(m.awayTeamId))
    .map((m) => ({
      id: m.id,
      matchday: m.matchday,
      utcDate: m.utcDate,
      status: m.status,
      homeId: m.homeTeamId,
      awayId: m.awayTeamId,
      slug: slugs.get(m.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (a.matchday ?? 99) - (b.matchday ?? 99) ||
        Date.parse(a.utcDate) - Date.parse(b.utcDate) ||
        a.id - b.id,
    );

  return { leagueSlug, season: table.season, teams, fixtures };
}
