import { expectedScore, goalDifferenceMultiplier, normaliseMatches } from "./elo";
import type { RankableMatch } from "./types";

/**
 * Footiqra rating model "elo-v1": Elo with a league strength component.
 *
 *   effective rating = team rating + league adjustment
 *
 * - Every team starts at `baseRating`. Every league starts with a fixed,
 *   documented offset (from UEFA coefficients, see config/league-strength.ts).
 * - Domestic matches update team ratings only. Both teams share the league
 *   adjustment, so it cancels out and domestic results cannot inflate a league.
 * - Matches between teams of different leagues (European competitions) update
 *   the team ratings and, with a smaller step, the two league adjustments
 *   (zero-sum). This is how results in Europe move whole leagues up or down.
 *
 * Pure and deterministic: same input, same output, regardless of input order.
 */
export interface LeagueEloOptions {
  baseRating: number;
  /** Team rating step per match. */
  kFactor: number;
  /** Additional league adjustment step per cross-league match. */
  leagueKFactor: number;
  homeAdvantage: number;
}

export const ELO_V1_OPTIONS: LeagueEloOptions = {
  baseRating: 1500,
  kFactor: 20,
  leagueKFactor: 4,
  homeAdvantage: 65,
};

export const ELO_V1_MODEL_ID = "elo-v1";

export interface LeagueEloResult {
  /** Effective rating per team (team rating + league adjustment). */
  ratings: Map<string, number>;
  matchesPlayed: Map<string, number>;
  /** Current league adjustment (starting offset + changes from European matches). */
  leagueAdjustments: Map<string, number>;
  crossLeagueMatches: number;
  /**
   * Situation before each match, in chronological order: effective rating
   * difference (home minus away, home advantage included). Used to evaluate
   * forecasts against the results that followed.
   */
  preMatch: { matchId: string; ratingDiff: number; homeGoals: number; awayGoals: number }[];
  /**
   * Effective rating of both teams right after each match, in chronological
   * order, plus each team's effective rating before its first match
   * (matchId null). Used for the rating history charts.
   */
  timeline: { teamId: string; matchId: string | null; kickoffUtc: string; rating: number }[];
}

export function computeLeagueElo(
  matches: readonly RankableMatch[],
  teamLeague: ReadonlyMap<string, string>,
  leagueOffsets: Readonly<Record<string, number>>,
  options: Partial<LeagueEloOptions> = {},
): LeagueEloResult {
  const opts = { ...ELO_V1_OPTIONS, ...options };
  const teamRating = new Map<string, number>();
  const leagueAdj = new Map<string, number>(Object.entries(leagueOffsets));
  const matchesPlayed = new Map<string, number>();
  let crossLeagueMatches = 0;
  const preMatch: LeagueEloResult["preMatch"] = [];
  const timeline: LeagueEloResult["timeline"] = [];
  const started = new Set<string>();

  const leagueOf = (teamId: string): string => {
    const league = teamLeague.get(teamId);
    if (!league) throw new Error(`No league known for team ${teamId}`);
    if (!leagueAdj.has(league)) throw new Error(`No starting offset for league ${league}`);
    return league;
  };
  const rating = (teamId: string) => teamRating.get(teamId) ?? opts.baseRating;

  // Every team with a known league appears in the result, even before its first match.
  for (const teamId of teamLeague.keys()) teamRating.set(teamId, opts.baseRating);

  for (const match of normaliseMatches(matches)) {
    const homeLeague = leagueOf(match.homeTeamId);
    const awayLeague = leagueOf(match.awayTeamId);
    const home = rating(match.homeTeamId);
    const away = rating(match.awayTeamId);
    const advantage = match.neutralVenue ? 0 : opts.homeAdvantage;

    const ratingDiff =
      home + leagueAdj.get(homeLeague)! + advantage - (away + leagueAdj.get(awayLeague)!);
    preMatch.push({
      matchId: match.id,
      ratingDiff,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    });
    const expectedHome = expectedScore(ratingDiff, 0);
    const actualHome =
      match.homeGoals > match.awayGoals ? 1 : match.homeGoals < match.awayGoals ? 0 : 0.5;
    const surprise = actualHome - expectedHome;
    const multiplier = goalDifferenceMultiplier(match.homeGoals - match.awayGoals);

    for (const [id, league, r] of [
      [match.homeTeamId, homeLeague, home],
      [match.awayTeamId, awayLeague, away],
    ] as const) {
      if (!started.has(id)) {
        started.add(id);
        timeline.push({
          teamId: id,
          matchId: null,
          kickoffUtc: match.kickoffUtc,
          rating: r + leagueAdj.get(league)!,
        });
      }
    }

    const delta = opts.kFactor * multiplier * surprise;
    teamRating.set(match.homeTeamId, home + delta);
    teamRating.set(match.awayTeamId, away - delta);

    if (homeLeague !== awayLeague) {
      crossLeagueMatches++;
      const leagueDelta = opts.leagueKFactor * multiplier * surprise;
      leagueAdj.set(homeLeague, leagueAdj.get(homeLeague)! + leagueDelta);
      leagueAdj.set(awayLeague, leagueAdj.get(awayLeague)! - leagueDelta);
    }

    for (const id of [match.homeTeamId, match.awayTeamId]) {
      matchesPlayed.set(id, (matchesPlayed.get(id) ?? 0) + 1);
    }
    timeline.push(
      {
        teamId: match.homeTeamId,
        matchId: match.id,
        kickoffUtc: match.kickoffUtc,
        rating: teamRating.get(match.homeTeamId)! + leagueAdj.get(homeLeague)!,
      },
      {
        teamId: match.awayTeamId,
        matchId: match.id,
        kickoffUtc: match.kickoffUtc,
        rating: teamRating.get(match.awayTeamId)! + leagueAdj.get(awayLeague)!,
      },
    );
  }

  const ratings = new Map<string, number>();
  for (const [teamId, r] of teamRating) {
    ratings.set(teamId, r + leagueAdj.get(leagueOf(teamId))!);
  }
  return {
    ratings,
    matchesPlayed,
    leagueAdjustments: leagueAdj,
    crossLeagueMatches,
    preMatch,
    timeline,
  };
}
