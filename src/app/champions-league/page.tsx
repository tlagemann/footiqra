import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated, MatchList } from "@/components/match-list";
import { RankingTable } from "@/components/ranking-table";
import { StandingsTable } from "@/components/standings-table";
import { Eyebrow, SectionHeading } from "@/components/ui";
import {
  getChampionsLeague,
  getLastUpdated,
  getPowerRanking,
  getUpcomingForecasts,
  nextWindow,
} from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Champions League table, predictions and results",
  description:
    "Champions League league phase table, win probabilities for the next matches, latest results and how the clubs from Europe's top leagues rate in the Footiqra power ranking.",
  path: "/champions-league/",
});

/** League phase since 2024/25: 1 to 8 reach the round of 16, 9 to 24 the knockout play-offs. */
function zone(position: number): "direct" | "playoff" | null {
  if (position <= 8) return "direct";
  if (position <= 24) return "playoff";
  return null;
}

export default async function ChampionsLeaguePage() {
  const [cl, ranking, forecasts, lastUpdated] = await Promise.all([
    getChampionsLeague(),
    getPowerRanking(),
    getUpcomingForecasts(),
    getLastUpdated(),
  ]);
  const powerRanks = new Map(
    ranking.status === "ok" ? ranking.data.rows.map((r) => [r.team.slug, r.rank]) : [],
  );
  const clForecasts = nextWindow(
    forecasts.filter((f) => f.competition === "CL"),
    10,
  );
  const forecastIds = new Set(clForecasts.map((f) => f.id));
  const nextFixtures = cl.fixtures.filter((f) => !forecastIds.has(f.id));
  const firstDay = (clForecasts[0] ?? nextFixtures[0])?.utcDate;
  const otherFixtures = firstDay
    ? nextFixtures.filter((f) => Date.parse(f.utcDate) < Date.parse(firstDay) + 10 * 86400000)
    : [];
  const season = cl.season ? `${cl.season}/${String(cl.season + 1).slice(2)}` : null;

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Champions League", path: "/champions-league/" },
        ])}
      />
      <header>
        <Eyebrow>Europe{season ? ` · ${season}` : ""}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          Champions League
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          The league phase table, the next matches and how the clubs from the seven leagues covered
          by Footiqra compare. Forecasts are shown for matches between two rated clubs.
        </p>
      </header>

      {clForecasts.length > 0 && (
        <section aria-labelledby="cl-forecasts">
          <SectionHeading
            id="cl-forecasts"
            title="Next matches"
            aside={
              <Link href="/predictions/" className="text-sm text-muted hover:text-foreground">
                All predictions
              </Link>
            }
          />
          <ForecastList forecasts={clForecasts} />
        </section>
      )}

      {otherFixtures.length > 0 && (
        <section aria-labelledby="cl-other">
          <SectionHeading
            id="cl-other"
            title={clForecasts.length > 0 ? "More fixtures" : "Next matches"}
          />
          <MatchList matches={otherFixtures} caption="Upcoming Champions League fixtures" />
          <p className="mt-3 text-sm text-muted">
            No forecast for these: at least one club plays outside the covered leagues and has no
            rating.
          </p>
        </section>
      )}

      <section aria-labelledby="cl-table">
        <SectionHeading id="cl-table" title="League phase" />
        {cl.table ? (
          <>
            <StandingsTable
              rows={cl.table.rows}
              caption="Champions League league phase table"
              powerRanks={powerRanks}
              zone={zone}
            />
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-brand" /> 1 to 8: round of 16
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-neutral" /> 9 to 24: knockout play-offs
              </span>
              <span>Power #: position in the Footiqra ranking (covered leagues only)</span>
            </p>
          </>
        ) : (
          <DataNotice reason="The league phase table will appear after the next data update." />
        )}
      </section>

      {cl.clubs.length > 0 && (
        <section aria-labelledby="cl-clubs">
          <SectionHeading
            id="cl-clubs"
            title="Strongest clubs in the competition"
            aside={<span className="text-sm text-muted">From the covered leagues</span>}
          />
          <RankingTable
            rows={cl.clubs}
            caption="Champions League clubs by power rating"
            rankLabel="Overall"
          />
        </section>
      )}

      {cl.results.length > 0 && (
        <section aria-labelledby="cl-results">
          <SectionHeading id="cl-results" title="Latest results" />
          <MatchList matches={cl.results.slice(0, 18)} caption="Latest Champions League results" />
        </section>
      )}
      {lastUpdated && <LastUpdated utc={lastUpdated} />}
    </div>
  );
}
