import type { MetadataRoute } from "next";
import { LEAGUES } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllMatchSlugs, getAllTeamSlugs } from "@/data";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const paths = [
    "/",
    "/leagues/",
    "/champions-league/",
    ...LEAGUES.map((league) => `/leagues/${league.slug}/`),
    ...LEAGUES.map((league) => `/leagues/${league.slug}/projection/`),
    "/predictions/",
    "/table-vs-strength/",
    "/methodology/",
    "/impressum/",
    ...(await getAllTeamSlugs()).map((slug) => `/teams/${slug}/`),
    ...(await getAllMatchSlugs()).map((slug) => `/matches/${slug}/`),
  ];
  return paths.map((path) => ({ url: `${base}${path}` }));
}
