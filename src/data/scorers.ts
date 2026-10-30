import { LEAGUES } from "@/config/leagues";
import { leagueFactor, SCORER_INDEX_V1, scorerIndex } from "@/ranking";
import type { PowerRanking } from "./power-ranking";
import { crestPath, leagueTable, type Snapshot } from "./repository";

export interface LeagueScorer {
  rank: number;
  playerId: number;
  name: string;
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number | null;
  team: { slug: string | null; name: string; crest: string | null };
  leagueSlug: string;
}

export interface LeagueScorers {
  leagueSlug: string;
  season: number;
  fetchedUtc: string;
  scorers: LeagueScorer[];
}

/** League top scorers (provider's list, league goals only); shared ranks for equal goals. */
export function leagueScorers(snapshot: Snapshot, leagueSlug: string): LeagueScorers | undefined {
  const league = LEAGUES.find((l) => l.slug === leagueSlug);
  if (!league) return undefined;
  const file = snapshot.scorers?.find((f) => f.competition === league.providerCodes.footballData);
  if (!file) return undefined;
  const sorted = [...file.scorers].sort(
    (a, b) =>
      b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0) || a.name.localeCompare(b.name),
  );
  return {
    leagueSlug,
    season: file.season,
    fetchedUtc: file.fetchedUtc,
    scorers: sorted.map((s) => {
      const team = snapshot.teams.teams[String(s.teamId)];
      return {
        rank: 1 + sorted.filter((o) => o.goals > s.goals).length,
        playerId: s.playerId,
        name: s.name,
        goals: s.goals,
        assists: s.assists,
        penalties: s.penalties,
        playedMatches: s.playedMatches,
        team: {
          slug: team?.slug ?? null,
          name: team?.shortName || team?.name || "Unknown team",
          crest: crestPath(snapshot, s.teamId),
        },
        leagueSlug,
      };
    }),
  };
}

export interface ScorerIndexRow extends LeagueScorer {
  indexRank: number;
  points: number;
  clubMatches: number;
  leagueFactor: number;
}

export interface ScorerIndex {
  model: string;
  /** Matches every club is scaled to: the most league matches any club has played. */
  referenceMatches: number;
  rows: ScorerIndexRow[];
}

/** Scorer power ranking across all leagues (see ranking/scorer-index.ts). */
export function computeScorerIndex(snapshot: Snapshot, ranking: PowerRanking): ScorerIndex {
  const adjustment = new Map(ranking.leagues.map((l) => [l.leagueSlug, l.currentAdjustment]));
  const played = new Map<string, number>();
  let referenceMatches = 0;
  for (const l of LEAGUES) {
    for (const row of leagueTable(snapshot, l.slug)?.rows ?? []) {
      if (row.team.slug) played.set(row.team.slug, row.playedGames);
      referenceMatches = Math.max(referenceMatches, row.playedGames);
    }
  }
  const rows: ScorerIndexRow[] = [];
  for (const l of LEAGUES) {
    for (const s of leagueScorers(snapshot, l.slug)?.scorers ?? []) {
      const clubMatches = s.team.slug ? (played.get(s.team.slug) ?? 0) : 0;
      const adj = adjustment.get(l.slug) ?? 0;
      const points = scorerIndex(
        { goals: s.goals, penalties: s.penalties, clubMatches, leagueAdjustment: adj },
        referenceMatches,
      );
      if (points === null) continue;
      rows.push({ ...s, indexRank: 0, points, clubMatches, leagueFactor: leagueFactor(adj) });
    }
  }
  rows.sort((a, b) => b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name));
  const shown = (r: ScorerIndexRow) => Math.round(r.points * 10);
  rows.forEach((r, i) => {
    r.indexRank = i > 0 && shown(rows[i - 1]!) === shown(r) ? rows[i - 1]!.indexRank : i + 1;
  });
  return { model: SCORER_INDEX_V1.id, referenceMatches, rows };
}
