import type { MetadataRoute } from "next";
import { LEAGUES } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllTeamSlugs, getLastUpdated, getMatchSitemapEntries } from "@/data";
import { paths, type Locale } from "@/i18n";

export const dynamic = "force-static";

type Page = (l: Locale) => string;

/**
 * Every page in both languages. Each entry lists its English and German
 * version plus x-default (English), so search engines see the language pairs.
 *
 * lastModified: data-driven pages carry the time of the last data update,
 * match pages the time their content last changed (see getMatchSitemapEntries),
 * legal and method pages no date.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [teams, matches, updated] = await Promise.all([
    getAllTeamSlugs(),
    getMatchSitemapEntries(),
    getLastUpdated(),
  ]);
  const live: Page[] = [
    (l) => paths(l).home,
    (l) => paths(l).leagues,
    (l) => paths(l).championsLeague,
    ...LEAGUES.map((league) => (l: Locale) => paths(l).league(league.slug)),
    ...LEAGUES.map((league) => (l: Locale) => paths(l).projection(league.slug)),
    ...LEAGUES.map((league) => (l: Locale) => paths(l).leaguePredictions(league.slug)),
    (l) => paths(l).predictions,
    (l) => paths(l).topMatches,
    (l) => paths(l).scorers,
    (l) => paths(l).tableCalculator,
    ...LEAGUES.map((league) => (l: Locale) => paths(l).leagueCalculator(league.slug)),
    (l) => paths(l).scorerIndex,
    ...LEAGUES.map((league) => (l: Locale) => paths(l).leagueScorers(league.slug)),
    (l) => paths(l).tableVsStrength,
    ...teams.map((slug) => (l: Locale) => paths(l).team(slug)),
  ];
  const undated: Page[] = [
    (l) => paths(l).methodology,
    (l) => paths(l).legal,
    (l) => paths(l).privacy,
  ];
  const pages: { page: Page; lastModified?: string }[] = [
    ...live.map((page) => ({ page, lastModified: updated ?? undefined })),
    ...undated.map((page) => ({ page })),
    ...matches.map((m) => ({
      page: (l: Locale) => paths(l).match(m.slug),
      lastModified: m.lastModified,
    })),
  ];
  return pages.flatMap(({ page, lastModified }) => {
    const languages = {
      en: `${base}${page("en")}`,
      de: `${base}${page("de")}`,
      "x-default": `${base}${page("en")}`,
    };
    return (["en", "de"] as const).map((l) => ({
      url: `${base}${page(l)}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
