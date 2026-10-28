import type { Metadata } from "next";
import { getSiteUrl, SITE } from "@/config/site";

/** Builds per-page metadata with canonical URL and Open Graph defaults. */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  /** Path with leading and trailing slash, e.g. "/leagues/bundesliga/". */
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${getSiteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE.name, type: "website", locale: "en" },
    twitter: { card: "summary", title, description },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** schema.org BreadcrumbList as JSON-LD. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}
