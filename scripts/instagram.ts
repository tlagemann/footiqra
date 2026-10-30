/**
 * Generates Instagram slides (1080x1350 PNG) and ready-to-paste English captions from the
 * live Footiqra data.
 *
 *   npm run instagram                 # weekly set: top 10, best per league, weekend forecast
 *   npm run instagram -- methodology  # evergreen "How the ranking works" carousel
 *   npm run instagram -- top10 weekend
 *   npm run instagram -- match        # biggest game of the week in detail
 *   npm run instagram -- match --match=liverpool-fc-vs-arsenal-fc-2026-27
 *
 * Output goes to ./instagram-out/ (not committed). Posting stays manual or reviewed.
 * Needs a Chromium: set CHROME_PATH, or run `npx playwright-core install chromium`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  biggestMatches,
  getLastUpdated,
  getLeagueProjection,
  getMatch,
  getPowerRanking,
  getUpcomingForecasts,
  nextWindow,
} from "@/data";
import {
  bestPerLeague,
  matchPreview,
  methodology,
  type MatchPreview,
  top10,
  weekend,
  type Forecast,
  type RankRow,
  type Slides,
} from "./instagram/slides";
import { fileUrl } from "./instagram/styles";

const OUT = join(process.cwd(), "instagram-out");
const WEEKLY = ["top10", "leagues", "weekend"];

const LEAGUE_TAG: Record<string, string> = {
  "Premier League": "#premierleague",
  "La Liga": "#laliga",
  "Serie A": "#seriea",
  Bundesliga: "#bundesliga",
  "Ligue 1": "#ligue1",
  "Primeira Liga": "#primeiraliga",
  Eredivisie: "#eredivisie",
  "Champions League": "#championsleague",
};

const clubTag = (name: string) => `#${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

function matchCaption(m: MatchPreview): string {
  const h = m.home.name;
  const a = m.away.name;
  const fav = m.p.home > m.p.away ? h : a;
  const favP = Math.max(m.p.home, m.p.away);
  const top = m.scores[0]!;
  const pc = (x: number) => `${Math.round(x * 100)}%`;
  const stake = m.stakes[0];
  const stakeLine = stake
    ? `\n\nWhat's at stake: ${stake.team}'s ${stake.zone.toLowerCase()} is ${pc(stake.now)} today. A win takes it to ${pc(stake.win)}, a defeat to ${pc(stake.loss)}.`
    : "";
  const odds = `${h} ${m.p.home}%, draw ${m.p.draw}%, ${a} ${m.p.away}%`;
  const lead =
    Math.abs(m.p.home - m.p.away) < 5
      ? `Too close to call: ${odds}.`
      : favP < 50
        ? `${fav} are slight favourites: ${odds}.`
        : `${fav} are favourites: ${odds}.`;
  return `${h} vs ${a}: the biggest game of the week in Europe's top leagues ⚽\n\n${lead} Most likely score: ${top.home}:${top.away}.${stakeLine}\n\nSwipe for the tale of the tape, likely scores and the season stakes. Full preview: link in bio.\n\n#football #soccer #footballanalytics ${LEAGUE_TAG[m.competition] ?? ""} ${clubTag(h)} ${clubTag(a)} #matchpreview #footballstats`.replace(
    /  +/g,
    " ",
  );
}

/** The week's biggest match (or the one given with --match=slug) as preview data. */
async function loadMatchPreview(slugArg: string | undefined): Promise<MatchPreview> {
  const week = nextWindow(await getUpcomingForecasts(), 7);
  const ranked = biggestMatches(week, week.length);
  const slug = slugArg ?? ranked[0]?.slug;
  if (!slug) throw new Error("No upcoming match with a page.");
  const m = await getMatch(slug);
  if (!m || !m.forecast || !m.home.ranking || !m.away.ranking) {
    throw new Error(`No forecast for ${slug}.`);
  }
  const index = ranked.findIndex((f) => f.id === m.id);
  const stakesData = m.leagueSlug
    ? (await getLeagueProjection(m.leagueSlug))?.stakes.get(m.id)
    : undefined;
  const ZONES = [
    ["title", "Title chance"],
    ["top4", "Top-4 chance"],
    ["bottom3", "Bottom-3 risk"],
  ] as const;
  const stakes: MatchPreview["stakes"] = [];
  if (stakesData) {
    for (const [side, st] of [
      [m.home, stakesData.home],
      [m.away, stakesData.away],
    ] as const) {
      const best = ZONES.map(([key, zone]) => {
        const v = [st.now[key], st.win[key], st.draw[key], st.loss[key]];
        const relevant = Math.max(...v) >= 0.03 && Math.min(...v) <= 0.97;
        return { key, zone, swing: relevant ? Math.abs(st.win[key] - st.loss[key]) : 0 };
      }).sort((x, y) => y.swing - x.swing)[0]!;
      if (best.swing < 0.03) continue;
      stakes.push({
        team: side.shortName,
        crest: side.crest,
        zone: best.zone,
        now: st.now[best.key],
        win: st.win[best.key],
        draw: st.draw[best.key],
        loss: st.loss[best.key],
      });
    }
    stakes.sort((x, y) => Math.abs(y.win - y.loss) - Math.abs(x.win - x.loss));
  }
  const side = (s: typeof m.home) => ({
    name: s.shortName,
    crest: s.crest,
    rank: s.ranking!.rank,
    rating: Math.round(s.ranking!.rating),
    position: s.table?.position ?? null,
    points: s.table?.points ?? null,
    goalsPerGame: s.stats.played > 0 ? s.stats.goalsFor / s.stats.played : null,
    form: s.form,
    scorer: s.scorers[0] ? { name: s.scorers[0].name, goals: s.scorers[0].goals } : null,
  });
  const sc = m.forecast.scorelines;
  return {
    slug: m.slug,
    utcDate: m.utcDate,
    competition: m.competitionName,
    venue: m.venue,
    weekRank: index >= 0 ? index + 1 : (m.profile?.weekRank ?? 0),
    weekMatches: index >= 0 ? ranked.length : (m.profile?.weekMatches ?? 0),
    home: side(m.home),
    away: side(m.away),
    p: m.forecast.percentages,
    xg: sc.expectedGoals,
    scores: sc.top.map((t) => ({ home: t.home, away: t.away, p: t.probability })),
    over25: sc.over25,
    bothScore: sc.bothScore,
    cleanSheet: { home: sc.homeCleanSheet, away: sc.awayCleanSheet },
    stakes,
  };
}

function captionFor(kind: string, rows: RankRow[], games: Forecast[]): string {
  const tags = (more: string) => `#football #soccer #footballanalytics ${more}`;
  if (kind === "top10") {
    const [a, b, c] = rows;
    return `The 10 strongest clubs in Europe right now 📊\n\n${a.name} lead our Power Ranking on ${a.rating}, ahead of ${b.name} and ${c.name}. Seven leagues, one scale, rated with an Elo model that is updated every few hours.\n\nFull ranking of all ${rows.length} clubs, match forecasts and season projections: link in bio.\n\n${tags("#premierleague #laliga #seriea #bundesliga #ligue1 #championsleague #footballstats")}`;
  }
  if (kind === "leagues") {
    const seen = new Set<string>();
    const best = rows.filter((r) => (seen.has(r.league) ? false : (seen.add(r.league), true)));
    const list = best
      .slice(0, 3)
      .map((r) => `${r.name} (#${r.rank})`)
      .join(", ");
    return `Who leads each league on the European scale? 🌍\n\nThe three best leaders: ${list}. Because all leagues share one scale, you can compare clubs across borders.\n\nDetails: link in bio.\n\n${tags("#premierleague #laliga #seriea #bundesliga #ligue1 #eredivisie #primeiraliga")}`;
  }
  if (kind === "weekend") {
    const g = [...games].sort(
      (x, y) => Math.max(y.p.home, y.p.away) - Math.max(x.p.home, x.p.away),
    )[0];
    const fav = g.p.home >= g.p.away ? `${g.home} ${g.p.home}%` : `${g.away} ${g.p.away}%`;
    return `Big games this weekend, by the numbers ⚽\n\nOur model sees the clearest favourite in ${g.home} vs ${g.away}: ${fav}. Draw ${g.p.draw}%. See all five forecasts in the image.\n\nProbabilities come from the Footiqra rating model. All forecasts: link in bio.\n\n${tags("#matchprediction #premierleague #bundesliga #ligue1 #footballstats")}`;
  }
  return `How the Footiqra ranking works 🔍\n\nAn Elo rating for every club, one scale for seven leagues, half of last season carried over, and match forecasts plus season simulations on top. Swipe for the four steps.\n\nEvery parameter is explained in the full methodology: link in bio.\n\n${tags("#elo #datascience #premierleague #laliga #bundesliga #seriea #ligue1")}`;
}

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const kinds = wanted.length ? wanted : WEEKLY;
  const unknown = kinds.filter((k) => ![...WEEKLY, "methodology", "match"].includes(k));
  const matchArg = process.argv.find((a) => a.startsWith("--match="))?.slice(8);
  if (unknown.length) throw new Error(`Unknown post: ${unknown.join(", ")}`);

  const ranking = await getPowerRanking();
  if (ranking.status !== "ok") throw new Error("No ranking data. Run the data update first.");
  const rows: RankRow[] = ranking.data.rows.map((r) => ({
    rank: r.rank,
    name: r.team.shortName || r.team.name,
    league: r.team.leagueSlug,
    crest: r.team.crest,
    rating: Math.round(r.rating),
  }));
  const games: Forecast[] = biggestMatches(nextWindow(await getUpcomingForecasts(), 4), 5).map(
    (f) => ({
      utcDate: f.utcDate,
      home: f.home.name,
      homeCrest: f.home.crest,
      away: f.away.name,
      awayCrest: f.away.crest,
      p: f.percentages,
    }),
  );

  const slides: Slides = {};
  const captions: string[] = [];
  for (const kind of kinds) {
    if (kind === "weekend" && games.length === 0) {
      console.warn("No upcoming matches in the data, skipping the weekend post.");
      continue;
    }
    if (kind === "match") {
      const preview = await loadMatchPreview(matchArg);
      const part = matchPreview(preview);
      Object.assign(slides, part);
      captions.push(`## match (${Object.keys(part).join(", ")})\n\n${matchCaption(preview)}\n`);
      continue;
    }
    const part =
      kind === "top10"
        ? top10(rows)
        : kind === "leagues"
          ? bestPerLeague(rows)
          : kind === "weekend"
            ? weekend(games)
            : methodology();
    Object.assign(slides, part);
    captions.push(
      `## ${kind} (${Object.keys(part).join(", ")})\n\n${captionFor(kind, rows, games)}\n`,
    );
  }

  mkdirSync(OUT, { recursive: true });
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--allow-file-access-from-files"],
  });
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [name, html] of Object.entries(slides)) {
    const file = join(OUT, `${name}.html`);
    writeFileSync(file, html);
    await pg.goto(fileUrl("instagram-out", `${name}.html`));
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: join(OUT, `${name}.png`) });
  }
  await browser.close();
  const stamp = (await getLastUpdated()) ?? "unknown";
  writeFileSync(
    join(OUT, "captions.md"),
    `Data as of ${stamp} (UTC). Review numbers before posting.\n\n${captions.join("\n")}`,
  );
  console.log(`Wrote ${Object.keys(slides).length} slides and captions.md to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
