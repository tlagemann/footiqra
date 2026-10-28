import { getLeagueBySlug } from "@/config/leagues";
import { ELO_OPTIONS, marginShares, SIM_V1, simulateSeason } from "@/ranking";
import type { PowerRanking } from "./power-ranking";
import { crestPath, leagueTable, type Snapshot, type TeamRef } from "./repository";

export interface ProjectionRow {
  team: TeamRef & { slug: string };
  currentPosition: number;
  played: number;
  points: number;
  expectedPoints: number;
  positionProbabilities: number[];
  title: number;
  top4: number;
  bottom3: number;
}

export interface LeagueProjection {
  leagueSlug: string;
  season: number;
  model: string;
  runs: number;
  remainingMatches: number;
  /** Sorted by expected points, then current position. */
  rows: ProjectionRow[];
}

const OPEN = new Set(["SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED", "IN_PLAY", "PAUSED"]);

/** Simulates the rest of a league season (see ranking/simulate.ts). */
export function leagueProjection(
  snapshot: Snapshot,
  ranking: PowerRanking,
  leagueSlug: string,
  runs: number = SIM_V1.runs,
): LeagueProjection | undefined {
  const league = getLeagueBySlug(leagueSlug);
  const table = leagueTable(snapshot, leagueSlug);
  if (!league || !table || ranking.matchesUsed === 0) return undefined;

  const code = league.providerCodes.footballData;
  const file = snapshot.matchFiles.find((f) => f.competition === code && f.season === table.season);
  if (!file) return undefined;

  const ratingBySlug = new Map(ranking.rows.map((r) => [r.team.slug, r]));
  const rows = table.rows.filter(
    (r): r is typeof r & { team: { slug: string } } =>
      r.team.slug !== null && ratingBySlug.has(r.team.slug),
  );
  if (rows.length !== table.rows.length) return undefined; // every club needs a rating
  const idBySlug = new Map(rows.map((r) => [r.team.slug, ratingBySlug.get(r.team.slug)!.team.id]));

  const fixtures = file.matches
    .filter((m) => OPEN.has(m.status))
    .map((m) => ({ homeId: m.homeTeamId, awayId: m.awayTeamId }));
  const margins = file.matches
    .filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null)
    .map((m) => Math.abs(m.homeGoals! - m.awayGoals!));

  const leagueIndex = [...leagueSlug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const results = simulateSeason(
    rows.map((r) => ({
      id: idBySlug.get(r.team.slug)!,
      points: r.points,
      goalDifference: r.goalDifference,
      rating: ratingBySlug.get(r.team.slug)!.rating,
    })),
    fixtures,
    {
      runs,
      seed: SIM_V1.seed + leagueIndex,
      homeAdvantage: ELO_OPTIONS.homeAdvantage,
      kFactor: ELO_OPTIONS.kFactor,
      marginDistribution: marginShares(margins),
    },
  );

  const n = rows.length;
  const sum = (p: number[], from: number, to: number) =>
    p.slice(from, to).reduce((a, b) => a + b, 0);
  const projected = rows.map((r, i) => {
    const res = results[i]!;
    const id = idBySlug.get(r.team.slug)!;
    return {
      team: { ...r.team, crest: crestPath(snapshot, id) },
      currentPosition: r.position,
      played: r.playedGames,
      points: r.points,
      expectedPoints: res.expectedPoints,
      positionProbabilities: res.positionProbabilities,
      title: res.positionProbabilities[0] ?? 0,
      top4: sum(res.positionProbabilities, 0, 4),
      bottom3: sum(res.positionProbabilities, n - 3, n),
    };
  });
  projected.sort(
    (a, b) => b.expectedPoints - a.expectedPoints || a.currentPosition - b.currentPosition,
  );

  return {
    leagueSlug,
    season: table.season,
    model: SIM_V1.id,
    runs,
    remainingMatches: fixtures.length,
    rows: projected,
  };
}
