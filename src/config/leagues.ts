import { country, listJoin, type Locale } from "@/i18n";
/**
 * Static registry of supported competitions.
 *
 * Adding a league later = adding one entry here (plus a provider code).
 * Contains only stable reference facts, no statistics.
 */
export type LeagueSlug =
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "primeira-liga"
  | "eredivisie";

export interface LeagueDefinition {
  slug: LeagueSlug;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, England uses the UK subdivision convention "GB-ENG". */
  countryCode: string;
  /** Competition codes per data provider. */
  providerCodes: {
    footballData: string;
  };
}

export const LEAGUES: readonly LeagueDefinition[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    country: "England",
    countryCode: "GB-ENG",
    providerCodes: { footballData: "PL" },
  },
  {
    slug: "la-liga",
    name: "La Liga",
    country: "Spain",
    countryCode: "ES",
    providerCodes: { footballData: "PD" },
  },
  {
    slug: "serie-a",
    name: "Serie A",
    country: "Italy",
    countryCode: "IT",
    providerCodes: { footballData: "SA" },
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    countryCode: "DE",
    providerCodes: { footballData: "BL1" },
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    country: "France",
    countryCode: "FR",
    providerCodes: { footballData: "FL1" },
  },
  {
    slug: "primeira-liga",
    name: "Primeira Liga",
    country: "Portugal",
    countryCode: "PT",
    providerCodes: { footballData: "PPL" },
  },
  {
    slug: "eredivisie",
    name: "Eredivisie",
    country: "Netherlands",
    countryCode: "NL",
    providerCodes: { footballData: "DED" },
  },
] as const;

/** "England, Spain, Italy, Germany, France, Portugal and the Netherlands" */
export function leagueCountryList(locale: Locale = "en"): string {
  const names = LEAGUES.map((l) =>
    locale === "en" && l.country === "Netherlands" ? "the Netherlands" : country(locale, l.country),
  );
  return listJoin(locale, names);
}

export function getLeagueBySlug(slug: string): LeagueDefinition | undefined {
  return LEAGUES.find((league) => league.slug === slug);
}
