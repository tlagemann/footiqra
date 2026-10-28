import type { NextConfig } from "next";

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
};

export default nextConfig;
