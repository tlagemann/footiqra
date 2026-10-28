import Link from "next/link";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Ranking" },
  { href: "/leagues/", label: "Leagues" },
  { href: "/methodology/", label: "Methodology" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Footiqra home" className="text-foreground">
          <Logo />
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-0 text-sm font-medium sm:gap-1 sm:text-[15px]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-xl px-2 py-2 text-muted sm:px-3 transition hover:bg-surface hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
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
        </ul>
      </div>
    </footer>
  );
}
