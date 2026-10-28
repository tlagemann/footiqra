import type { PowerRanking } from "./power-ranking";
import { matchSlugs, type Snapshot } from "./repository";

export interface RatingPoint {
  /** "start": season start, "match": after a match, "today": current value (league strength moved since). */
  kind: "start" | "match" | "today";
  utcDate: string;
  rating: number;
  /** Change caused by this match; 0 for the season start point. */
  change: number;
  /** Null for the season start point. */
  match: {
    opponent: string;
    home: boolean;
    goalsFor: number;
    goalsAgainst: number;
    competition: string;
    slug: string | null;
  } | null;
}

/** Rating after every rated match of one team, oldest first, with match context. */
export function ratingHistory(
  snapshot: Snapshot,
  ranking: PowerRanking,
  teamId: number,
  asOf?: string,
): RatingPoint[] {
  const timeline = ranking.ratingTimeline.get(teamId) ?? [];
  const byId = new Map<
    number,
    { competition: string; m: Snapshot["matchFiles"][number]["matches"][number] }
  >();
  for (const file of snapshot.matchFiles) {
    for (const m of file.matches) byId.set(m.id, { competition: file.competition, m });
  }
  const slugs = matchSlugs(snapshot);
  const points: RatingPoint[] = [];
  let previous: number | null = null;
  for (const t of timeline) {
    const found = t.matchId === null ? undefined : byId.get(t.matchId);
    let match: RatingPoint["match"] = null;
    if (found) {
      const home = found.m.homeTeamId === teamId;
      const opponentId = home ? found.m.awayTeamId : found.m.homeTeamId;
      const opp = snapshot.teams.teams[String(opponentId)];
      match = {
        opponent: opp?.shortName || opp?.name || "Unknown team",
        home,
        goalsFor: (home ? found.m.homeGoals : found.m.awayGoals) ?? 0,
        goalsAgainst: (home ? found.m.awayGoals : found.m.homeGoals) ?? 0,
        competition: found.competition,
        slug: slugs.get(found.m.id) ?? null,
      };
    }
    points.push({
      kind: t.matchId === null ? "start" : "match",
      utcDate: t.utcDate,
      rating: t.rating,
      change: previous === null ? 0 : t.rating - previous,
      match,
    });
    previous = t.rating;
  }
  // League strength also moves with other clubs' European results, so the
  // current rating can differ slightly from the value after the last match.
  const current = ranking.rows.find((r) => r.team.id === teamId)?.rating;
  if (
    asOf &&
    current !== undefined &&
    previous !== null &&
    (Math.abs(current - previous) >= 0.05 || Math.round(current) !== Math.round(previous))
  ) {
    points.push({
      kind: "today",
      utcDate: asOf,
      rating: current,
      change: current - previous,
      match: null,
    });
  }
  return points;
}
