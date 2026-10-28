import { leagueStartingOffsets } from "@/config/league-strength";
import { LEAGUES } from "@/config/leagues";
import {
  computeMultiSeasonElo,
  ELO_MODEL_ID,
  evaluateForecasts,
  type ForecastRecord,
  ELO_OPTIONS,
  toRanking,
  type RankableMatch,
  type SeasonInput,
} from "@/ranking";
import type { MatchFile, StoredMatch } from "@/store/types";
import {
  allLeagueTeams,
  recentForm,
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
  /** League strength at the start of the current season. */
  startingOffset: number;
  currentAdjustment: number;
}

export interface PowerRanking {
  model: string;
  rows: PowerRankingRow[];
  leagues: LeagueStrength[];
  matchesUsed: number;
  crossLeagueMatches: number;
  /** How well forecasts made before each rated match matched the results. */
  forecastRecord: ForecastRecord | null;
  /** Rating difference (home minus away, home advantage included) before each rated match, by match id. */
  preMatchDiff: ReadonlyMap<number, number>;
  /** Effective rating after every rated match per team id, oldest first (first entry: season start). */
  ratingTimeline: ReadonlyMap<
    number,
    { matchId: number | null; utcDate: string; rating: number }[]
  >;
}

const LEAGUE_BY_CODE = new Map<string, string>(
  LEAGUES.map((l) => [l.providerCodes.footballData, l.slug]),
);

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
 * Rankable matches per season. A season holds the league matches of the covered
 * leagues plus European matches in which BOTH teams play in a covered league that
 * season. Matches against clubs from other countries are not used, because their
 * league strength is unknown to the model.
 */
export function seasonInputs(files: readonly MatchFile[]): SeasonInput[] {
  const bySeason = new Map<number, MatchFile[]>();
  for (const f of files) bySeason.set(f.season, [...(bySeason.get(f.season) ?? []), f]);
  const seasons: SeasonInput[] = [];
  for (const [season, list] of bySeason) {
    const teamLeague = new Map<string, string>();
    for (const f of list) {
      const league = LEAGUE_BY_CODE.get(f.competition);
      if (!league) continue;
      for (const m of f.matches) {
        teamLeague.set(String(m.homeTeamId), league);
        teamLeague.set(String(m.awayTeamId), league);
      }
    }
    if (teamLeague.size === 0) continue;
    const matches: RankableMatch[] = [];
    for (const f of list) {
      for (const m of f.matches) {
        if (!isRankable(m)) continue;
        if (!teamLeague.has(String(m.homeTeamId)) || !teamLeague.has(String(m.awayTeamId))) {
          continue;
        }
        matches.push(toRankable(m));
      }
    }
    seasons.push({ season, matches, teamLeague });
  }
  return seasons.sort((a, b) => a.season - b.season);
}

/**
 * Current-season power ranking across all covered leagues. Earlier seasons (from
 * data/archive and older files in data/matches) only provide the starting ratings.
 */
export function computePowerRanking(snapshot: Snapshot): PowerRanking {
  // Same competition and season in both places: the live file wins.
  const files = new Map<string, MatchFile>();
  for (const f of [...(snapshot.archivedMatchFiles ?? []), ...snapshot.matchFiles]) {
    files.set(`${f.competition}/${f.season}`, f);
  }
  const seasons = seasonInputs([...files.values()]);
  const currentSeason = seasons.at(-1);
  const matches = currentSeason?.matches ?? [];

  const offsets = leagueStartingOffsets();
  const result = computeMultiSeasonElo(
    seasons.length ? seasons : [{ season: 0, matches: [], teamLeague: new Map() }],
    offsets,
    ELO_OPTIONS,
  );

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
    startingOffset: result.startLeagueAdjustments.get(l.slug) ?? offsets[l.slug],
    currentAdjustment: result.leagueAdjustments.get(l.slug) ?? offsets[l.slug],
  })).sort((a, b) => b.currentAdjustment - a.currentAdjustment);

  return {
    model: ELO_MODEL_ID,
    rows,
    leagues,
    matchesUsed: matches.length,
    crossLeagueMatches: result.crossLeagueMatches,
    forecastRecord: evaluateForecasts(result.preMatch),
    preMatchDiff: new Map(result.preMatch.map((p) => [Number(p.matchId), p.ratingDiff])),
    ratingTimeline: groupTimeline(result.timeline),
  };
}

function groupTimeline(
  timeline: readonly {
    teamId: string;
    matchId: string | null;
    kickoffUtc: string;
    rating: number;
  }[],
): Map<number, { matchId: number | null; utcDate: string; rating: number }[]> {
  const byTeam = new Map<number, { matchId: number | null; utcDate: string; rating: number }[]>();
  for (const t of timeline) {
    const id = Number(t.teamId);
    const list = byTeam.get(id) ?? [];
    list.push({
      matchId: t.matchId === null ? null : Number(t.matchId),
      utcDate: t.kickoffUtc,
      rating: t.rating,
    });
    byTeam.set(id, list);
  }
  return byTeam;
}
