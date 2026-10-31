/**
 * Backtest of the season simulation on the finished 2025/26 season.
 *
 *   npx tsx scripts/backtest-season.ts
 *
 * For every league, the season is cut after matchday 8 and 19: ratings and the
 * table at that point, the rest simulated, then scored against the real final
 * table. Variants: the rating step per simulated match (0 = ratings frozen)
 * and the rating step of the live model. Lower log loss = better. Nothing here
 * is used by the website.
 */
import path from "node:path";
import { leagueStartingOffsets } from "@/config/league-strength";
import { LEAGUES } from "@/config/leagues";
import { seasonInputs } from "@/data/power-ranking";
import { ELO_OPTIONS, computeMultiSeasonElo, marginShares, simulateSeason } from "@/ranking";
import { readAllMatchFiles } from "@/store/fs";
import type { MatchFile, StoredMatch } from "@/store/types";

const SEASON = Number(process.env.SEASON ?? 2025);
const CUTS = [8, 19];

const done = (m: StoredMatch) =>
  m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;

function table(matches: StoredMatch[], ids: number[]) {
  const t = new Map(ids.map((id) => [id, { pts: 0, gd: 0, gf: 0 }]));
  for (const m of matches) {
    const h = t.get(m.homeTeamId)!;
    const a = t.get(m.awayTeamId)!;
    const d = m.homeGoals! - m.awayGoals!;
    h.gd += d;
    a.gd -= d;
    h.gf += m.homeGoals!;
    a.gf += m.awayGoals!;
    if (d > 0) h.pts += 3;
    else if (d < 0) a.pts += 3;
    else {
      h.pts++;
      a.pts++;
    }
  }
  return t;
}

async function main() {
  const root = process.cwd();
  const files: MatchFile[] = (await readAllMatchFiles(path.join(root, "data", "archive"))).filter(
    (f) => f.season <= SEASON,
  );
  const offsets = leagueStartingOffsets() as Record<string, number>;
  const variants = [
    { name: "live: model k 20, simulation k 20", k: 20, simK: 20 },
    { name: "simulation k 10", k: 20, simK: 10 },
    { name: "simulation k 0 (frozen)", k: 20, simK: 0 },
    { name: "simulation k 30", k: 20, simK: 30 },
    { name: "model k 15, simulation k 15", k: 15, simK: 15 },
  ];
  const score = variants.map(() => ({ n: 0, pos: 0, b3: 0, top4: 0, swing: 0, swings: 0 }));

  for (const league of LEAGUES) {
    const code = league.providerCodes.footballData;
    const file = files.find((f) => f.competition === code && f.season === SEASON);
    if (!file) continue;
    const ids = [...new Set(file.matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
    const n = ids.length;
    const final = table(file.matches.filter(done), ids);
    const finalOrder = [...ids].sort((a, b) => {
      const x = final.get(a)!;
      const y = final.get(b)!;
      return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf;
    });
    const finalPos = new Map(finalOrder.map((id, i) => [id, i]));

    for (const cut of CUTS) {
      const last = file.matches
        .filter((m) => m.matchday === cut)
        .reduce((d, m) => (m.utcDate > d ? m.utcDate : d), "");
      if (!last) continue;
      const played = file.matches.filter((m) => done(m) && m.utcDate <= last);
      const rest = file.matches.filter((m) => !(done(m) && m.utcDate <= last));
      const now = table(played, ids);
      const cutFiles = files.map((f) =>
        f.season === SEASON ? { ...f, matches: f.matches.filter((m) => m.utcDate <= last) } : f,
      );
      const margins = played.map((m) => Math.abs(m.homeGoals! - m.awayGoals!));

      variants.forEach((v, vi) => {
        const elo = computeMultiSeasonElo(seasonInputs(cutFiles), offsets, { kFactor: v.k });
        const teams = ids.map((id) => ({
          id,
          points: now.get(id)!.pts,
          goalDifference: now.get(id)!.gd,
          rating: elo.ratings.get(String(id)) ?? ELO_OPTIONS.baseRating,
        }));
        const fx = rest.map((m) => ({ homeId: m.homeTeamId, awayId: m.awayTeamId }));
        const res = simulateSeason(teams, fx, {
          runs: 4000,
          seed: 11 + cut,
          homeAdvantage: ELO_OPTIONS.homeAdvantage,
          kFactor: v.simK,
          marginDistribution: marginShares(margins),
        });
        const s = score[vi]!;
        for (const r of res) {
          const fp = finalPos.get(r.id)!;
          const p = r.positionProbabilities;
          const sum = (a: number, b: number) => p.slice(a, b).reduce((x, y) => x + y, 0);
          const clip = (x: number) => Math.min(1 - 1e-4, Math.max(1e-4, x));
          const bin = (prob: number, hit: boolean) => -Math.log(clip(hit ? prob : 1 - prob));
          s.n++;
          s.pos -= Math.log(clip(p[fp]!));
          s.b3 += bin(sum(n - 3, n), fp >= n - 3);
          s.top4 += bin(sum(0, 4), fp < 4);
        }
      });
    }
  }
  console.info(`Season ${SEASON}/${SEASON + 1 - 2000}, cut after matchday ${CUTS.join(" and ")}`);
  console.info(
    "variant                              | final position | bottom 3 | top 4   (log loss, lower = better)",
  );
  variants.forEach((v, i) => {
    const s = score[i]!;
    console.info(
      `${v.name.padEnd(36)} | ${(s.pos / s.n).toFixed(4)}         | ${(s.b3 / s.n).toFixed(4)}   | ${(s.top4 / s.n).toFixed(4)}`,
    );
  });
}

main();
