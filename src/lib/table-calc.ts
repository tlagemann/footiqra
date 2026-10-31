import type { MatchProbabilities } from "@/ranking/forecast";

/**
 * Table calculator: pure logic shared by the page (server) and the
 * interactive calculator (browser).
 */
/** One club in the calculator, with its official table numbers today. */
export interface CalcTeam {
  id: number;
  slug: string | null;
  name: string;
  crest: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Includes any points deduction from the official table. */
  points: number;
}

export interface CalcFixture {
  id: number;
  matchday: number | null;
  utcDate: string;
  status: string;
  homeId: number;
  awayId: number;
  /** Match page, when one exists. */
  slug: string | null;
  /** Win, draw, loss in whole percent; null when a club has no rating. */
  percentages: MatchProbabilities | null;
  /** Model tip: the most likely score of the most likely outcome. */
  tip: { home: number; away: number } | null;
}

export interface CalcRow extends CalcTeam {
  goalDifference: number;
  /** Position today minus position now: positive = moved up. */
  change: number;
}

/**
 * The table after the entered results. Sorted by points, goal difference,
 * goals scored, then name; league specific tie-breakers (head-to-head and
 * so on) are not applied.
 */
export function applyResults(
  teams: readonly CalcTeam[],
  fixtures: readonly CalcFixture[],
  results: ReadonlyMap<number, { home: number; away: number }>,
): CalcRow[] {
  const rows = new Map(
    teams.map((t) => [t.id, { ...t, goalDifference: t.goalsFor - t.goalsAgainst, change: 0 }]),
  );
  for (const f of fixtures) {
    const r = results.get(f.id);
    const h = rows.get(f.homeId);
    const a = rows.get(f.awayId);
    if (!r || !h || !a) continue;
    h.played++;
    a.played++;
    h.goalsFor += r.home;
    h.goalsAgainst += r.away;
    a.goalsFor += r.away;
    a.goalsAgainst += r.home;
    if (r.home > r.away) {
      h.won++;
      a.lost++;
      h.points += 3;
    } else if (r.home < r.away) {
      a.won++;
      h.lost++;
      a.points += 3;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.goalDifference = r.goalsFor - r.goalsAgainst;
  // With nothing entered, keep the official order (it applies the real tie-breakers).
  if (results.size === 0) return list.sort((a, b) => a.position - b.position);
  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name),
  );
  list.forEach((r, i) => (r.change = r.position - (i + 1)));
  return list;
}
