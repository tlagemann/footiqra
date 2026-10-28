import { toRanking } from "@/ranking";
import type { PowerRanking } from "./power-ranking";

export interface RankPoint {
  /** End of the week (Monday 23:59:59 UTC) or the data timestamp for the last point. */
  utcDate: string;
  kind: "week" | "today";
  rank: number;
  rating: number;
  /** Change in rank since the previous point; positive = moved up. 0 for the first point. */
  change: number;
}

const DAY = 24 * 3600 * 1000;

/** Weekly checkpoints: every Monday 23:59:59 UTC from the first match until `asOf`. */
export function weeklyCheckpoints(firstUtc: string, asOf: string): number[] {
  const start = new Date(firstUtc);
  start.setUTCHours(23, 59, 59, 0);
  // Move forward to the next Monday (getUTCDay: 0 = Sunday, 1 = Monday).
  while (start.getUTCDay() !== 1) start.setTime(start.getTime() + DAY);
  const end = Date.parse(asOf);
  const points: number[] = [];
  for (let t = start.getTime(); t < end; t += 7 * DAY) points.push(t);
  return points;
}

/**
 * Power ranking position of every rated club at the end of each week, plus
 * today's position. Positions are recomputed from the rating timeline, so no
 * history needs to be stored. A club's rating changes only when it plays; the
 * small drift of league strength between its matches is not replayed.
 */
export function rankHistories(ranking: PowerRanking, asOf: string): Map<number, RankPoint[]> {
  const teams = ranking.rows.map((r) => r.team.id);
  const timelines = new Map(teams.map((id) => [id, ranking.ratingTimeline.get(id) ?? []]));
  const firsts = [...timelines.values()].flatMap((t) => (t[0] ? [Date.parse(t[0].utcDate)] : []));
  const result = new Map<number, RankPoint[]>(teams.map((id) => [id, []]));
  if (firsts.length === 0) return result;

  const ratingAt = (id: number, t: number): number | undefined => {
    const tl = timelines.get(id)!;
    if (tl.length === 0) return undefined;
    let value = tl[0]!.rating;
    for (const p of tl) {
      if (Date.parse(p.utcDate) > t) break;
      value = p.rating;
    }
    return value;
  };

  const checkpoints = weeklyCheckpoints(new Date(Math.min(...firsts)).toISOString(), asOf);
  for (const t of checkpoints) {
    const ratings = new Map<string, number>();
    for (const id of teams) {
      const r = ratingAt(id, t);
      if (r !== undefined) ratings.set(String(id), r);
    }
    for (const entry of toRanking(ratings)) {
      result.get(Number(entry.teamId))!.push({
        utcDate: new Date(t).toISOString(),
        kind: "week",
        rank: entry.rank,
        rating: entry.rating,
        change: 0,
      });
    }
  }
  // Today: exactly the published ranking.
  for (const row of ranking.rows) {
    result.get(row.team.id)!.push({
      utcDate: asOf,
      kind: "today",
      rank: row.rank,
      rating: row.rating,
      change: 0,
    });
  }
  for (const points of result.values()) {
    for (let i = 1; i < points.length; i++) {
      points[i]!.change = points[i - 1]!.rank - points[i]!.rank;
    }
  }
  return result;
}
