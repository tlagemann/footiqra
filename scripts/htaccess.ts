/**
 * Post-build step: appends the canonical-origin redirect to out/.htaccess
 * when NEXT_PUBLIC_SITE_URL is a public https URL (see src/lib/htaccess.ts).
 */
import { appendFileSync, existsSync } from "node:fs";
import { canonicalHostRules } from "../src/lib/htaccess";

const file = "out/.htaccess";
const rules = canonicalHostRules(process.env.NEXT_PUBLIC_SITE_URL);
if (!existsSync(file)) {
  console.error(`${file} not found; run next build first.`);
  process.exit(1);
}
if (rules) {
  appendFileSync(file, rules);
  console.info(`Canonical redirect added to ${file}.`);
} else {
  console.info("No public https SITE_URL set; no canonical redirect added.");
}
