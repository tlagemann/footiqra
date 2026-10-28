import type { LeagueSlug } from "./leagues";

/**
 * Starting strength per league, derived from the official UEFA association
 * club coefficients (five-season ranking).
 *
 * Source: UEFA association club coefficients, season 2025/26 (seasons 2021/22 to
 * 2025/26), last updated by UEFA on 2026-07-03, read on 2026-10-28:
 * https://www.uefa.com/nationalassociations/uefarankings/country/?year=2026
 * These values are a published reference point, not a Footiqra estimate.
 * Update them once per season, after UEFA publishes the final ranking.
 */
export const UEFA_COEFFICIENTS = {
  retrieved: "2026-10-28",
  season: "2025/26",
  sourceUrl: "https://www.uefa.com/nationalassociations/uefarankings/country/?year=2026",
  values: {
    "premier-league": 119.519,
    "serie-a": 99.946,
    "la-liga": 97.046,
    bundesliga: 92.902,
    "ligue-1": 83.498,
    "primeira-liga": 73.166,
    eredivisie: 67.929,
  } satisfies Record<LeagueSlug, number>,
} as const;

/** Rating points per UEFA coefficient point when converting to a starting offset. */
export const RATING_POINTS_PER_COEFFICIENT_POINT = 2;

/**
 * Starting offset per league: distance of its coefficient from the average of all
 * covered leagues, times RATING_POINTS_PER_COEFFICIENT_POINT. Offsets sum to zero, so the
 * average team still starts at the base rating.
 */
export function leagueStartingOffsets(
  coefficients: Record<LeagueSlug, number> = UEFA_COEFFICIENTS.values,
  pointsPerCoefficient = RATING_POINTS_PER_COEFFICIENT_POINT,
): Record<LeagueSlug, number> {
  const entries = Object.entries(coefficients) as Array<[LeagueSlug, number]>;
  const mean = entries.reduce((sum, [, v]) => sum + v, 0) / entries.length;
  return Object.fromEntries(
    entries.map(([slug, v]) => [slug, (v - mean) * pointsPerCoefficient]),
  ) as Record<LeagueSlug, number>;
}
