import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * Build id from the site's code only (not from /data). Next writes the build
 * id into every page, so a random id would change all files on every data
 * update and the deploy would re-upload the whole site. With this, pages
 * whose content did not change (e.g. archived match pages) stay byte-identical.
 */
function codeHash(): string {
  const hash = createHash("sha256");
  const add = (path: string) => {
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path).sort()) add(join(path, name));
    } else {
      hash.update(path).update(readFileSync(path));
    }
  };
  for (const path of ["src", "package-lock.json", "next.config.ts"]) add(path);
  return hash.digest("hex").slice(0, 20);
}

/**
 * Footiqra is a fully static site (see docs/ARCHITECTURE.md).
 *
 * - `next build --webpack` writes plain HTML/CSS/JS to ./out, which is uploaded
 *   to SiteGround. No Node.js process runs on the web host.
 * - Data comes from the JSON files in /data, read at build time.
 * - Webpack instead of Turbopack: verified on SiteGround 2026-10-28 that build
 *   sandboxes may forbid the port-binding helper process Turbopack uses for
 *   CSS loaders. Webpack runs loaders in-process and works everywhere.
 */
const nextConfig: NextConfig = {
  output: "export",

  // Pages are served as /leagues/premier-league/ (matches the planned URL structure).
  trailingSlash: true,

  // No image optimisation server on a static host.
  images: { unoptimized: true },

  reactStrictMode: true,

  generateBuildId: async () => codeHash(),
};

export default nextConfig;
