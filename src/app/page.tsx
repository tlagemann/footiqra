import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { LastUpdated } from "@/components/match-list";
import { RankingTable } from "@/components/ranking-table";
import { getLeagueBySlug } from "@/config/leagues";
import { SITE } from "@/config/site";
import { getPowerRanking } from "@/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE.tagline, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
};

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

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

      {ranking.status === "ok" ? (
        <>
          <section aria-labelledby="ranking-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="ranking-heading" className="text-xl font-semibold">
                Power Ranking
              </h2>
              <Link href="/methodology/" className="text-sm text-muted hover:text-accent">
                How it works
              </Link>
            </div>
            <RankingTable
              rows={ranking.data.rows}
              caption="Footiqra power ranking of all teams in the five leagues"
            />
            <LastUpdated utc={ranking.lastUpdatedUtc} />
          </section>

          <section aria-labelledby="leagues-heading" className="space-y-3">
            <h2 id="leagues-heading" className="text-xl font-semibold">
              League strength
            </h2>
            <p className="max-w-2xl text-sm text-muted">
              Rating points added to every team of a league. Starts from the UEFA coefficients and
              moves with results between clubs of different leagues in Europe (
              {ranking.data.crossLeagueMatches} matches so far this season).
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ranking.data.leagues.map((l) => {
                const league = getLeagueBySlug(l.leagueSlug);
                return (
                  <li key={l.leagueSlug}>
                    <Link
                      href={`/leagues/${l.leagueSlug}/`}
                      className="block rounded-lg border border-line px-4 py-3 hover:border-accent"
                    >
                      <span className="block font-medium">{league?.name}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {signed(l.currentAdjustment)}
                      </span>
                      <span className="text-xs text-muted">
                        {" "}
                        (start {signed(l.startingOffset)})
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : (
        <DataNotice reason={ranking.reason} />
      )}
    </div>
  );
}
