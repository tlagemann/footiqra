import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { LEAGUES } from "@/config/leagues";
import { SITE } from "@/config/site";
import { getPowerRanking } from "@/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE.tagline, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
};

export default async function HomePage() {
  const ranking = await getPowerRanking();

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          Cross-league power ranking
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Europe&apos;s top five leagues, one ranking
        </h1>
        <p className="mt-3 max-w-2xl text-muted">{SITE.description}</p>
      </section>

      <section aria-labelledby="ranking-heading">
        <h2 id="ranking-heading" className="text-xl font-semibold">
          Power Ranking
        </h2>
        <div className="mt-4">
          {ranking.status === "ok" ? (
            <p>{/* Phase 2: ranking table */}</p>
          ) : (
            <DataNotice reason={ranking.reason} />
          )}
        </div>
      </section>

      <section aria-labelledby="leagues-heading">
        <h2 id="leagues-heading" className="text-xl font-semibold">
          Leagues
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEAGUES.map((league) => (
            <li key={league.slug}>
              <Link
                href={`/leagues/${league.slug}/`}
                className="block rounded-lg border border-line px-4 py-3 hover:border-accent"
              >
                <span className="block font-medium">{league.name}</span>
                <span className="text-sm text-muted">{league.country}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
