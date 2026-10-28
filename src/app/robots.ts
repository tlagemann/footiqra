import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

export const dynamic = "force-static";

/**
 * Indexing stays off until NEXT_PUBLIC_ALLOW_INDEXING=true is set for the
 * production launch, so preview/temporary domains never get indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return {
    rules: allow ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
