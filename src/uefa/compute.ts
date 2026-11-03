import type { Association, Club, LeaguePhasePosition, UefaMatch } from "./parse";
import {
  BONUS_ROUNDS,
  KNOCKOUT_BONUS,
  LEAGUE_PHASE_PARTICIPATION,
  leaguePhaseBonus,
  matchPoints,
  ROUNDS,
  truncate3,
  type Competition,
} from "./rules";

export interface ClubSeason {
  club: string;
  country: string;
  matchPoints: number;
  bonus: number;
  played: number;
}

export interface AssociationSeason {
  code: string;
  /** Clubs that took part (the divisor). */
  clubs: number;
  /** Match and bonus points of all clubs. */
  points: number;
  matches: number;
  coefficient: number;
}

/** Points of every club and the season coefficient of every association with clubs this season. */
export function computeSeason(
  clubs: readonly Club[],
  matches: readonly UefaMatch[],
  leaguePhase: readonly LeaguePhasePosition[],
): { clubs: ClubSeason[]; associations: Map<string, AssociationSeason> } {
  const country = new Map(clubs.map((c) => [c.name, c.country]));
  const byClub = new Map<string, ClubSeason>();
  const entry = (club: string) => {
    let e = byClub.get(club);
    if (!e)
      byClub.set(
        club,
        (e = { club, country: country.get(club)!, matchPoints: 0, bonus: 0, played: 0 }),
      );
    return e;
  };
  /** Rounds each club reached per competition. */
  const reached = new Map<string, Set<string>>();

  for (const m of matches) {
    for (const [club, gf, ga] of [
      [m.home, m.homeGoals, m.awayGoals],
      [m.away, m.awayGoals, m.homeGoals],
    ] as const) {
      const e = entry(club);
      const r = reached.get(club) ?? new Set<string>();
      r.add(`${m.competition}|${m.round}`);
      reached.set(club, r);
      if (gf === null || ga === null) continue;
      e.matchPoints += matchPoints(m.round, gf, ga);
      e.played += 1;
    }
  }

  for (const [club, rounds] of reached) {
    const e = entry(club);
    for (const competition of ["UCL", "UEL", "UECL"] as Competition[]) {
      if (rounds.has(`${competition}|LP`)) e.bonus += LEAGUE_PHASE_PARTICIPATION[competition];
      for (const round of ROUNDS) {
        if (BONUS_ROUNDS.has(round) && rounds.has(`${competition}|${round}`)) {
          e.bonus += KNOCKOUT_BONUS[competition];
        }
      }
    }
  }
  for (const lp of leaguePhase)
    entry(lp.club).bonus += leaguePhaseBonus(lp.competition, lp.position);

  const associations = new Map<string, AssociationSeason>();
  for (const e of byClub.values()) {
    const a = associations.get(e.country) ?? {
      code: e.country,
      clubs: 0,
      points: 0,
      matches: 0,
      coefficient: 0,
    };
    a.clubs += 1;
    a.points += e.matchPoints + e.bonus;
    associations.set(e.country, a);
  }
  // Each match counts once per association that took part in it.
  for (const m of matches) {
    if (m.homeGoals === null) continue;
    const codes = new Set([country.get(m.home)!, country.get(m.away)!]);
    for (const code of codes) associations.get(code)!.matches += 1;
  }
  for (const a of associations.values()) a.coefficient = truncate3(a.points / a.clubs);
  return {
    clubs: [...byClub.values()].sort((a, b) => b.matchPoints + b.bonus - (a.matchPoints + a.bonus)),
    associations,
  };
}

export interface RankingRow {
  association: Association;
  rank: number;
  /** Rank in the ranking one season earlier, if that season is complete in the data. */
  previousRank: number | null;
  /** Season coefficients, oldest first (null = not entered). */
  seasons: (number | null)[];
  total: number;
  /** Points behind the association one place above (null for 1st). */
  gap: number | null;
  /** Current season. */
  clubs: number;
  matches: number;
}

function rankRows<T extends { code: string; values: (number | null)[]; total: number }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    // Tie: most recent season first, then the next most recent where they differ.
    for (let i = a.values.length - 1; i >= 0; i--) {
      const d = (b.values[i] ?? 0) - (a.values[i] ?? 0);
      if (d !== 0) return d;
    }
    return a.code.localeCompare(b.code);
  });
}

/**
 * Five-season ranking for `seasons` (oldest first, the last one is the current
 * season computed from matches). `previousSeason` extends the window one season
 * back for the rank a year ago.
 */
export function computeRanking(
  associations: readonly Association[],
  history: ReadonlyMap<string, ReadonlyMap<string, number>>,
  seasons: readonly string[],
  current: ReadonlyMap<string, AssociationSeason>,
  previousSeason: string | null,
): RankingRow[] {
  const currentSeason = seasons.at(-1)!;
  const value = (code: string, season: string): number | null =>
    season === currentSeason
      ? (current.get(code)?.coefficient ?? 0)
      : (history.get(code)?.get(season) ?? null);
  const truncSum = (values: (number | null)[]) =>
    Math.round(values.reduce<number>((s, v) => s + (v ?? 0), 0) * 1000) / 1000;

  const now = rankRows(
    associations.map((a) => {
      const values = seasons.map((s) => value(a.code, s));
      return { code: a.code, association: a, values, total: truncSum(values) };
    }),
  );

  let previous = new Map<string, number>();
  const window = previousSeason ? [previousSeason, ...seasons.slice(0, -1)] : [];
  const complete =
    window.length > 0 && associations.some((a) => window.every((s) => history.get(a.code)?.has(s)));
  if (complete) {
    const before = rankRows(
      associations.map((a) => {
        const values = window.map((s) => history.get(a.code)?.get(s) ?? null);
        return { code: a.code, values, total: truncSum(values) };
      }),
    );
    previous = new Map(before.map((r, i) => [r.code, i + 1]));
  }

  return now.map((r, i) => ({
    association: r.association,
    rank: i + 1,
    previousRank: previous.get(r.code) ?? null,
    seasons: r.values,
    total: r.total,
    gap: i === 0 ? null : Math.round((now[i - 1]!.total - r.total) * 1000) / 1000,
    clubs: current.get(r.code)?.clubs ?? 0,
    matches: current.get(r.code)?.matches ?? 0,
  }));
}
