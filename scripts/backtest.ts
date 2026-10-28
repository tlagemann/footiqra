/**
 * Backtest of rating model variants over several seasons.
 *
 *   npx tsx scripts/backtest.ts
 *
 * Reads past seasons from data/archive/matches and the current season from
 * data/matches. Every variant walks through all matches in date order; before
 * each match the forecast (forecast-v1 draw model) is scored against the result.
 * Lower log loss = better forecasts. Nothing here is used by the website.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { leagueStartingOffsets } from "@/config/league-strength";
import { LEAGUES } from "@/config/leagues";
import { expectedScore, goalDifferenceMultiplier } from "@/ranking/elo";
import { matchProbabilities } from "@/ranking/forecast";

interface M {
  id: number;
  utcDate: string;
  status: string;
  duration: string;
  stage: string;
  matchday: number | null;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
}

const LEAGUE_OF_CODE = new Map(LEAGUES.map((l) => [l.providerCodes.footballData, l.slug]));
const SEASONS = [2024, 2025, 2026];

function readSeason(season: number): { code: string; matches: M[] }[] {
  const base = season === 2026 ? "data/matches" : "data/archive/matches";
  return readdirSync(base)
    .filter((code) => existsSync(path.join(base, code, `${season}.json`)))
    .map((code) => ({
      code,
      matches: JSON.parse(readFileSync(path.join(base, code, `${season}.json`), "utf8")).matches,
    }));
}

interface Game {
  season: number;
  date: string;
  home: number;
  away: number;
  hl: string;
  al: string;
  hg: number;
  ag: number;
  /** League round (1 = first matchday), null for European matches. */
  round: number | null;
}

/** All rankable matches with the league of each team in that season. */
function loadGames(): { games: Game[]; leagueBySeason: Map<number, Map<number, string>> } {
  const games: Game[] = [];
  const leagueBySeason = new Map<number, Map<number, string>>();
  for (const season of SEASONS) {
    const files = readSeason(season);
    const teamLeague = new Map<number, string>();
    for (const f of files) {
      const league = LEAGUE_OF_CODE.get(f.code);
      if (!league) continue;
      for (const m of f.matches) {
        teamLeague.set(m.homeTeamId, league);
        teamLeague.set(m.awayTeamId, league);
      }
    }
    leagueBySeason.set(season, teamLeague);
    for (const f of files) {
      const isLeague = LEAGUE_OF_CODE.has(f.code);
      for (const m of f.matches) {
        if (m.status !== "FINISHED" || m.duration !== "REGULAR") continue;
        if (m.homeGoals === null || m.awayGoals === null) continue;
        const hl = teamLeague.get(m.homeTeamId);
        const al = teamLeague.get(m.awayTeamId);
        if (!hl || !al) continue;
        games.push({
          season,
          date: m.utcDate,
          home: m.homeTeamId,
          away: m.awayTeamId,
          hl,
          al,
          hg: m.homeGoals,
          ag: m.awayGoals,
          round: isLeague ? m.matchday : null,
        });
      }
    }
  }
  games.sort((a, b) => a.date.localeCompare(b.date));
  return { games, leagueBySeason };
}

interface Params {
  name: string;
  k: number;
  home: number;
  leagueK: number;
  /** 1 = reset every team to the base rating each season (current live model). */
  regress: number;
  /** Rating points below base for clubs without a rating in that league last season. */
  newcomer: number;
  /** League strength carried over (true) or reset to the UEFA offsets (false). */
  carryLeague: boolean;
  /** Form: forecast uses rating + form * (rating change over the team's last 5 matches). */
  form: number;
  /** Seasons before this one are ignored (ratings start at the base rating). */
  firstSeason?: number;
  /** Early-season boost: K is multiplied by 1 + boost, fading to 1 over the first boostGames matches. */
  boost?: number;
  boostGames?: number;
}

interface Score {
  n: number;
  loss: number;
  hits: number;
}
const empty = (): Score => ({ n: 0, loss: 0, hits: 0 });

function run(p: Params, games: Game[], leagueBySeason: Map<number, Map<number, string>>) {
  const offsets = leagueStartingOffsets() as Record<string, number>;
  const base = 1500;
  const team = new Map<number, number>();
  const league = new Map<string, number>(Object.entries(offsets));
  const history = new Map<number, number[]>(); // effective team rating after each match
  const played = new Map<number, number>(); // matches this season
  let current = 0;

  const score = {
    s2025: empty(),
    s2026: empty(),
    early2025: empty(),
    early2026: empty(),
    europe: empty(),
  };

  const startSeason = (season: number) => {
    const prev = leagueBySeason.get(season - 1);
    const now = leagueBySeason.get(season)!;
    for (const [id, l] of now) {
      const old = team.get(id);
      const sameLeague = prev?.get(id) === l;
      if (old === undefined || !prev || !sameLeague) {
        // First season, or newcomer (promoted, or moved between covered leagues).
        team.set(id, prev ? base - p.newcomer : base);
      } else {
        team.set(id, base + (1 - p.regress) * (old - base));
      }
    }
    if (!p.carryLeague) for (const [l, v] of Object.entries(offsets)) league.set(l, v);
    history.clear();
    played.clear();
  };

  for (const g of games) {
    if (p.firstSeason && g.season < p.firstSeason) continue;
    if (g.season !== current) {
      current = g.season;
      startSeason(current);
    }
    const formOf = (id: number) => {
      const h = history.get(id) ?? [];
      return h.length >= 6 ? h[h.length - 1]! - h[h.length - 6]! : 0;
    };
    const rh = team.get(g.home)!;
    const ra = team.get(g.away)!;
    const diff =
      rh +
      league.get(g.hl)! +
      p.home -
      (ra + league.get(g.al)!) +
      p.form * (formOf(g.home) - formOf(g.away));

    if (g.season >= 2025) {
      const probs = matchProbabilities(diff);
      const o = g.hg > g.ag ? "home" : g.hg < g.ag ? "away" : "draw";
      const best = (["home", "draw", "away"] as const).reduce((a, b) =>
        probs[b] > probs[a] ? b : a,
      );
      const buckets = [g.season === 2025 ? score.s2025 : score.s2026];
      if (g.hl !== g.al) buckets.push(score.europe);
      if (g.round !== null && g.round <= 8) {
        buckets.push(g.season === 2025 ? score.early2025 : score.early2026);
      }
      for (const b of buckets) {
        b.n++;
        b.loss -= Math.log(probs[o]);
        if (best === o) b.hits++;
      }
    }

    // Update without the form term, exactly like the live model.
    const baseDiff = rh + league.get(g.hl)! + p.home - (ra + league.get(g.al)!);
    const surprise = (g.hg > g.ag ? 1 : g.hg < g.ag ? 0 : 0.5) - expectedScore(baseDiff, 0);
    const mult = goalDifferenceMultiplier(g.hg - g.ag);
    const fade = (id: number) => Math.max(0, 1 - (played.get(id) ?? 0) / (p.boostGames ?? 1));
    const boost = 1 + (p.boost ?? 0) * ((fade(g.home) + fade(g.away)) / 2);
    played.set(g.home, (played.get(g.home) ?? 0) + 1);
    played.set(g.away, (played.get(g.away) ?? 0) + 1);
    const delta = p.k * boost * mult * surprise;
    team.set(g.home, rh + delta);
    team.set(g.away, ra - delta);
    if (g.hl !== g.al) {
      const ld = p.leagueK * mult * surprise;
      league.set(g.hl, league.get(g.hl)! + ld);
      league.set(g.al, league.get(g.al)! - ld);
    }
    for (const [id, l] of [
      [g.home, g.hl],
      [g.away, g.al],
    ] as const) {
      const h = history.get(id) ?? [];
      h.push(team.get(id)! + league.get(l)!);
      history.set(id, h);
    }
  }
  const final = new Map<number, number>();
  for (const [id, l] of leagueBySeason.get(SEASONS.at(-1)!)!)
    final.set(id, team.get(id)! + league.get(l)!);
  return Object.assign(score, { final });
}

const fmt = (s: Score) =>
  s.n ? `${(s.loss / s.n).toFixed(4)} (${((100 * s.hits) / s.n).toFixed(1)}%)` : "-";

const { games, leagueBySeason } = loadGames();
const counts = SEASONS.map((s) => `${s}: ${games.filter((g) => g.season === s).length}`).join(", ");
console.info(`Matches: ${counts}`);

const live: Params = {
  name: "live (reset)",
  k: 20,
  home: 65,
  leagueK: 4,
  regress: 1,
  newcomer: 0,
  carryLeague: false,
  form: 0,
};
const best: Params = { ...live, name: "carry", regress: 0, newcomer: 50, carryLeague: true };
const variants: Params[] = [live, { ...live, name: "live + form 0.5", form: 0.5 }];
const grid = process.argv.includes("--grid");
for (const regress of grid ? [0, 0.1, 0.2, 0.33, 0.5] : [0, 0.1, 0.2])
  for (const newcomer of [25, 50, 75, 100])
    variants.push({ ...best, name: `carry r=${regress} new=${newcomer}`, regress, newcomer });
for (const k of [15, 25, 30]) variants.push({ ...best, name: `carry r=0 new=50 k=${k}`, k });
for (const home of [55, 75])
  variants.push({ ...best, name: `carry r=0 new=50 home=${home}`, home });
for (const leagueK of [2, 8])
  variants.push({ ...best, name: `carry r=0 new=50 leagueK=${leagueK}`, leagueK });
variants.push({ ...best, name: "carry r=0 new=50 league reset", carryLeague: false });
for (const form of [0.25, 0.5, 1])
  variants.push({ ...best, name: `carry r=0 new=50 + form ${form}`, form });
for (const leagueK of [12, 16, 24])
  for (const regress of [0, 0.2])
    variants.push({
      ...best,
      name: `carry r=${regress} new=50 leagueK=${leagueK}`,
      leagueK,
      regress,
    });

if (process.argv.includes("--soft")) {
  const names = JSON.parse(readFileSync("data/teams.json", "utf8")).teams as Record<
    string,
    { name: string }
  >;
  const watch = [
    "FC Bayern München",
    "Paris Saint-Germain FC",
    "FC Barcelona",
    "Arsenal FC",
    "Real Madrid CF",
    "Sporting Clube de Portugal",
    "PSV",
  ];
  const v2: Params = { ...best, leagueK: 12 };
  const soft: Params[] = [
    live,
    { ...v2, name: "v2 full carry (2 seasons)" },
    { ...v2, name: "1 season, r=0", firstSeason: 2025 },
  ];
  for (const regress of [0.33, 0.5, 0.67, 0.8]) {
    soft.push({ ...v2, name: `2 seasons r=${regress}`, regress });
    soft.push({ ...v2, name: `1 season  r=${regress}`, regress, firstSeason: 2025 });
    for (const boost of [1, 2])
      soft.push({
        ...v2,
        name: `1 season  r=${regress} boost ${boost}`,
        regress,
        firstSeason: 2025,
        boost,
        boostGames: 10,
      });
  }
  console.info(
    [
      "variant".padEnd(32),
      "2026/27",
      "2025/26",
      ...watch.map((w) => w.split(" ").slice(0, 2).join(" ").slice(0, 10)),
    ].join(" | "),
  );
  for (const p of soft) {
    const s = run(p, games, leagueBySeason);
    const order = [...s.final].sort((a, b) => b[1] - a[1]).map(([id]) => names[id]?.name);
    console.info(
      [
        p.name.padEnd(32),
        fmt(s.s2026),
        s.s2025.n ? fmt(s.s2025) : "-",
        ...watch.map((w) => String(order.indexOf(w) + 1).padStart(10)),
      ].join(" | "),
    );
  }
  process.exit(0);
}

const rows = variants.map((v) => ({ v, s: run(v, games, leagueBySeason) }));
const total = (s: ReturnType<typeof run>) =>
  (s.s2025.loss + s.s2026.loss) / (s.s2025.n + s.s2026.n);
rows.sort((a, b) => total(a.s) - total(b.s));
console.info(
  "log loss (hit rate)  |  2025/26 all | 2025/26 md 1-8 | 2026/27 all | 2026/27 md 1-8 | both",
);
for (const { v, s } of rows) {
  console.info(
    [
      v.name.padEnd(42),
      fmt(s.s2025),
      fmt(s.early2025),
      fmt(s.s2026),
      fmt(s.early2026),
      total(s).toFixed(4),
      "eu " + fmt(s.europe),
    ].join(" | "),
  );
}

if (process.argv.includes("--top")) {
  const names = JSON.parse(readFileSync("data/teams.json", "utf8")).teams as Record<
    string,
    { name: string }
  >;
  const top = (p: Params) =>
    [...run(p, games, leagueBySeason).final]
      .sort((a, b) => b[1] - a[1])
      .map(([id, r]) => ({ id, r }));
  const a = top(live);
  const pick = process.argv.find((a) => a.startsWith("--lk="));
  const b = top(
    pick
      ? {
          ...best,
          leagueK: Number(pick.slice(5)),
          regress: Number(process.argv.find((a) => a.startsWith("--r="))?.slice(4) ?? 0),
        }
      : best,
  );
  const rankA = new Map(a.map((x, i) => [x.id, i + 1]));
  console.info("\nNew model top 20 (live rank in brackets):");
  b.slice(0, 20).forEach((x, i) =>
    console.info(
      `${String(i + 1).padStart(2)}. ${names[x.id]?.name ?? x.id} ${Math.round(x.r)} (${rankA.get(x.id)})`,
    ),
  );
  const moves = b.map((x, i) => ({
    name: names[x.id]?.name,
    d: rankA.get(x.id)! - (i + 1),
    now: i + 1,
    was: rankA.get(x.id),
  }));
  moves.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  console.info(
    "\nBiggest moves:",
    moves
      .slice(0, 10)
      .map((m) => `${m.name} ${m.was}->${m.now}`)
      .join(", "),
  );
  const spread = (t: { r: number }[]) => Math.round(t[0]!.r - t.at(-1)!.r);
  console.info(`Spread top to bottom: live ${spread(a)}, new ${spread(b)}`);
}
