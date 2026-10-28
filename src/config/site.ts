export const SITE = {
  name: "Footiqra",
  tagline: "Power rankings across Europe's top football leagues",
  description:
    "Data-driven power rankings comparing every club in the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie on one scale.",
  locale: "en",
} as const;

/**
 * Public base URL used for canonical links, sitemap and robots.txt.
 * Not a secret, so it may be read anywhere (also at build time).
 * Falls back to localhost so local builds work without configuration.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
