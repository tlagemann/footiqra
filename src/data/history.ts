import { LEAGUES } from "@/config/leagues";
import type { PowerRanking } from "./power-ranking";
import { leagueTable, type Snapshot } from "./repository";
import { tableVsStrength } from "./table-vs-strength";

/**
 * Daily history of the ranking, so pages can show changes ("a week ago").
 *
 *   data/history/{YYYY-MM-DD}.json   one file per day, the last run of the day wins
 *
 * Only derived numbers are stored. They can always be recomputed from the
 * match data, but the official table of a past day cannot, so it is recorded.
 */
export interface HistoryTeam {
  slug: string;
  leagueSlug: string;
  powerRank: number;
  rating: number;
  /** Null if the league had no stored table. */
  tablePosition: number | null;
  strengthPosition: number | null;
  /** strengthPosition - tablePosition, see table-vs-strength.ts. */
  gap: number | null;
}

export interface HistoryFile {
  schemaVersion: number;
  /** UTC day of the data the entry describes. */
  date: string;
  dataUtc: string;
  model: string;
  teams: HistoryTeam[];
}

export const HISTORY_SCHEMA_VERSION = 1;

export function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** History entry for the current data, or null when there is nothing to record. */
export function buildHistoryEntry(snapshot: Snapshot, ranking: PowerRanking): HistoryFile | null {
  const dataUtc = snapshot.meta.lastSuccessfulRunUtc;
  if (!dataUtc || ranking.matchesUsed === 0) return null;

  const gapBySlug = new Map<string, { table: number; strength: number; gap: number }>();
  for (const league of LEAGUES) {
    const table = leagueTable(snapshot, league.slug);
    if (!table) continue;
    for (const g of tableVsStrength(league.slug, table, ranking.rows)) {
      gapBySlug.set(g.team.slug, {
        table: g.tablePosition,
        strength: g.strengthPosition,
        gap: g.gap,
      });
    }
  }

  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    date: utcDay(dataUtc),
    dataUtc,
    model: ranking.model,
    teams: ranking.rows.map((r) => {
      const g = gapBySlug.get(r.team.slug);
      return {
        slug: r.team.slug,
        leagueSlug: r.team.leagueSlug,
        powerRank: r.rank,
        rating: Math.round(r.rating * 10) / 10,
        tablePosition: g?.table ?? null,
        strengthPosition: g?.strength ?? null,
        gap: g?.gap ?? null,
      };
    }),
  };
}

/** Newest stored day that is at least `days` days before `today` (both YYYY-MM-DD). */
export function referenceDate(
  dates: readonly string[],
  today: string,
  days = 7,
): string | undefined {
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() - days);
  const max = limit.toISOString().slice(0, 10);
  return [...dates]
    .filter((d) => d <= max)
    .sort()
    .at(-1);
}
