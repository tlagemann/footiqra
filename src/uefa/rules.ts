/**
 * UEFA association coefficient rules for seasons from 2024/25 on
 * (UEFA Champions League regulations, Annex D).
 *
 * - Match points: 2 per win and 1 per draw in the main competition (league
 *   phase onwards, knockout play-offs included); half that (1 / 0.5) in the
 *   qualifying rounds and the play-off round before the league phase.
 * - The result after extra time counts; penalty shoot-outs do not.
 * - Bonus points:
 *   - Champions League league phase participation: 6.
 *   - League phase position (awarded once the league phase is complete):
 *     CL 6 for 1st down to 0.25 for 24th, EL 6 down to 0.25,
 *     ECL 4 for 1st, 0.25 less per place to 2 for 9th, then 0.125 less per
 *     place to 0.125 for 24th. Places 25 to 36 get nothing.
 *   - Every knockout round reached from the round of 16 on (R16, QF, SF,
 *     final): CL 1.5, EL 1, ECL 0.5.
 * - Season coefficient of an association: all points of its clubs divided by
 *   the number of its clubs that took part, to the thousandth, not rounded up.
 * - Ranking: sum of the last five season coefficients; ties go to the higher
 *   coefficient of the most recent season, then the next most recent one.
 */

export const COMPETITIONS = ["UCL", "UEL", "UECL"] as const;
export type Competition = (typeof COMPETITIONS)[number];

/** Rounds in playing order. Q* and PO are qualifying (half points). */
export const ROUNDS = ["PR", "Q1", "Q2", "Q3", "PO", "LP", "KPO", "R16", "QF", "SF", "F"] as const;
export type Round = (typeof ROUNDS)[number];

const QUALIFYING: ReadonlySet<Round> = new Set(["PR", "Q1", "Q2", "Q3", "PO"]);
export const isQualifying = (round: Round) => QUALIFYING.has(round);

/** Rounds that earn the knockout bonus when reached. */
export const BONUS_ROUNDS: ReadonlySet<Round> = new Set(["R16", "QF", "SF", "F"]);

export const KNOCKOUT_BONUS: Record<Competition, number> = { UCL: 1.5, UEL: 1, UECL: 0.5 };
export const LEAGUE_PHASE_PARTICIPATION: Record<Competition, number> = {
  UCL: 6,
  UEL: 0,
  UECL: 0,
};

/** Bonus for the final league phase position (1 to 36). */
export function leaguePhaseBonus(competition: Competition, position: number): number {
  if (!Number.isInteger(position) || position < 1 || position > 36) {
    throw new Error(`League phase position must be 1 to 36, got ${position}`);
  }
  if (position > 24) return 0;
  if (competition !== "UECL") return 6.25 - 0.25 * position;
  return position <= 9 ? 4.25 - 0.25 * position : 2 - 0.125 * (position - 9);
}

/** Points for one result of one club: 2/1/0 in the main competition, half in qualifying. */
export function matchPoints(round: Round, goalsFor: number, goalsAgainst: number): number {
  const full = goalsFor > goalsAgainst ? 2 : goalsFor === goalsAgainst ? 1 : 0;
  return isQualifying(round) ? full / 2 : full;
}

/** To the thousandth, never rounded up. Works on exact sums of halves and quarters. */
export function truncate3(value: number): number {
  return Math.floor(value * 1000 + 1e-9) / 1000;
}
