import Link from "next/link";
import { SITE } from "@/config/site";

const NAV = [
  { href: "/", label: "Power Ranking" },
  { href: "/leagues/", label: "Leagues" },
  { href: "/methodology/", label: "Methodology" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {SITE.name}
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-foreground">
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
