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

export interface RankChange {
  /** Places gained since the reference time; negative = dropped. Null if the club had no rating then. */
  week: number | null;
  month: number | null;
}

/** Rank change periods in days. */
export const RANK_CHANGE_DAYS = { week: 7, month: 30 } as const;

/** Power ranking position of every rated club at time `t`, from the rating timeline. */
export function ranksAt(ranking: PowerRanking, t: number): Map<number, number> {
  const ratings = new Map<string, number>();
  for (const row of ranking.rows) {
    const tl = ranking.ratingTimeline.get(row.team.id) ?? [];
    if (tl.length === 0 || Date.parse(tl[0]!.utcDate) > t) continue;
    let value = tl[0]!.rating;
    for (const p of tl) {
      if (Date.parse(p.utcDate) > t) break;
      value = p.rating;
    }
    ratings.set(String(row.team.id), value);
  }
  return new Map(toRanking(ratings).map((e) => [Number(e.teamId), e.rank]));
}

/**
 * Change of every club's published rank against its position 7 and 30 days
 * before `asOf`. Past positions are recomputed from the rating timeline, the
 * same way as the team page chart, so no stored history is needed.
 */
export function rankChanges(ranking: PowerRanking, asOf: string): Map<number, RankChange> {
  const now = Date.parse(asOf);
  const before = (days: number) => ranksAt(ranking, now - days * DAY);
  const week = before(RANK_CHANGE_DAYS.week);
  const month = before(RANK_CHANGE_DAYS.month);
  const diff = (past: Map<number, number>, id: number, rank: number) => {
    const then = past.get(id);
    return then === undefined ? null : then - rank;
  };
  return new Map(
    ranking.rows.map((row) => [
      row.team.id,
      {
        week: diff(week, row.team.id, row.rank),
        month: diff(month, row.team.id, row.rank),
      },
    ]),
  );
}
