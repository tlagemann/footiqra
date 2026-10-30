/**
 * Two languages: English at the root, German under /de/ with translated paths.
 *
 *   en: /leagues/bundesliga/projection/     de: /de/ligen/bundesliga/prognose/
 *
 * Slugs of leagues, teams and matches are the same in both languages, so every
 * page has exactly one counterpart (used for hreflang and the language switch).
 */
export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const HTML_LANG: Record<Locale, string> = { en: "en", de: "de" };
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", de: "de-DE" };

/** Pick the string for a locale: tr(locale, "Predictions", "Prognosen"). */
export function tr(locale: Locale, en: string, de: string): string {
  return locale === "de" ? de : en;
}

/** Static path segments per language. */
const SEG = {
  en: {
    leagues: "leagues",
    projection: "projection",
    teams: "teams",
    matches: "matches",
    predictions: "predictions",
    topMatches: "top-matches",
    scorers: "top-scorers",
    tableVsStrength: "table-vs-strength",
    methodology: "methodology",
    championsLeague: "champions-league",
    legal: "legal-notice",
    privacy: "privacy",
  },
  de: {
    leagues: "ligen",
    projection: "prognose",
    teams: "vereine",
    matches: "spiele",
    predictions: "prognosen",
    topMatches: "topspiele",
    scorers: "torjaeger",
    tableVsStrength: "tabelle-vs-staerke",
    methodology: "methodik",
    championsLeague: "champions-league",
    legal: "impressum",
    privacy: "datenschutz",
  },
} as const;

const base = (locale: Locale) => (locale === "de" ? "/de/" : "/");

/** Every page of the site, as a path with leading and trailing slash. */
export function paths(locale: Locale) {
  const s = SEG[locale];
  const b = base(locale);
  return {
    home: b,
    leagues: `${b}${s.leagues}/`,
    league: (slug: string) => `${b}${s.leagues}/${slug}/`,
    projection: (slug: string) => `${b}${s.leagues}/${slug}/${s.projection}/`,
    scorers: `${b}${s.scorers}/`,
    leagueScorers: (slug: string) => `${b}${s.leagues}/${slug}/${s.scorers}/`,
    team: (slug: string) => `${b}${s.teams}/${slug}/`,
    match: (slug: string) => `${b}${s.matches}/${slug}/`,
    predictions: `${b}${s.predictions}/`,
    topMatches: `${b}${s.topMatches}/`,
    tableVsStrength: `${b}${s.tableVsStrength}/`,
    methodology: `${b}${s.methodology}/`,
    championsLeague: `${b}${s.championsLeague}/`,
    legal: `${b}${s.legal}/`,
    privacy: `${b}${s.privacy}/`,
  };
}

export type Paths = ReturnType<typeof paths>;

/**
 * The same page in the other language. Works for every path produced by
 * paths(); unknown paths fall back to the other language's home page.
 */
export function counterpart(pathname: string, to: Locale): string {
  const from: Locale = pathname === "/de" || pathname.startsWith("/de/") ? "de" : "en";
  if (from === to) return pathname;
  const rest = from === "de" ? pathname.replace(/^\/de\/?/, "") : pathname.replace(/^\//, "");
  const parts = rest.split("/").filter(Boolean);
  const src = SEG[from];
  const dst = SEG[to];
  const keyOf = (seg: string) =>
    (Object.keys(src) as (keyof typeof src)[]).find((k) => src[k] === seg);
  const p = paths(to);
  if (parts.length === 0) return p.home;
  const first = keyOf(parts[0]!);
  if (!first) return p.home;
  if (first === "leagues") {
    if (parts.length === 1) return p.leagues;
    if (parts.length === 2) return p.league(parts[1]!);
    if (parts[2] === src.projection) return p.projection(parts[1]!);
    if (parts[2] === src.scorers) return p.leagueScorers(parts[1]!);
    return p.league(parts[1]!);
  }
  if (first === "teams" && parts[1]) return p.team(parts[1]);
  if (first === "matches" && parts[1]) return p.match(parts[1]);
  const simple = dst[first];
  return typeof simple === "string" ? `${base(to)}${simple}/` : p.home;
}

/* ---------- Formatting ---------- */

export function fmtInt(locale: Locale, n: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 }).format(n);
}

export function fmtDecimal(locale: Locale, n: number, digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** "36%" in English, "36 %" in German. */
export function fmtPercent(locale: Locale, whole: number | string): string {
  return locale === "de" ? `${whole} %` : `${whole}%`;
}

/** Chance with clear edges: "·" for 0, "<1%", ">99%", otherwise rounded percent. */
export function fmtChance(locale: Locale, p: number): string {
  if (p <= 0) return "·";
  if (p < 0.005) return `<${fmtPercent(locale, 1)}`;
  if (p > 0.995 && p < 1) return `>${fmtPercent(locale, 99)}`;
  return fmtPercent(locale, Math.round(p * 100));
}

/** "1st" / "1." */
export function ordinal(locale: Locale, n: number): string {
  if (locale === "de") return `${n}.`;
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "+5", "−3", "0" */
export function signed(n: number, digits = 0, locale: Locale = "en"): string {
  const value =
    digits > 0 ? fmtDecimal(locale, Math.abs(n), digits) : String(Math.round(Math.abs(n)));
  const rounded = digits > 0 ? Number(Math.abs(n).toFixed(digits)) : Math.round(Math.abs(n));
  if (rounded === 0) return digits > 0 ? fmtDecimal(locale, 0, digits) : "0";
  return `${n > 0 ? "+" : "−"}${value}`;
}

export function fmtDate(locale: Locale, iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "UTC", ...options }).format(
    new Date(iso),
  );
}

export function seasonLabel(season: number): string {
  return `${season}/${String(season + 1).slice(2)}`;
}

/** Country names of the covered leagues. */
export const COUNTRY: Record<string, { en: string; de: string }> = {
  England: { en: "England", de: "England" },
  Spain: { en: "Spain", de: "Spanien" },
  Italy: { en: "Italy", de: "Italien" },
  Germany: { en: "Germany", de: "Deutschland" },
  France: { en: "France", de: "Frankreich" },
  Portugal: { en: "Portugal", de: "Portugal" },
  Netherlands: { en: "Netherlands", de: "Niederlande" },
};

export function country(locale: Locale, name: string): string {
  return COUNTRY[name]?.[locale] ?? name;
}

/** "A, B and C" / "A, B und C" */
export function listJoin(locale: Locale, items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${tr(locale, "and", "und")} ${items.at(-1)}`;
}
