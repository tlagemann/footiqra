import type { MetadataRoute } from "next";
import { getBlogPosts, getBlogTranslation } from "@/blog/posts";
import { LEAGUES } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllTeamSlugs, getLastUpdated, getMatchSitemapEntries, getUefaRanking } from "@/data";
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
    (l) => paths(l).championsLeagueCalculator,
    (l) => paths(l).scorerIndex,
    ...LEAGUES.map((league) => (l: Locale) => paths(l).leagueScorers(league.slug)),
    (l) => paths(l).tableVsStrength,
    (l) => paths(l).titleRace,
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
  const uefa = await getUefaRanking();
  if (uefa && !uefa.historyIncomplete) {
    pages.push({
      page: (l: Locale) => paths(l).uefaRanking,
      lastModified: uefa.lastMatch ?? undefined,
    });
  }
  if (getBlogPosts("en").length > 0 || getBlogPosts("de").length > 0) {
    const newest = [...getBlogPosts("en"), ...getBlogPosts("de")]
      .map((post) => post.updated)
      .sort()
      .at(-1);
    pages.push({ page: (l: Locale) => paths(l).blog, lastModified: newest });
  }
  const shared = pages.flatMap(({ page, lastModified }) => {
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
  // Posts exist per language; only translated posts list each other as alternates.
  // A German version may have its own slug, so alternates are looked up per post.
  const posts = (["en", "de"] as const).flatMap((l) =>
    getBlogPosts(l).map((post) => {
      const en = getBlogTranslation(post, "en");
      const de = getBlogTranslation(post, "de");
      return {
        url: `${base}${paths(l).blogPost(post.slug)}`,
        lastModified: post.updated,
        ...(en && de
          ? {
              alternates: {
                languages: {
                  en: `${base}${paths("en").blogPost(en.slug)}`,
                  de: `${base}${paths("de").blogPost(de.slug)}`,
                  "x-default": `${base}${paths("en").blogPost(en.slug)}`,
                },
              },
            }
          : {}),
      };
    }),
  );
  return [...shared, ...posts];
}
