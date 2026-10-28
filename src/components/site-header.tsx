import Link from "next/link";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem]">
        <Link href="/" aria-label="Footiqra home" className="text-foreground">
          <Logo />
        </Link>
        <MainNav />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-md text-sm text-muted">
            Independent, data-driven power rankings for Europe&apos;s top football leagues. Not
            affiliated with any league or club. Club names and crests belong to their owners.
          </p>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/leagues/" className="text-muted hover:text-foreground">
              Leagues
            </Link>
          </li>
          <li>
            <Link href="/champions-league/" className="text-muted hover:text-foreground">
              Champions League
            </Link>
          </li>
          <li>
            <Link href="/predictions/" className="text-muted hover:text-foreground">
              Predictions
            </Link>
          </li>
          <li>
            <Link href="/table-vs-strength/" className="text-muted hover:text-foreground">
              Table vs. strength
            </Link>
          </li>
          <li>
            <Link href="/methodology/" className="text-muted hover:text-foreground">
              Methodology
            </Link>
          </li>
          <li className="text-muted">Data: football-data.org</li>
          <li>
            <Link href="/impressum/" className="text-muted hover:text-foreground">
              Impressum
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
