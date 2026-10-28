import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { leagueCountryList, LEAGUES } from "@/config/leagues";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Leagues covered: Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and more",
  description: "Overview of the European football leagues covered by the Footiqra power ranking.",
  path: "/leagues/",
});

export default function LeaguesPage() {
  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Leagues", path: "/leagues/" },
        ])}
      />
      <h1 className="text-3xl font-semibold tracking-tight">Leagues</h1>
      <p className="max-w-2xl text-muted">
        Footiqra covers the top divisions of {leagueCountryList()}.
      </p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {LEAGUES.map((league) => (
          <li key={league.slug}>
            <Link
              href={`/leagues/${league.slug}/`}
              className="flex items-center justify-between px-4 py-4 hover:bg-surface"
            >
              <span className="font-medium">{league.name}</span>
              <span className="text-sm text-muted">{league.country}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
