import type { Locale } from "@/i18n";

/**
 * Club names as people search for them, used in titles, headings and meta
 * descriptions of match pages. The provider's short names are sometimes
 * abbreviations ("M'gladbach", "Atleti") or miss common exonyms
 * ("Bayern Munich", "AC Mailand"). Clubs not listed keep their short name.
 *
 * A string applies to both languages; an object sets them separately.
 */
const SEARCH_NAMES: Record<string, string | Partial<Record<Locale, string>>> = {
  // Bundesliga
  "1-fc-koln": { en: "Cologne", de: "Köln" },
  "fc-bayern-munchen": { en: "Bayern Munich", de: "Bayern" },
  "borussia-monchengladbach": "Gladbach",
  "eintracht-frankfurt": "Eintracht Frankfurt",
  "sv-werder-bremen": "Werder Bremen",
  "hamburger-sv": { en: "Hamburg", de: "Hamburger SV" },
  "sc-paderborn-07": "Paderborn",
  // La Liga
  "club-atletico-de-madrid": "Atlético Madrid",
  "fc-barcelona": "Barcelona",
  "athletic-club": "Athletic Bilbao",
  "rc-celta-de-vigo": "Celta Vigo",
  "sevilla-fc": "Sevilla",
  "real-racing-club-de-santander": "Racing Santander",
  // Premier League
  "brighton-and-hove-albion-fc": "Brighton",
  "nottingham-forest-fc": "Nottingham Forest",
  // Serie A
  "ac-milan": { en: "AC Milan", de: "AC Mailand" },
  "fc-internazionale-milano": { en: "Inter Milan", de: "Inter Mailand" },
  "as-roma": { en: "Roma", de: "AS Rom" },
  "ss-lazio": { en: "Lazio", de: "Lazio Rom" },
  "ssc-napoli": { en: "Napoli", de: "SSC Neapel" },
  "como-1907": "Como",
  "venezia-fc": "Venezia",
  // Ligue 1
  "olympique-lyonnais": "Lyon",
  "stade-rennais-fc-1901": "Rennes",
  "racing-club-de-lens": "Lens",
  "angers-sco": "Angers",
  // Primeira Liga
  "sport-lisboa-e-benfica": { en: "Benfica", de: "Benfica Lissabon" },
  "sporting-clube-de-portugal": { en: "Sporting CP", de: "Sporting Lissabon" },
  "fc-porto": { en: "Porto", de: "FC Porto" },
  "academico-de-viseu-fc": "Académico Viseu",
  "cf-estrela-da-amadora": "Estrela Amadora",
  "vitoria-sc": "Vitória Guimarães",
  "cd-nacional": "Nacional",
  "gd-estoril-praia": "Estoril",
  // Eredivisie
  "fortuna-sittard": "Fortuna Sittard",
  "go-ahead-eagles": "Go Ahead Eagles",
  "pec-zwolle": "PEC Zwolle",
  "sparta-rotterdam": "Sparta Rotterdam",
  "ado-den-haag": "ADO Den Haag",
  nec: "NEC Nijmegen",
  // European opponents
  "fk-shakhtar-donetsk": "Shakhtar Donetsk",
  "sk-slovan-bratislava": "Slovan Bratislava",
  "sk-slavia-praha": { en: "Slavia Prague", de: "Slavia Prag" },
  "pae-aek": { en: "AEK Athens", de: "AEK Athen" },
  "club-brugge-kv": { en: "Club Brugge", de: "FC Brügge" },
};

/** Name of a club as people search for it in the given language. */
export function searchName(
  team: { slug: string | null; shortName: string | null; name: string },
  locale: Locale,
): string {
  const entry = team.slug ? SEARCH_NAMES[team.slug] : undefined;
  const override = typeof entry === "string" ? entry : entry?.[locale];
  return override ?? (team.shortName || team.name);
}
