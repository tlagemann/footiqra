"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LEAGUES } from "@/config/leagues";

interface NavLink {
  href: string;
  label: string;
  hint?: string;
}

interface NavItem {
  label: string;
  href: string;
  match: (path: string) => boolean;
  /** Dropdown groups; items without children are plain links. */
  groups?: { title: string; links: NavLink[] }[];
}

const NAV: NavItem[] = [
  { label: "Ranking", href: "/", match: (p) => p === "/" },
  {
    label: "Predictions",
    href: "/predictions/",
    match: (p) =>
      p.startsWith("/predictions") || p.startsWith("/matches") || p.endsWith("/projection/"),
    groups: [
      {
        title: "Matches",
        links: [
          { href: "/predictions/", label: "Next 7 days", hint: "Win, draw and loss chances" },
        ],
      },
      {
        title: "Predicted final tables",
        links: LEAGUES.map((l) => ({ href: `/leagues/${l.slug}/projection/`, label: l.name })),
      },
    ],
  },
  {
    label: "Leagues",
    href: "/leagues/",
    match: (p) =>
      (p.startsWith("/leagues") && !p.endsWith("/projection/")) ||
      p.startsWith("/champions-league"),
    groups: [
      {
        title: "Leagues",
        links: LEAGUES.map((l) => ({
          href: `/leagues/${l.slug}/`,
          label: l.name,
          hint: l.country,
        })),
      },
      {
        title: "Europe",
        links: [
          { href: "/champions-league/", label: "Champions League" },
          { href: "/leagues/", label: "All leagues", hint: "Overview and league strength" },
        ],
      },
    ],
  },
  {
    label: "Table vs. strength",
    href: "/table-vs-strength/",
    match: (p) => p.startsWith("/table-vs-strength"),
  },
  { label: "Methodology", href: "/methodology/", match: (p) => p.startsWith("/methodology") },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pillClass(active: boolean): string {
  return `flex items-center gap-1.5 rounded-full px-4 py-2 whitespace-nowrap transition ${
    active
      ? "bg-foreground text-inverse shadow-sm"
      : "text-muted hover:bg-background hover:text-foreground"
  }`;
}

/**
 * Main navigation.
 * Desktop: pill bar; "Predictions" and "Leagues" open a dropdown on click,
 * hover or keyboard. Phones: a menu button opens a full-width panel.
 * All links are always in the HTML (hidden with CSS), so crawlers see them.
 */
export function MainNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menus after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const hoverOpen = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  return (
    <div ref={rootRef}>
      {/* Desktop */}
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-1 rounded-full bg-surface p-1 text-sm font-semibold">
          {NAV.map((item) => {
            const active = item.match(pathname);
            if (!item.groups) {
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={pillClass(active)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }
            const isOpen = open === item.label;
            const panelId = `nav-${item.label.toLowerCase()}`;
            return (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => hoverOpen(item.label)}
                onMouseLeave={hoverClose}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : item.label)}
                  className={pillClass(active)}
                >
                  {item.label}
                  <Chevron open={isOpen} />
                </button>
                <div
                  id={panelId}
                  className={`absolute top-full right-0 z-30 pt-2 ${isOpen ? "block" : "hidden"}`}
                >
                  <div className="grid w-[30rem] grid-cols-2 gap-6 rounded-3xl border border-line/70 bg-background p-5 shadow-xl shadow-black/5">
                    {item.groups.map((group) => (
                      <div key={group.title}>
                        <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted uppercase">
                          {group.title}
                        </p>
                        <ul className="space-y-0.5">
                          {group.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                aria-current={pathname === link.href ? "page" : undefined}
                                className={`block rounded-2xl px-3 py-2 transition hover:bg-surface ${
                                  pathname === link.href ? "bg-surface" : ""
                                }`}
                              >
                                <span className="block font-semibold text-foreground">
                                  {link.label}
                                </span>
                                {link.hint && (
                                  <span className="block text-xs font-medium text-muted">
                                    {link.hint}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Phones and tablets */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
            {mobileOpen ? (
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
          Menu
        </button>
        <nav
          id="mobile-nav"
          aria-label="Main"
          className={`absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-line/70 bg-background px-4 pt-2 pb-6 shadow-xl shadow-black/5 sm:px-6 ${
            mobileOpen ? "block" : "hidden"
          }`}
        >
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={item.match(pathname) ? "page" : undefined}
                  className={`block rounded-2xl px-4 py-3 font-display text-lg font-bold ${
                    item.match(pathname) ? "bg-surface" : ""
                  }`}
                >
                  {item.label}
                </Link>
                {item.groups && (
                  <div className="space-y-3 px-4 pt-1 pb-3">
                    {item.groups.map((group) => (
                      <div key={group.title}>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                          {group.title}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {group.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                className={`block rounded-full px-3 py-1.5 text-sm font-semibold ${
                                  pathname === link.href
                                    ? "bg-foreground text-inverse"
                                    : "bg-surface"
                                }`}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
