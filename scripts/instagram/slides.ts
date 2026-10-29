import { ELO_OPTIONS, SEASON_CARRY_OVER } from "@/ranking/league-elo";
import { SIM_V1 } from "@/ranking/simulate";
import { crest, page } from "./styles";

export interface RankRow {
  rank: number;
  name: string;
  league: string;
  crest: string | null;
  rating: number;
}
export interface Forecast {
  utcDate: string;
  home: string;
  homeCrest: string | null;
  away: string;
  awayCrest: string | null;
  p: { home: number; draw: number; away: number };
}
export type Slides = Record<string, string>;

const LEAGUE: Record<string, string> = {
  "premier-league": "Premier League",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  "primeira-liga": "Primeira Liga",
  eredivisie: "Eredivisie",
};

const row = (r: RankRow) =>
  `<div class="row"><span class="n">${r.rank}</span>${crest(r.crest)}<span class="nm">${r.name}<span class="lg">${LEAGUE[r.league] ?? r.league}</span></span><span class="rt">${r.rating}</span></div>`;

/** Post: Top 10 carousel (cover, list, call to action). */
export function top10(rows: RankRow[]): Slides {
  const lead = rows[0];
  return {
    "top10-1-cover": page(
      `<div class="pad" style="padding-top:200px"><div class="eyebrow">Power Ranking</div><h1>The 10 strongest clubs in Europe right now</h1><p class="sub">Seven leagues, one scale. Rated by Elo, updated every few hours.</p><div class="big" style="margin-top:120px">${lead.rating}</div><p class="sub" style="margin-top:6px">${lead.name} lead the way. Swipe for the full top 10.</p></div>`,
    ),
    "top10-2-list": page(
      `<div class="pad"><div class="eyebrow">Footiqra Power Ranking</div><h2>Top 10</h2><div class="list">${rows.slice(0, 10).map(row).join("")}</div></div>`,
    ),
    "top10-3-cta": page(
      `<div class="cta"><div class="eyebrow">Full ranking</div><h1>All ${rows.length} clubs, rated and compared</h1><p class="sub">Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie on one scale, plus match forecasts and season projections.</p><span class="url">footiqra.com</span></div>`,
    ),
  };
}

/** Post: best club of every league on the European scale. */
export function bestPerLeague(rows: RankRow[]): Slides {
  const seen = new Set<string>();
  const best = rows.filter((r) => (seen.has(r.league) ? false : (seen.add(r.league), true)));
  const max = best[0].rating;
  const min = best[best.length - 1].rating;
  const bar = (v: number) => Math.round(12 + ((v - min) / Math.max(1, max - min)) * 88);
  return {
    "best-per-league": page(
      `<div class="pad"><div class="eyebrow">Best club per league</div><h2>Who leads each league on the European scale?</h2><div class="list">${best
        .map(
          (r) =>
            `<div class="row"><span class="n">${r.rank}</span>${crest(r.crest)}<span class="nm">${r.name}<span class="lg">${LEAGUE[r.league] ?? r.league}</span></span><div class="bar"><i style="width:${bar(r.rating)}%"></i></div><span class="rt" style="width:116px;text-align:right">${r.rating}</span></div>`,
        )
        .join(
          "",
        )}</div><p class="sub" style="margin-top:26px;font-size:26px">Number = rank in the overall Power Ranking.</p></div>`,
    ),
  };
}

/** Post: win/draw/loss probabilities of the biggest games (up to five). */
export function weekend(games: Forecast[]): Slides {
  const when = (d: string) =>
    new Date(d).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  const sorted = [...games].sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  return {
    "weekend-forecast": page(
      `<div class="pad"><div class="eyebrow">Match forecasts</div><h2>Big games this weekend</h2><div class="leg"><span><i style="background:#12c27a"></i>Home win</span><span><i style="background:#3a3f45"></i>Draw</span><span><i style="background:#f5f6f7"></i>Away win</span></div><div style="height:18px"></div>${sorted
        .map(
          (m) =>
            `<div class="m"><div class="meta">${when(m.utcDate)} CET</div><div class="mt"><span class="tm">${crest(m.homeCrest)}${m.home}</span><span class="tm r">${m.away}${crest(m.awayCrest)}</span></div><div class="prob"><div class="ph" style="width:${m.p.home}%">${m.p.home}%</div><div class="pd" style="width:${m.p.draw}%">${m.p.draw}%</div><div class="pa" style="width:${m.p.away}%">${m.p.away}%</div></div></div>`,
        )
        .join("")}</div>`,
    ),
  };
}

/** Evergreen post: how the ranking works. Numbers come from the model constants. */
export function methodology(): Slides {
  const base = ELO_OPTIONS.baseRating;
  const kept = SEASON_CARRY_OVER.share;
  const from = base + 200;
  const card = (title: string, text: string) =>
    `<div class="card"><b>${title}</b><span>${text}</span></div>`;
  const step = (n: number, title: string, intro: string, cards: string) =>
    page(
      `<div class="pad"><div class="step">${n}</div><h2>${title}</h2><p class="sub" style="font-size:34px">${intro}</p>${cards}</div>`,
    );
  return {
    "how-1-cover": page(
      `<div class="pad" style="padding-top:200px"><div class="eyebrow">Methodology</div><h1>How the Footiqra ranking works</h1><p class="sub">Four steps from raw match results to one ranking for seven leagues. Swipe.</p><div class="big" style="margin-top:120px">${base}</div><p class="sub" style="margin-top:6px">The average club rating.</p></div>`,
    ),
    "how-2-elo": step(
      1,
      "Every club has a rating",
      "We use an Elo rating. Before every match the model estimates each side's chance from the rating difference.",
      card("100 points ahead", "means an expected score of about 64%.") +
        card(
          "Surprising result, bigger move",
          "Beat a stronger team or win by more goals and your rating moves further.",
        ) +
        card(
          "Home advantage counts",
          `Playing at home is worth ${ELO_OPTIONS.homeAdvantage} rating points.`,
        ),
    ),
    "how-3-leagues": step(
      2,
      "One scale for all leagues",
      "Within a league everyone plays everyone. Between leagues they do not, so we need a bridge.",
      card(
        "Champions League matches",
        "Results between clubs from different leagues show how strong each league really is.",
      ) +
        card(
          "UEFA coefficients as a start",
          "Each league starts from its UEFA coefficient and is then adjusted by those matches.",
        ),
    ),
    "how-4-season": page(
      `<div class="pad"><div class="step">3</div><h2>A new season keeps half</h2><p class="sub" style="font-size:34px">No hard reset every summer. Each club keeps ${kept === 0.5 ? "half" : `${Math.round(kept * 100)}%`} of its distance from ${base}.</p><div class="eq">Finished on <em>${from}</em><br>starts on <em>${base + (from - base) * kept}</em></div>${card("Promoted clubs", `start ${SEASON_CARRY_OVER.newcomerPenalty} points below the base rating.`)}${card("Why half?", "In our backtest it predicted results clearly better than a reset, without letting last season dominate.")}</div>`,
    ),
    "how-5-forecast": step(
      4,
      "From rating to forecast",
      "The rating difference gives win, draw and loss probabilities for every match.",
      card(
        "Season simulations",
        `We play the rest of each league season ${SIM_V1.runs.toLocaleString("en-US")} times to estimate title, top 4 and relegation chances.`,
      ) +
        card(
          "Updated several times a day",
          "Same results always produce the same ranking. No hidden tweaks.",
        ),
    ),
    "how-6-cta": page(
      `<div class="cta"><div class="eyebrow">Read the details</div><h1>Full methodology, open and explained</h1><p class="sub">Every parameter, the league table and how we test the forecasts.</p><span class="url">footiqra.com/methodology</span></div>`,
    ),
  };
}
