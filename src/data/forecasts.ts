import { LEAGUES } from "@/config/leagues";
import {
  ELO_V1_OPTIONS,
  matchProbabilities,
  toPercentages,
  type MatchProbabilities,
} from "@/ranking";
import type { PowerRanking } from "./power-ranking";
import { crestPath, type Snapshot } from "./repository";

export interface ForecastTeam {
  slug: string;
  name: string;
  crest: string | null;
  rating: number;
}

export interface MatchForecast {
  id: number;
  utcDate: string;
  competition: string;
  /** League of the match, null for European competitions. */
  leagueSlug: string | null;
  home: ForecastTeam;
  away: ForecastTeam;
  probabilities: MatchProbabilities;
  /** Whole percentages adding up to 100, for display. */
  percentages: MatchProbabilities;
}

const leagueByCode = new Map(LEAGUES.map((l) => [l.providerCodes.footballData, l.slug]));
const UPCOMING = new Set(["SCHEDULED", "TIMED"]);

/**
 * Forecasts for scheduled matches between two rated clubs, soonest first.
 * Matches against clubs outside the covered leagues have no rating and are skipped.
 */
export function upcomingForecasts(
  snapshot: Snapshot,
  ranking: PowerRanking,
  asOf: Date,
): MatchForecast[] {
  const rated = new Map(ranking.rows.map((r) => [r.team.id, r]));
  const from = asOf.getTime();
  const forecasts: MatchForecast[] = [];

  for (const file of snapshot.matchFiles) {
    for (const m of file.matches) {
      if (!UPCOMING.has(m.status) || Date.parse(m.utcDate) < from) continue;
      const home = rated.get(m.homeTeamId);
      const away = rated.get(m.awayTeamId);
      if (!home || !away) continue;
      const neutral = m.stage === "FINAL";
      const diff = home.rating + (neutral ? 0 : ELO_V1_OPTIONS.homeAdvantage) - away.rating;
      const probabilities = matchProbabilities(diff);
      const team = (r: typeof home): ForecastTeam => ({
        slug: r.team.slug,
        name: r.team.shortName || r.team.name,
        crest: crestPath(snapshot, r.team.id),
        rating: r.rating,
      });
      forecasts.push({
        id: m.id,
        utcDate: m.utcDate,
        competition: file.competition,
        leagueSlug: leagueByCode.get(file.competition) ?? null,
        home: team(home),
        away: team(away),
        probabilities,
        percentages: toPercentages(probabilities),
      });
    }
  }
  return forecasts.sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id);
}

/** Forecasts within `days` after the first one, so a break in the calendar never leaves the page empty. */
export function nextWindow(forecasts: readonly MatchForecast[], days: number): MatchForecast[] {
  const first = forecasts[0];
  if (!first) return [];
  const end = Date.parse(first.utcDate) + days * 24 * 3600 * 1000;
  return forecasts.filter((f) => Date.parse(f.utcDate) < end);
}

/** The most even and highest-rated matches first: a simple "big games" ordering. */
export function biggestMatches(
  forecasts: readonly MatchForecast[],
  limit: number,
): MatchForecast[] {
  const score = (f: MatchForecast) =>
    f.home.rating + f.away.rating - Math.abs(f.home.rating - f.away.rating);
  return [...forecasts].sort((a, b) => score(b) - score(a) || a.id - b.id).slice(0, limit);
}
