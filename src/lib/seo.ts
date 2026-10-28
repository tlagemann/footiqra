import type { Metadata } from "next";
import { getSiteUrl, SITE } from "@/config/site";
import type { Locale } from "@/i18n";

/** Longest page title that still shows in full in Google results (roughly). */
export const MAX_TITLE_LENGTH = 60;
const BRAND_SUFFIX = ` | ${SITE.name}`;

/**
 * The brand suffix from the root layout's title template is only added when the
 * whole title still fits; otherwise the page title is used on its own.
 */
export function documentTitle(title: string): Metadata["title"] {
  return title.length + BRAND_SUFFIX.length <= MAX_TITLE_LENGTH ? title : { absolute: title };
}

/**
 * Per-page metadata: canonical URL, hreflang alternates (en, de, x-default)
 * and Open Graph defaults.
 *
 * `paths` holds the page's path in both languages. `image` is the social
 * preview image (see src/og/images.tsx); both languages share it.
 */
export function pageMetadata({
  locale = "en",
  title,
  description,
  path,
  paths,
  noIndex = false,
  image,
}: {
  locale?: Locale;
  title: string;
  description: string;
  /** Path of this page with leading and trailing slash. Defaults to paths[locale]. */
  path?: string;
  /** The page in both languages; omit for pages that exist in one language only. */
  paths?: Record<Locale, string>;
  noIndex?: boolean;
  /** Path of the 1200 x 630 preview image, e.g. "/og/team/arsenal-fc.png". */
  image?: string;
}): Metadata {
  const site = getSiteUrl();
  const own = path ?? paths?.[locale] ?? "/";
  const url = `${site}${own}`;
  const languages = paths
    ? {
        en: `${site}${paths.en}`,
        de: `${site}${paths.de}`,
        "x-default": `${site}${paths.en}`,
      }
    : undefined;
  const images = image ? [{ url: `${site}${image}`, width: 1200, height: 630 }] : undefined;
  return {
    title: documentTitle(title),
    description,
    alternates: { canonical: url, ...(languages ? { languages } : {}) },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      locale: locale === "de" ? "de_DE" : "en_GB",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
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
