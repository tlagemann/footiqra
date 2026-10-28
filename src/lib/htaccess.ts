/**
 * Apache rules that send every request to the one canonical origin
 * (https, no www, no temporary host name). Generated at build time from
 * NEXT_PUBLIC_SITE_URL so a preview build never redirects to a domain that
 * is not connected yet. Returns "" when no public https URL is configured.
 */
export function canonicalHostRules(siteUrl: string | undefined): string {
  if (!siteUrl) return "";
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.hostname === "localhost") return "";
  const host = url.hostname;
  const escaped = host.replace(/\./g, "\\.");
  return [
    "",
    "# Canonical origin (generated at build time from SITE_URL):",
    `# http, www and the temporary host name all redirect to https://${host}`,
    "<IfModule mod_rewrite.c>",
    "  RewriteEngine On",
    "  RewriteCond %{HTTPS} off [OR]",
    `  RewriteCond %{HTTP_HOST} !^${escaped}$ [NC]`,
    "  # Keep certificate checks (Let's Encrypt) reachable on every host name",
    "  RewriteCond %{REQUEST_URI} !^/\\.well-known/",
    `  RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]`,
    "</IfModule>",
    "",
  ].join("\n");
}
