import { describe, expect, it } from "vitest";
import { canonicalHostRules } from "./htaccess";

describe("canonicalHostRules", () => {
  it("is empty without a public https URL", () => {
    expect(canonicalHostRules(undefined)).toBe("");
    expect(canonicalHostRules("")).toBe("");
    expect(canonicalHostRules("http://localhost:3000")).toBe("");
    expect(canonicalHostRules("http://footiqra.com")).toBe("");
    expect(canonicalHostRules("not a url")).toBe("");
  });

  it("redirects other hosts and plain http to the canonical origin", () => {
    const rules = canonicalHostRules("https://footiqra.com/");
    expect(rules).toContain("RewriteCond %{HTTPS} off [OR]");
    expect(rules).toContain("RewriteCond %{HTTP_HOST} !^footiqra\\.com$ [NC]");
    expect(rules).toContain("RewriteCond %{REQUEST_URI} !^/\\.well-known/");
    expect(rules).toContain("RewriteRule ^ https://footiqra.com%{REQUEST_URI} [R=301,L]");
  });
});
