import type { NextConfig } from "next";

/**
 * Build target
 * ------------
 * FOOTIQRA_BUILD_TARGET=server  (default)
 *   Regular Next.js server build, intended for a SiteGround "Node.js Project"
 *   (GrowBig/GoGeek/Cloud). Started with `npm start`.
 *
 * FOOTIQRA_BUILD_TARGET=export
 *   Fully static export into ./out (plain HTML/CSS/JS). Fallback if the
 *   Node.js runtime on SiteGround turns out to be unsuitable. Works on any
 *   web space. Requires that no page uses request-time features.
 *
 * See docs/ARCHITECTURE.md, section "Hosting strategy".
 */
const buildTarget = process.env.FOOTIQRA_BUILD_TARGET === "export" ? "export" : "server";

const nextConfig: NextConfig = {
  // Cache Components (`use cache`) stay off in Phase 1: they need a long-running
  // Node.js server and are incompatible with the static fallback and with
  // `dynamicParams = false`. Revisit in Phase 2 once the SiteGround runtime is verified
  // (see docs/ARCHITECTURE.md, "Caching and freshness").
  cacheComponents: false,

  // Pages are served as /leagues/premier-league/ (matches the planned URL structure).
  trailingSlash: true,

  poweredByHeader: false,
  reactStrictMode: true,

  ...(buildTarget === "export" ? { output: "export" as const, images: { unoptimized: true } } : {}),

  // Bundler: builds run with Webpack (`next build --webpack`, see package.json).
  // Verified on SiteGround 2026-10-28: Turbopack runs CSS/PostCSS loaders in a helper
  // process that binds a local port, which SiteGround's build sandbox forbids
  // ("binding to a port: Operation not permitted"). Webpack runs loaders in-process.
  // Tailwind is wired through postcss.config.mjs.
};

export default nextConfig;
