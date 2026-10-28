import type { ImageResponse } from "next/og";
import { getLeagueBySlug, leagueCountryList, LEAGUES } from "@/config/leagues";
import {
  biggestMatches,
  getAllMatchSlugs,
  getAllTableVsStrength,
  getAllTeamSlugs,
  getChampionsLeague,
  getLeagueProjection,
  getLeagueTable,
  getMatch,
  getPowerRanking,
  getTeam,
  getTeamRanking,
  getUpcomingForecasts,
  nextWindow,
  topAcrossLeagues,
} from "@/data";
import { genericOg, matchOg, teamOg } from "./templates";

/**
 * Social preview images at fixed URLs, shared by both languages:
 *   /og/home.png, /og/league/{slug}.png, /og/team/{slug}.png, ...
 * Rendered once per build (the images are in English).
 */
export const ogImage = {
  home: "/og/home.png",
  leagues: "/og/leagues.png",
  league: (slug: string) => `/og/league/${slug}.png`,
  projection: (slug: string) => `/og/projection/${slug}.png`,
  team: (slug: string) => `/og/team/${slug}.png`,
  match: (slug: string) => `/og/match/${slug}.png`,
  predictions: "/og/predictions.png",
  tableVsStrength: "/og/table-vs-strength.png",
  methodology: "/og/methodology.png",
  championsLeague: "/og/champions-league.png",
  legal: "/og/legal.png",
  privacy: "/og/privacy.png",
};

const SINGLE = [
  "home",
  "leagues",
  "predictions",
  "table-vs-strength",
  "methodology",
  "champions-league",
  "legal",
  "privacy",
] as const;

/** All image paths as route params, without the leading "/og/". */
export async function ogParams(): Promise<{ file: string[] }[]> {
  const [teams, matches] = await Promise.all([getAllTeamSlugs(), getAllMatchSlugs()]);
  return [
    ...SINGLE.map((name) => [`${name}.png`]),
    ...LEAGUES.map((l) => ["league", `${l.slug}.png`]),
    ...LEAGUES.map((l) => ["projection", `${l.slug}.png`]),
    ...teams.map((s) => ["team", `${s}.png`]),
    ...matches.map((s) => ["match", `${s}.png`]),
  ].map((file) => ({ file }));
}

const pct = (p: number) => (p < 0.005 ? "<1%" : `${Math.round(p * 100)}%`);

export async function renderOgImage(file: string[]): Promise<ImageResponse | null> {
  const [first, second] = file;
  const name = (second ?? first ?? "").replace(/\.png$/, "");
  const kind = second ? first : name;

  switch (kind) {
    case "home": {
      const ranking = await getPowerRanking();
      const top = ranking.status === "ok" ? ranking.data.rows.slice(0, 3) : [];
      return genericOg({
        eyebrow: "Cross-league power ranking",
        title: "Every top club. One ranking.",
        teams: top.map((r) => ({
          name: r.team.shortName || r.team.name,
          crest: r.team.crest,
          value: `#${r.rank}`,
          sub: `Rating ${Math.round(r.rating)}`,
        })),
      });
    }
    case "leagues":
      return genericOg({
        eyebrow: `${LEAGUES.length} leagues`,
        title: "Europe's top leagues on one scale",
        subtitle: `Tables, power ranking and predicted final tables for ${leagueCountryList()}.`,
      });
    case "league": {
      const league = getLeagueBySlug(name);
      if (!league) return null;
      const [ranking, table] = await Promise.all([getPowerRanking(), getLeagueTable(league.slug)]);
      const rows =
        ranking.status === "ok"
          ? ranking.data.rows.filter((r) => r.team.leagueSlug === league.slug)
          : [];
      return genericOg({
        eyebrow: league.country,
        title: league.name,
        subtitle: table
          ? `Table, power ranking and predictions. Leader: ${table.rows[0]?.team.name} with ${table.rows[0]?.points} points.`
          : "Table, power ranking and predictions.",
        teams: rows.slice(0, 3).map((r, i) => ({
          name: r.team.shortName || r.team.name,
          crest: r.team.crest,
          value: String(Math.round(r.rating)),
          sub: `#${i + 1} by strength`,
        })),
      });
    }
    case "projection": {
      const league = getLeagueBySlug(name);
      if (!league) return null;
      const projection = await getLeagueProjection(league.slug);
      const contenders = [...(projection?.rows ?? [])]
        .sort((a, b) => b.title - a.title)
        .slice(0, 3);
      return genericOg({
        eyebrow: `${league.name} · predicted table`,
        title: `Who wins the ${league.name}?`,
        subtitle: projection
          ? `Title chances from ${projection.runs.toLocaleString("en-GB")} simulated seasons`
          : undefined,
        teams: contenders.map((r) => ({
          name: r.team.name,
          crest: r.team.crest,
          value: pct(r.title),
          sub: `${Math.round(r.expectedPoints)} expected points`,
        })),
      });
    }
    case "team": {
      const result = await getTeam(name);
      if (result.status !== "ok") return genericOg({ eyebrow: "Teams", title: "Footiqra" });
      const team = result.data.team;
      const [ranking, table] = await Promise.all([
        getTeamRanking(name),
        getLeagueTable(team.leagueSlug),
      ]);
      return teamOg({
        name: team.name,
        crest: team.crest,
        league: getLeagueBySlug(team.leagueSlug)?.name ?? "Europe",
        rank: ranking?.rank ?? null,
        rating: ranking?.rating ?? null,
        tablePosition: table?.rows.find((r) => r.team.slug === team.slug)?.position ?? null,
        form: ranking?.form ?? [],
      });
    }
    case "match": {
      const m = await getMatch(name);
      if (!m) return genericOg({ eyebrow: "Matches", title: "Footiqra" });
      const finished = m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;
      return matchOg({
        competition: m.competitionName,
        dateLabel: new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(m.utcDate)),
        home: { name: m.home.shortName, crest: m.home.crest },
        away: { name: m.away.shortName, crest: m.away.crest },
        score: finished ? `${m.homeGoals}:${m.awayGoals}` : null,
        percentages: m.forecast?.percentages ?? null,
        forecastLabel:
          m.forecast?.basis === "pre-match"
            ? "Pre-match forecast by the Footiqra model"
            : "Forecast by the Footiqra model, not betting advice",
      });
    }
    case "predictions": {
      const big = biggestMatches(nextWindow(await getUpcomingForecasts(), 7), 1)[0];
      return genericOg({
        eyebrow: "Match forecasts",
        title: "This week's predictions",
        subtitle: big
          ? `Big game: ${big.home.name} vs ${big.away.name}. ${big.home.name} ${big.percentages.home}%, draw ${big.percentages.draw}%, ${big.away.name} ${big.percentages.away}%.`
          : "Win, draw and loss probabilities from the Footiqra rating model.",
      });
    }
    case "table-vs-strength": {
      const { over } = topAcrossLeagues(await getAllTableVsStrength(10), 3);
      return genericOg({
        eyebrow: "Table vs. strength",
        title: "Who is punching above their weight?",
        teams: over.map((g) => ({
          name: g.team.name,
          crest: g.team.crest,
          value: `+${g.gap}`,
          sub: getLeagueBySlug(g.leagueSlug)?.name ?? "",
        })),
      });
    }
    case "methodology":
      return genericOg({
        eyebrow: "Methodology",
        title: "How the ranking works",
        subtitle:
          "Elo ratings with home advantage and margin of victory, league strength from UEFA coefficients and European results, match forecasts and season simulations.",
      });
    case "champions-league": {
      const cl = await getChampionsLeague();
      return genericOg({
        eyebrow: "Europe",
        title: "Champions League",
        subtitle: "League phase table, predictions and the strongest clubs",
        teams: (cl.table?.rows.slice(0, 3) ?? []).map((r) => ({
          name: r.team.name,
          crest: r.team.crest,
          value: `${r.points} pts`,
          sub: `${r.position}. in the league phase`,
        })),
      });
    }
    case "legal":
      return genericOg({ eyebrow: "Legal notice", title: "Impressum" });
    case "privacy":
      return genericOg({
        eyebrow: "Privacy policy",
        title: "Datenschutz",
        subtitle: "No cookies, no tracking, no third-party content.",
      });
    default:
      return null;
  }
}
