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

/** Everything the match preview carousel shows; built from the match page data. */
export interface MatchPreview {
  slug: string;
  utcDate: string;
  competition: string;
  venue: string | null;
  weekRank: number;
  weekMatches: number;
  home: PreviewSide;
  away: PreviewSide;
  p: { home: number; draw: number; away: number };
  xg: { home: number; away: number };
  scores: { home: number; away: number; p: number }[];
  over25: number;
  bothScore: number;
  cleanSheet: { home: number; away: number };
  /** Season-end chances that this match moves most, one per club at most. */
  stakes: {
    team: string;
    crest: string | null;
    zone: string;
    now: number;
    win: number;
    draw: number;
    loss: number;
  }[];
}
export interface PreviewSide {
  name: string;
  crest: string | null;
  rank: number;
  rating: number;
  position: number | null;
  points: number | null;
  goalsPerGame: number | null;
  form: ("W" | "D" | "L")[];
  scorer: { name: string; goals: number } | null;
}

const PREVIEW_CSS = `<style>
.vs{display:flex;align-items:center;justify-content:space-between;margin-top:70px}
.vs .t{display:flex;flex-direction:column;align-items:center;gap:22px;width:400px;text-align:center;font-family:IT;font-weight:800;font-size:56px;line-height:1.05}
.vs .t img,.vs .t .nocrest{width:190px;height:190px;object-fit:contain}
.vs .x{font-family:IT;font-weight:800;font-size:48px;color:#6b7079}
.when{color:#9aa0a8;font-size:30px;margin-top:56px;text-align:center}
.prob.lg{height:76px;font-size:36px;border-radius:18px;margin-top:40px}
.pl{display:flex;justify-content:space-between;color:#9aa0a8;font-size:26px;margin-top:12px}
.tape{margin-top:40px}
.tr{display:grid;grid-template-columns:1fr 320px 1fr;align-items:center;height:104px;border-top:2px solid #1f2226}
.tr:first-child{border-top:0}
.tr b{font-family:IT;font-weight:800;font-size:46px;font-variant-numeric:tabular-nums}
.tr b.r{text-align:right}.tr span{color:#9aa0a8;font-size:26px;text-align:center}
.tr small{display:block;color:#9aa0a8;font-family:IN;font-weight:400;font-size:24px;margin-top:2px}
.th{display:grid;grid-template-columns:1fr 1fr;margin-top:40px}
.th div{display:flex;align-items:center;gap:16px;font-family:IT;font-weight:800;font-size:40px}
.th div:last-child{justify-content:flex-end}.th img,.th .nocrest{width:64px;height:64px;object-fit:contain}
.fm{display:inline-flex;gap:8px}.fm i{font-style:normal;width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-family:IT;font-weight:800;font-size:22px;color:#0a0a0a}
.fm .W{background:#12c27a}.fm .D{background:#a1a7b0}.fm .L{background:#e5484d;color:#fff}
.sc{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:50px}
.sc div{background:#111214;border:2px solid #1f2226;border-radius:28px;padding:34px 0;text-align:center}
.sc div:first-child{border-color:#12c27a}
.sc b{font-family:IT;font-weight:800;font-size:64px;display:block}
.sc span{color:#9aa0a8;font-size:28px;display:block;margin-top:6px}
.kp{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px}
.kp div{background:#111214;border:2px solid #1f2226;border-radius:28px;padding:30px 30px}
.kp span{color:#9aa0a8;font-size:26px;display:block}
.kp b{font-family:IT;font-weight:800;font-size:58px;display:block;margin-top:6px}
.st{background:#111214;border:2px solid #1f2226;border-radius:28px;padding:34px 40px;margin-top:34px}
.st .hd{display:flex;align-items:center;gap:18px;font-family:IT;font-weight:800;font-size:40px}
.st .hd img,.st .hd .nocrest{width:60px;height:60px;object-fit:contain}
.st .hd em{font-style:normal;color:#9aa0a8;font-family:IN;font-weight:400;font-size:28px;margin-left:auto}
.sg{display:grid;grid-template-columns:repeat(4,1fr);margin-top:24px;text-align:center}
.sg span{color:#9aa0a8;font-size:24px;display:block}
.sg b{font-family:IT;font-weight:800;font-size:56px;display:block;margin-top:4px}
.up{color:#12c27a}.down{color:#e5484d}
</style>`;

const pageP = (inner: string) => page(PREVIEW_CSS + inner);
const pct = (p: number) => `${Math.round(p * 100)}%`;
const ord = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/** Post: one match in detail (cover, tale of the tape, likely scores, stakes, call to action). */
export function matchPreview(m: MatchPreview): Slides {
  const when = new Date(m.utcDate).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const h = m.home;
  const a = m.away;
  const form = (f: PreviewSide["form"]) =>
    `<span class="fm">${f.map((r) => `<i class="${r}">${r}</i>`).join("")}</span>`;
  const tr = (label: string, l: string, r: string) =>
    `<div class="tr"><b>${l}</b><span>${label}</span><b class="r">${r}</b></div>`;
  const tone = (zone: string, v: number, now: number) => {
    const d = v - now;
    if (Math.abs(d) < 0.01) return "";
    return (zone.startsWith("Bottom") ? d < 0 : d > 0) ? "up" : "down";
  };
  return {
    "match-1-cover": pageP(
      `<div class="pad"><div class="eyebrow">Game of the week · #${m.weekRank} of ${m.weekMatches}</div><h2>${h.name} vs ${a.name}</h2><div class="vs"><div class="t">${crest(h.crest)}${h.name}</div><div class="x">vs</div><div class="t">${crest(a.crest)}${a.name}</div></div><p class="when">${when} CET · ${m.competition}${m.venue ? ` · ${m.venue}` : ""}</p><div class="prob lg"><div class="ph" style="width:${m.p.home}%">${m.p.home}%</div><div class="pd" style="width:${m.p.draw}%">${m.p.draw}%</div><div class="pa" style="width:${m.p.away}%">${m.p.away}%</div></div><div class="pl"><span>${h.name} win</span><span>Draw</span><span>${a.name} win</span></div><p class="sub" style="margin-top:110px;font-size:34px">The biggest of ${m.weekMatches} matches in Europe's top leagues this week, by the strength of both clubs. Swipe for the numbers →</p></div>`,
    ),
    "match-2-tape": pageP(
      `<div class="pad"><div class="eyebrow">Tale of the tape</div><h2>Head to head, by the numbers</h2><div class="th"><div>${crest(h.crest)}${h.name}</div><div>${a.name}${crest(a.crest)}</div></div><div class="tape">${[
        tr("Power rank", `#${h.rank}`, `#${a.rank}`),
        tr("Rating", `${h.rating}`, `${a.rating}`),
        h.position && a.position
          ? tr(
              "League",
              `${ord(h.position)}<small>${h.points} pts</small>`,
              `${ord(a.position)}<small>${a.points} pts</small>`,
            )
          : "",
        h.goalsPerGame !== null && a.goalsPerGame !== null
          ? tr("Goals per game", h.goalsPerGame.toFixed(2), a.goalsPerGame.toFixed(2))
          : "",
        tr("Form", form(h.form), form(a.form)),
        h.scorer && a.scorer
          ? tr(
              "Top scorer",
              `${h.scorer.goals}<small>${h.scorer.name}</small>`,
              `${a.scorer.goals}<small>${a.scorer.name}</small>`,
            )
          : "",
      ].join(
        "",
      )}</div><p class="sub" style="font-size:24px;margin-top:20px">Form: last five matches, latest on the right. League goals this season.</p></div>`,
    ),
    "match-3-scores": pageP(
      `<div class="pad"><div class="eyebrow">Match forecast</div><h2>Most likely scores</h2><div class="sc">${m.scores
        .map((s) => `<div><b>${s.home}:${s.away}</b><span>${pct(s.p)}</span></div>`)
        .join(
          "",
        )}</div><div class="kp"><div><span>Expected goals</span><b>${m.xg.home.toFixed(1)} : ${m.xg.away.toFixed(1)}</b></div><div><span>3+ goals</span><b>${pct(m.over25)}</b></div><div><span>Both teams score</span><b>${pct(m.bothScore)}</b></div></div><div class="kp" style="grid-template-columns:repeat(2,1fr)"><div><span>${h.name} clean sheet</span><b>${pct(m.cleanSheet.home)}</b></div><div><span>${a.name} clean sheet</span><b>${pct(m.cleanSheet.away)}</b></div></div><p class="sub" style="margin-top:40px">Exact scores from the same model as the win, draw and loss chances: league scoring levels, adjusted for the strength of both clubs.</p></div>`,
    ),
    ...(m.stakes.length > 0
      ? {
          "match-4-stakes": pageP(
            `<div class="pad"><div class="eyebrow">What's at stake</div><h2>How this game moves the season</h2><p class="sub">Chances at the end of the season, from 10,000 simulations of all remaining matches.</p>${m.stakes
              .map(
                (s) =>
                  `<div class="st"><div class="hd">${crest(s.crest)}${s.team}<em>${s.zone}</em></div><div class="sg"><div><span>Now</span><b>${pct(s.now)}</b></div><div><span>Win</span><b class="${tone(s.zone, s.win, s.now)}">${pct(s.win)}</b></div><div><span>Draw</span><b class="${tone(s.zone, s.draw, s.now)}">${pct(s.draw)}</b></div><div><span>Defeat</span><b class="${tone(s.zone, s.loss, s.now)}">${pct(s.loss)}</b></div></div></div>`,
              )
              .join("")}</div>`,
          ),
        }
      : {}),
    "match-5-cta": page(
      `<div class="cta"><div class="eyebrow">Full match preview</div><h1>Every number for ${h.name} vs ${a.name}</h1><p class="sub">Forecast, likely scores, season stakes, rating trend, top scorers and the biggest games of the week.</p><span class="url">footiqra.com</span></div>`,
    ),
  };
}
