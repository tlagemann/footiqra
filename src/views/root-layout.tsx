import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ConsentManager } from "@/components/consent";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getSiteUrl, SITE, SITE_TEXT } from "@/config/site";
import { HTML_LANG, type Locale } from "@/i18n";
import "@/app/globals.css";

export function rootMetadata(locale: Locale): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${SITE.name}: ${SITE_TEXT[locale].tagline}`,
      template: `%s | ${SITE.name}`,
    },
    description: SITE_TEXT[locale].description,
    applicationName: SITE.name,
  };
}

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Shared root layout; each language has its own root layout with the right <html lang>. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={HTML_LANG[locale]} className="antialiased">
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader locale={locale} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 sm:px-6 sm:pt-16">
          {children}
        </main>
        <SiteFooter locale={locale} />
        <ConsentManager locale={locale} />
      </body>
    </html>
  );
}
