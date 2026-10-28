import { slugify } from "@/lib/slug";
import type { FdMatch, FdTeamRef } from "@/ingestion/providers/football-data/schemas";
import { STORE_SCHEMA_VERSION } from "./types";
import type { MatchFile, StoredMatch, StoredTeam, TeamRegistry } from "./types";

/** Converts a validated provider match into its stored form. */
export function toStoredMatch(match: FdMatch): StoredMatch {
  return {
    id: match.id,
    utcDate: new Date(match.utcDate).toISOString(),
    status: match.status,
    matchday: match.matchday,
    stage: match.stage,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeGoals: match.score.fullTime.home,
    awayGoals: match.score.fullTime.away,
    duration: match.score.duration,
    winner: match.score.winner,
    lastUpdated: new Date(match.lastUpdated).toISOString(),
  };
}

export interface MergeStats {
  added: number;
  updated: number;
  unchanged: number;
}

function sameMatch(a: StoredMatch, b: StoredMatch): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Upserts incoming matches by id. A stored match is only replaced by a version
 * whose `lastUpdated` is the same or newer, so an out-of-date response can never
 * overwrite fresher data. Output is sorted by kick-off, then id (stable diffs).
 */
export function mergeMatches(
  existing: readonly StoredMatch[],
  incoming: readonly StoredMatch[],
): { matches: StoredMatch[]; stats: MergeStats } {
  const byId = new Map(existing.map((m) => [m.id, m]));
  const stats: MergeStats = { added: 0, updated: 0, unchanged: 0 };

  for (const next of incoming) {
    const current = byId.get(next.id);
    if (!current) {
      byId.set(next.id, next);
      stats.added++;
    } else if (
      sameMatch(current, next) ||
      Date.parse(next.lastUpdated) < Date.parse(current.lastUpdated)
    ) {
      stats.unchanged++;
    } else {
      byId.set(next.id, next);
      stats.updated++;
    }
  }

  const matches = [...byId.values()].sort(
    (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id,
  );
  return { matches, stats };
}

export function emptyMatchFile(competition: string, season: number): MatchFile {
  return { schemaVersion: STORE_SCHEMA_VERSION, competition, season, matches: [] };
}

export function emptyTeamRegistry(): TeamRegistry {
  return { schemaVersion: STORE_SCHEMA_VERSION, teams: {} };
}

/**
 * Adds new teams and refreshes names/crests of known ones.
 * Slugs are assigned once and never changed, so URLs stay stable even if a
 * provider renames a club. New slugs never collide with existing ones.
 */
export function upsertTeams(registry: TeamRegistry, refs: readonly FdTeamRef[]): TeamRegistry {
  const teams: Record<string, StoredTeam> = { ...registry.teams };
  const usedSlugs = new Set(Object.values(teams).map((t) => t.slug));

  const uniqueRefs = [...new Map(refs.map((r) => [r.id, r])).values()].sort((a, b) => a.id - b.id);
  for (const ref of uniqueRefs) {
    const key = String(ref.id);
    const known = teams[key];
    const details = {
      name: ref.name,
      shortName: ref.shortName ?? null,
      tla: ref.tla ?? null,
      crest: ref.crest ?? null,
    };
    if (known) {
      teams[key] = { ...known, ...details };
      continue;
    }
    const base = slugify(ref.name) || `team-${ref.id}`;
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);
    teams[key] = { id: ref.id, ...details, slug };
  }

  // Sorted keys keep the JSON file diff-friendly.
  const sorted = Object.fromEntries(
    Object.entries(teams).sort(([a], [b]) => Number(a) - Number(b)),
  );
  return { schemaVersion: STORE_SCHEMA_VERSION, teams: sorted };
}

/**
 * Season start year for a date: football seasons in Europe start in summer.
 * Used only as the default when no season is configured.
 */
export function currentSeasonStartYear(now: Date): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? year : year - 1; // July or later -> new season
}
