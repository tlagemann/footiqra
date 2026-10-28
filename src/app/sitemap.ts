import type { MetadataRoute } from "next";
import { LEAGUES } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllTeamSlugs } from "@/data";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const paths = [
    "/",
    "/leagues/",
    ...LEAGUES.map((league) => `/leagues/${league.slug}/`),
    "/table-vs-strength/",
    "/methodology/",
    ...(await getAllTeamSlugs()).map((slug) => `/teams/${slug}/`),
  ];
  return paths.map((path) => ({ url: `${base}${path}` }));
}
