import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl, SITE } from "@/config/site";
import "./globals.css";

// System font stack (see globals.css): no web-font download at build time or in the browser.

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={SITE.locale} className="antialiased">
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted">
            {SITE.name} · Independent football analysis. Not affiliated with any league or club.
          </div>
        </footer>
      </body>
    </html>
  );
}
