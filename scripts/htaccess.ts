/**
 * Post-build step: puts the canonical-origin redirect at the top of out/.htaccess
 * when NEXT_PUBLIC_SITE_URL is a public https URL (see src/lib/htaccess.ts).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { canonicalHostRules } from "../src/lib/htaccess";

const file = "out/.htaccess";
const rules = canonicalHostRules(process.env.NEXT_PUBLIC_SITE_URL);
if (!existsSync(file)) {
  console.error(`${file} not found; run next build first.`);
  process.exit(1);
}
if (rules) {
  // First in the file, so the redirect runs before any other rewrite rule.
  writeFileSync(file, rules.trimStart() + "\n" + readFileSync(file, "utf8"));
  console.info(`Canonical redirect added to ${file}.`);
} else {
  console.info("No public https SITE_URL set; no canonical redirect added.");
}
