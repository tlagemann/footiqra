/**
 * URL slug for team and competition names.
 * "1. FC Köln" -> "1-fc-koln", "Atlético Madrid" -> "atletico-madrid"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/ß/g, "ss")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Makes slugs unique within a set, e.g. two clubs that slugify identically.
 * Deterministic: order of `names` decides who gets the suffix.
 */
export function uniqueSlugs(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = slugify(name) || "team";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}
