import type { PowerRankingRow } from "./power-ranking";
import type { LeagueTable, TeamRef } from "./repository";

/**
 * "Table vs. strength": compares a club's league table position with its
 * position by Footiqra power rating within the same league.
 *
 * Both positions are counted among the clubs that appear in both lists, so a
 * club without a rating does not shift everybody else.
 *
 * gap = strengthPosition - tablePosition
 *   gap > 0  overperforming: higher in the table than its rating suggests
 *   gap < 0  underperforming: lower in the table than its rating suggests
 */
export interface PerformanceGap {
  team: TeamRef & { slug: string };
  leagueSlug: string;
  tablePosition: number;
  strengthPosition: number;
  gap: number;
  points: number;
  rating: number;
}

/** Gaps smaller than this are treated as noise and not highlighted. */
export const MIN_HIGHLIGHT_GAP = 2;

export function tableVsStrength(
  leagueSlug: string,
  table: LeagueTable,
  rankingRows: readonly PowerRankingRow[],
): PerformanceGap[] {
  const ratingBySlug = new Map(
    rankingRows.filter((r) => r.team.leagueSlug === leagueSlug).map((r) => [r.team.slug, r]),
  );
  const tableRows = table.rows
    .filter((r): r is typeof r & { team: { slug: string } } => r.team.slug !== null)
    .filter((r) => ratingBySlug.has(r.team.slug))
    .sort((a, b) => a.position - b.position);

  const byStrength = [...tableRows].sort(
    (a, b) =>
      ratingBySlug.get(b.team.slug)!.rating - ratingBySlug.get(a.team.slug)!.rating ||
      a.position - b.position,
  );
  const strengthPosition = new Map(byStrength.map((r, i) => [r.team.slug, i + 1]));

  return tableRows.map((r, i) => {
    const strength = strengthPosition.get(r.team.slug)!;
    return {
      team: r.team,
      leagueSlug,
      tablePosition: i + 1,
      strengthPosition: strength,
      gap: strength - (i + 1),
      points: r.points,
      rating: ratingBySlug.get(r.team.slug)!.rating,
    };
  });
}

/** Biggest over- and underperformers, strongest gap first, ties by table position. */
export function highlights(
  gaps: readonly PerformanceGap[],
  limit = 3,
): { over: PerformanceGap[]; under: PerformanceGap[] } {
  const over = gaps
    .filter((g) => g.gap >= MIN_HIGHLIGHT_GAP)
    .sort((a, b) => b.gap - a.gap || a.tablePosition - b.tablePosition)
    .slice(0, limit);
  const under = gaps
    .filter((g) => g.gap <= -MIN_HIGHLIGHT_GAP)
    .sort((a, b) => a.gap - b.gap || a.tablePosition - b.tablePosition)
    .slice(0, limit);
  return { over, under };
}

/** Biggest gaps across several leagues. */
export function topAcrossLeagues(
  leagues: readonly { over: PerformanceGap[]; under: PerformanceGap[] }[],
  limit: number,
): { over: PerformanceGap[]; under: PerformanceGap[] } {
  const over = leagues
    .flatMap((l) => l.over)
    .sort((a, b) => b.gap - a.gap || a.tablePosition - b.tablePosition)
    .slice(0, limit);
  const under = leagues
    .flatMap((l) => l.under)
    .sort((a, b) => a.gap - b.gap || a.tablePosition - b.tablePosition)
    .slice(0, limit);
  return { over, under };
}
