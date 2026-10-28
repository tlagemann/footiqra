import { leagueStartingOffsets } from "@/config/league-strength";
import { LEAGUES } from "@/config/leagues";
import {
  computeLeagueElo,
  ELO_V1_MODEL_ID,
  ELO_V1_OPTIONS,
  toRanking,
  type RankableMatch,
} from "@/ranking";
import type { StoredMatch } from "@/store/types";
import {
  allLeagueTeams,
  recentForm,
  teamLeagueMap,
  type FormResult,
  type Snapshot,
  type TeamSummary,
} from "./repository";

export interface PowerRankingRow {
  rank: number;
  rating: number;
  matchesPlayed: number;
  team: TeamSummary;
  /** Last five results across all competitions, oldest first. */
  form: FormResult[];
}

export interface LeagueStrength {
  leagueSlug: string;
  startingOffset: number;
  currentAdjustment: number;
}

export interface PowerRanking {
  model: string;
  rows: PowerRankingRow[];
  leagues: LeagueStrength[];
  matchesUsed: number;
  crossLeagueMatches: number;
}

const LEAGUE_CODES = new Set(LEAGUES.map((l) => l.providerCodes.footballData));

/** Finished, decided in regular time, with a score. Extra time / penalties are excluded for now. */
function isRankable(m: StoredMatch): boolean {
  return (
    m.status === "FINISHED" &&
    m.duration === "REGULAR" &&
    m.homeGoals !== null &&
    m.awayGoals !== null
  );
}

function toRankable(m: StoredMatch): RankableMatch {
  return {
    id: String(m.id),
    kickoffUtc: m.utcDate,
    homeTeamId: String(m.homeTeamId),
    awayTeamId: String(m.awayTeamId),
    homeGoals: m.homeGoals!,
    awayGoals: m.awayGoals!,
  };
}

/**
 * Current-season power ranking across all covered leagues.
 *
 * Uses all league matches of the latest season plus European matches in which
 * BOTH teams belong to one of the covered leagues. Matches against clubs from other
 * countries are not used, because their league strength is unknown to the model.
 */
export function computePowerRanking(snapshot: Snapshot): PowerRanking {
  const leagueOfTeam = teamLeagueMap(snapshot);
  const seasons = new Map<string, number>(); // league code -> latest season
  for (const f of snapshot.matchFiles) {
    if (LEAGUE_CODES.has(f.competition)) {
      seasons.set(f.competition, Math.max(seasons.get(f.competition) ?? 0, f.season));
    }
  }
  const currentSeason = Math.max(0, ...seasons.values());

  const matches: RankableMatch[] = [];
  for (const file of snapshot.matchFiles) {
    const isLeagueFile = LEAGUE_CODES.has(file.competition);
    if (isLeagueFile && file.season !== seasons.get(file.competition)) continue;
    if (!isLeagueFile && file.season !== currentSeason) continue;
    for (const m of file.matches) {
      if (!isRankable(m)) continue;
      if (!leagueOfTeam.has(m.homeTeamId) || !leagueOfTeam.has(m.awayTeamId)) continue;
      matches.push(toRankable(m));
    }
  }

  const teamLeague = new Map(
    [...leagueOfTeam].map(([id, league]) => [String(id), league.slug] as const),
  );
  const offsets = leagueStartingOffsets();
  const result = computeLeagueElo(matches, teamLeague, offsets, ELO_V1_OPTIONS);

  const bySummaryId = new Map<string, TeamSummary>();
  const summaries = allLeagueTeams(snapshot);
  for (const [id, team] of Object.entries(snapshot.teams.teams)) {
    const summary = summaries.find((s) => s.slug === team.slug);
    if (summary) bySummaryId.set(id, summary);
  }

  const form = recentForm(snapshot, 5);
  const rows = toRanking(result.ratings, result.matchesPlayed)
    .filter((entry) => bySummaryId.has(entry.teamId))
    .map((entry) => ({
      rank: entry.rank,
      rating: entry.rating,
      matchesPlayed: entry.matchesPlayed,
      team: bySummaryId.get(entry.teamId)!,
      form: form.get(Number(entry.teamId)) ?? [],
    }));

  const leagues = LEAGUES.map((l) => ({
    leagueSlug: l.slug,
    startingOffset: offsets[l.slug],
    currentAdjustment: result.leagueAdjustments.get(l.slug) ?? offsets[l.slug],
  })).sort((a, b) => b.currentAdjustment - a.currentAdjustment);

  return {
    model: ELO_V1_MODEL_ID,
    rows,
    leagues,
    matchesUsed: matches.length,
    crossLeagueMatches: result.crossLeagueMatches,
  };
}
