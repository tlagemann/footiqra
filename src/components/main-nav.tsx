"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/", label: "Ranking", match: (p: string) => p === "/" },
  {
    href: "/predictions/",
    label: "Predictions",
    match: (p: string) => p.startsWith("/predictions") || p.startsWith("/matches"),
  },
  { href: "/leagues/", label: "Leagues", match: (p: string) => p.startsWith("/leagues") },
  {
    href: "/table-vs-strength/",
    label: "Table vs. strength",
    match: (p: string) => p.startsWith("/table-vs-strength"),
  },
  {
    href: "/methodology/",
    label: "Methodology",
    match: (p: string) => p.startsWith("/methodology"),
  },
] as const;

/**
 * Segmented pill navigation. The current section is a solid pill;
 * on small screens the bar scrolls horizontally instead of wrapping.
 */
export function MainNav({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Main" className={className}>
      <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-surface p-1 text-sm font-semibold">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-3.5 py-2 whitespace-nowrap transition sm:px-4 ${
                  active
                    ? "bg-foreground text-inverse shadow-sm"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
