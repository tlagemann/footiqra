import type { RankableMatch } from "@/ranking/types";
import type { FdMatch } from "./schemas";

export const PROVIDER_ID = "football-data" as const;

/** Namespaced ids keep data from different providers apart. */
export const fdTeamId = (id: number) => `${PROVIDER_ID}:team:${id}`;
export const fdMatchId = (id: number) => `${PROVIDER_ID}:match:${id}`;

export type SkipReason = "not-finished" | "missing-score" | "non-regular-duration";

/**
 * Converts a validated provider match into the ranking engine's input.
 * Returns a skip reason instead of guessing when data is incomplete.
 *
 * Matches decided in extra time or on penalties (cup knockouts) are skipped
 * for now: how they should count is part of the open methodology decision.
 */
export function toRankableMatch(match: FdMatch): RankableMatch | { skipped: SkipReason } {
  if (match.status !== "FINISHED") return { skipped: "not-finished" };
  const { home, away } = match.score.fullTime;
  if (home === null || away === null) return { skipped: "missing-score" };
  if (match.score.duration !== "REGULAR") return { skipped: "non-regular-duration" };

  return {
    id: fdMatchId(match.id),
    kickoffUtc: new Date(match.utcDate).toISOString(),
    homeTeamId: fdTeamId(match.homeTeam.id),
    awayTeamId: fdTeamId(match.awayTeam.id),
    homeGoals: home,
    awayGoals: away,
  };
}
