import type { RankingEntry } from "@/ranking/types";

/**
 * Read layer used by pages. Pages never talk to the football API or to SQL directly;
 * they call these functions. In Phase 2 the bodies switch from "unavailable" to
 * PostgreSQL queries, without changes to the page components.
 *
 * Phase 1: there is deliberately no data source yet, so every function reports
 * "unavailable" instead of returning invented numbers.
 */

export type DataResult<T> =
  { status: "ok"; data: T; lastUpdatedUtc: string } | { status: "unavailable"; reason: string };

export interface PublicTeam {
  slug: string;
  name: string;
  leagueSlug: string;
}

export interface PublicRankingRow extends RankingEntry {
  team: PublicTeam;
}

const NOT_CONNECTED = "Live data integration has not been set up yet (project phase 1).";

export async function getPowerRanking(): Promise<DataResult<PublicRankingRow[]>> {
  return { status: "unavailable", reason: NOT_CONNECTED };
}

export async function getLeagueTeams(leagueSlug: string): Promise<DataResult<PublicTeam[]>> {
  void leagueSlug;
  return { status: "unavailable", reason: NOT_CONNECTED };
}

export async function getTeam(slug: string): Promise<DataResult<PublicTeam>> {
  void slug;
  return { status: "unavailable", reason: NOT_CONNECTED };
}

/** Slugs to prerender at build time. Empty until teams exist in the database. */
export async function getAllTeamSlugs(): Promise<string[]> {
  return [];
}
