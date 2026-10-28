import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { PerformanceCards } from "@/components/performance";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getAllTableVsStrength, getLastUpdated, MIN_HIGHLIGHT_GAP, topAcrossLeagues } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Overperformers and underperformers: table vs. strength",
  description:
    "Which clubs in Europe's top leagues are higher or lower in the table than their strength suggests? Updated several times a day.",
  path: "/table-vs-strength/",
});

export default async function TableVsStrengthPage() {
  const [perLeague, deep, lastUpdated] = await Promise.all([
    getAllTableVsStrength(3),
    getAllTableVsStrength(10),
    getLastUpdated(),
  ]);
  const top = topAcrossLeagues(deep, 5);

  return (
    <div className="space-y-16">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Table vs. strength", path: "/table-vs-strength/" },
        ])}
      />
      <header>
        <Eyebrow>Table vs. strength</Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          Who is punching above their weight?
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          For every club we compare its place in the league table with its place by Footiqra power
          rating within the same league. A big gap means the table and the underlying strength tell
          different stories. Gaps of at least {MIN_HIGHLIGHT_GAP} places are shown.
        </p>
      </header>

      {perLeague.length === 0 ? (
        <DataNotice reason="League tables have not been imported yet." />
      ) : (
        <>
          <section aria-labelledby="all-leagues">
            <SectionHeading id="all-leagues" title={`Across all ${LEAGUES.length} leagues`} />
            <PerformanceCards over={top.over} under={top.under} showLeague />
          </section>

          {perLeague.map((l) => {
            const league = getLeagueBySlug(l.leagueSlug);
            return (
              <section key={l.leagueSlug} aria-labelledby={`league-${l.leagueSlug}`}>
                <SectionHeading
                  id={`league-${l.leagueSlug}`}
                  title={league?.name ?? l.leagueSlug}
                  aside={
                    <Link
                      href={`/leagues/${l.leagueSlug}/`}
                      className="text-sm text-muted hover:text-foreground"
                    >
                      Table and ranking
                    </Link>
                  }
                />
                <PerformanceCards over={l.over} under={l.under} />
              </section>
            );
          })}
        </>
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          How to read this
        </h2>
        <p>
          The power rating weighs every result by the strength of the opponent, the margin and home
          advantage, and it includes European matches. The table only counts points. A club that
          collected many narrow wins against weaker teams can sit higher in the table than its
          rating; a club with heavy defeats or a tough schedule so far can sit lower. Early in the
          season, gaps close quickly.{" "}
          <Link href="/methodology/" className="underline underline-offset-4">
            How the rating works
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} />}
    </div>
  );
}
