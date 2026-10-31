import { getLeagueBySlug } from "@/config/leagues";
import {
  ELO_OPTIONS,
  expectedScore,
  goalRates,
  matchProbabilities,
  scorelineForecast,
  toPercentages,
} from "@/ranking";
import type { PowerRanking } from "./power-ranking";
import type { CalcFixture, CalcTeam } from "@/lib/table-calc";
import { crestPath, leagueTable, type Snapshot } from "./repository";

export interface TableCalculatorData {
  leagueSlug: string;
  season: number;
  teams: CalcTeam[];
  fixtures: CalcFixture[];
}

const OPEN = new Set(["SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED", "IN_PLAY", "PAUSED"]);

/** Most likely score of the most likely outcome (a plain "most likely score" is nearly always 1:1). */
export function tipFor(diff: number, rates: { home: number; away: number }) {
  const probabilities = matchProbabilities(diff);
  const grid = scorelineForecast(probabilities, expectedScore(diff, 0), rates).grid;
  const outcome = (["home", "draw", "away"] as const).reduce((a, b) =>
    probabilities[b] > probabilities[a] ? b : a,
  );
  let best = { home: 0, away: 0, p: -1 };
  grid.forEach((row, h) =>
    row.forEach((p, a) => {
      const o = h > a ? "home" : h === a ? "draw" : "away";
      if (o === outcome && p > best.p) best = { home: h, away: a, p };
    }),
  );
  return { probabilities, tip: { home: best.home, away: best.away } };
}

/** Official table plus every open league fixture of the season, for the table calculator. */
export function tableCalculator(
  snapshot: Snapshot,
  ranking: PowerRanking,
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
  const rating = new Map(ranking.rows.map((r) => [r.team.id, r.rating]));
  const rates = goalRates(file.matches);

  const fixtures: CalcFixture[] = file.matches
    .filter((m) => OPEN.has(m.status) && inTable.has(m.homeTeamId) && inTable.has(m.awayTeamId))
    .map((m) => {
      const rh = rating.get(m.homeTeamId);
      const ra = rating.get(m.awayTeamId);
      const forecast =
        rh !== undefined && ra !== undefined
          ? tipFor(rh + ELO_OPTIONS.homeAdvantage - ra, rates)
          : null;
      return {
        id: m.id,
        matchday: m.matchday,
        utcDate: m.utcDate,
        status: m.status,
        homeId: m.homeTeamId,
        awayId: m.awayTeamId,
        slug: slugs.get(m.id) ?? null,
        percentages: forecast ? toPercentages(forecast.probabilities) : null,
        tip: forecast?.tip ?? null,
      };
    })
    .sort(
      (a, b) =>
        (a.matchday ?? 99) - (b.matchday ?? 99) ||
        Date.parse(a.utcDate) - Date.parse(b.utcDate) ||
        a.id - b.id,
    );

  return { leagueSlug, season: table.season, teams, fixtures };
}
