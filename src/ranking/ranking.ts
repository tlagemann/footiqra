import type { RankingEntry } from "./types";

/**
 * Turns a rating map into an ordered ranking.
 * Ties share a rank ("1, 1, 3" style); ties are ordered by team id so the
 * output is deterministic. Ratings are rounded to one decimal for display
 * stability; comparisons use the rounded value so equal-looking ratings tie.
 */
export function toRanking(
  ratings: ReadonlyMap<string, number>,
  matchesPlayed: ReadonlyMap<string, number> = new Map(),
): RankingEntry[] {
  const rows = [...ratings.entries()]
    .map(([teamId, rating]) => ({
      teamId,
      rating: Math.round(rating * 10) / 10,
      matchesPlayed: matchesPlayed.get(teamId) ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.teamId.localeCompare(b.teamId));

  let previousRating: number | undefined;
  let previousRank = 0;
  return rows.map((row, index) => {
    const rank = row.rating === previousRating ? previousRank : index + 1;
    previousRating = row.rating;
    previousRank = rank;
    return { rank, ...row };
  });
}
