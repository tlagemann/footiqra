import { getLeagueBySlug } from "@/config/leagues";
import { ELO_OPTIONS, marginShares, SIM_V1, simulateSeasonWithStakes } from "@/ranking";
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

/** Title, top 4 and bottom 3 chances of one club. */
export interface ZoneChances {
  title: number;
  top4: number;
  bottom3: number;
}

/** How one fixture moves both clubs' chances, from the same simulation runs. */
export interface MatchStakes {
  matchId: number;
  /** Runs per result of this fixture (home win, draw, away win). */
  runs: { home: number; draw: number; away: number };
  /** Chances of the home and away club today and after each result. */
  home: { now: ZoneChances; win: ZoneChances; draw: ZoneChances; loss: ZoneChances };
  away: { now: ZoneChances; win: ZoneChances; draw: ZoneChances; loss: ZoneChances };
}

export interface LeagueProjection {
  leagueSlug: string;
  season: number;
  model: string;
  runs: number;
  remainingMatches: number;
  /** Sorted by expected points, then current position. */
  rows: ProjectionRow[];
  /** Per open fixture, by match id. */
  stakes: Map<number, MatchStakes>;
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

  const open = file.matches.filter((m) => OPEN.has(m.status));
  const fixtures = open.map((m) => ({ homeId: m.homeTeamId, awayId: m.awayTeamId }));
  const margins = file.matches
    .filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null)
    .map((m) => Math.abs(m.homeGoals! - m.awayGoals!));

  const leagueIndex = [...leagueSlug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const { teams: results, stakes: rawStakes } = simulateSeasonWithStakes(
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
    fixtures.map((_, k) => k),
  );

  const n = rows.length;
  const sum = (p: number[], from: number, to: number) =>
    p.slice(from, to).reduce((a, b) => a + b, 0);
  const zones = (counts: number[], total: number): ZoneChances => {
    const p = total > 0 ? counts.map((c) => c / total) : counts.map(() => 0);
    return { title: p[0] ?? 0, top4: sum(p, 0, 4), bottom3: sum(p, n - 3, n) };
  };
  const zonesOf = (positions: number[]): ZoneChances => ({
    title: positions[0] ?? 0,
    top4: sum(positions, 0, 4),
    bottom3: sum(positions, n - 3, n),
  });
  const resultById = new Map(results.map((r) => [r.id, r]));
  const stakes = new Map<number, MatchStakes>();
  for (const st of rawStakes) {
    const m = open[st.fixture]!;
    const hr = resultById.get(m.homeTeamId);
    const ar = resultById.get(m.awayTeamId);
    if (!hr || !ar) continue;
    const [hw, d, aw] = st.runs;
    const c = st.counts;
    stakes.set(m.id, {
      matchId: m.id,
      runs: { home: hw, draw: d, away: aw },
      home: {
        now: zonesOf(hr.positionProbabilities),
        win: zones(c[0]![0]!, hw),
        draw: zones(c[1]![0]!, d),
        loss: zones(c[2]![0]!, aw),
      },
      away: {
        now: zonesOf(ar.positionProbabilities),
        win: zones(c[2]![1]!, aw),
        draw: zones(c[1]![1]!, d),
        loss: zones(c[0]![1]!, hw),
      },
    });
  }
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
    stakes,
  };
}
