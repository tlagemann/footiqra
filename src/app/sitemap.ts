import type { MetadataRoute } from "next";
import { LEAGUES } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllMatchSlugs, getAllTeamSlugs } from "@/data";
import { paths, type Locale } from "@/i18n";

export const dynamic = "force-static";

/**
 * Every page in both languages. Each entry lists its English and German
 * version plus x-default (English), so search engines see the language pairs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [teams, matches] = await Promise.all([getAllTeamSlugs(), getAllMatchSlugs()]);
  const pages: ((l: Locale) => string)[] = [
    (l) => paths(l).home,
    (l) => paths(l).leagues,
    (l) => paths(l).championsLeague,
    ...LEAGUES.map((league) => (l: Locale) => paths(l).league(league.slug)),
    ...LEAGUES.map((league) => (l: Locale) => paths(l).projection(league.slug)),
    (l) => paths(l).predictions,
    (l) => paths(l).tableVsStrength,
    (l) => paths(l).methodology,
    (l) => paths(l).legal,
    (l) => paths(l).privacy,
    ...teams.map((slug) => (l: Locale) => paths(l).team(slug)),
    ...matches.map((slug) => (l: Locale) => paths(l).match(slug)),
  ];
  return pages.flatMap((page) => {
    const languages = {
      en: `${base}${page("en")}`,
      de: `${base}${page("de")}`,
      "x-default": `${base}${page("en")}`,
    };
    return (["en", "de"] as const).map((l) => ({
      url: `${base}${page(l)}`,
      alternates: { languages },
    }));
  });
}
