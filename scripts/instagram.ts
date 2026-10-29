/**
 * Generates Instagram slides (1080x1350 PNG) and ready-to-paste English captions from the
 * live Footiqra data.
 *
 *   npm run instagram                 # weekly set: top 10, best per league, weekend forecast
 *   npm run instagram -- methodology  # evergreen "How the ranking works" carousel
 *   npm run instagram -- top10 weekend
 *
 * Output goes to ./instagram-out/ (not committed). Posting stays manual or reviewed.
 * Needs a Chromium: set CHROME_PATH, or run `npx playwright-core install chromium`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  biggestMatches,
  getLastUpdated,
  getPowerRanking,
  getUpcomingForecasts,
  nextWindow,
} from "@/data";
import {
  bestPerLeague,
  methodology,
  top10,
  weekend,
  type Forecast,
  type RankRow,
  type Slides,
} from "./instagram/slides";
import { fileUrl } from "./instagram/styles";

const OUT = join(process.cwd(), "instagram-out");
const WEEKLY = ["top10", "leagues", "weekend"];

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
  const unknown = kinds.filter((k) => ![...WEEKLY, "methodology"].includes(k));
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
