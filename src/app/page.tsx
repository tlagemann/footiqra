import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { LeagueStrength } from "@/components/league-strength";
import { PerformanceCards } from "@/components/performance";
import { LastUpdated } from "@/components/match-list";
import { RankingTable } from "@/components/ranking-table";
import { ButtonLink, Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { SITE } from "@/config/site";
import {
  biggestMatches,
  getAllTableVsStrength,
  getPowerRanking,
  getUpcomingForecasts,
  getWeekAgo,
  nextWindow,
  topAcrossLeagues,
} from "@/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE.tagline, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
};

export default async function HomePage() {
  const ranking = await getPowerRanking();
  const top = ranking.status === "ok" ? ranking.data.rows.slice(0, 3) : [];
  const performance = topAcrossLeagues(await getAllTableVsStrength(10), 3);
  const weekAgo = await getWeekAgo();
  const bigGames = biggestMatches(nextWindow(await getUpcomingForecasts(), 7), 3).sort(
    (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate),
  );
  const hasPerformance = performance.over.length + performance.under.length > 0;

  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Eyebrow>Cross-league power ranking</Eyebrow>
          <h1 className="mt-5 font-display text-[2.9rem] leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
            Every top club. One ranking.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            {SITE.description} Updated several times a day from real match results.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#ranking-section">See the ranking</ButtonLink>
            <ButtonLink href="/methodology/" variant="secondary">
              How it works
            </ButtonLink>
          </div>
        </div>

        {top.length > 0 && (
          <div className="rounded-[2rem] bg-surface p-3 sm:p-4">
            <p className="px-3 pt-2 pb-3 text-sm font-semibold text-muted">Top 3 right now</p>
            <ol className="space-y-2">
              {top.map((row) => (
                <li key={row.team.slug}>
                  <Link
                    href={`/teams/${row.team.slug}/`}
                    className="flex items-center gap-4 rounded-3xl bg-background px-4 py-4 transition hover:shadow-sm sm:px-5"
                  >
                    <span className="tabular w-6 font-display text-2xl font-extrabold text-muted">
                      {row.rank}
                    </span>
                    <Crest src={row.team.crest} name={row.team.name} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-bold tracking-[-0.02em]">
                        {row.team.shortName || row.team.name}
                      </span>
                      <span className="block text-sm text-muted">
                        {getLeagueBySlug(row.team.leagueSlug)?.name}
                      </span>
                    </span>
                    <span className="tabular font-display text-2xl font-extrabold tracking-[-0.03em]">
                      {Math.round(row.rating)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {ranking.status === "ok" ? (
        <>
          <section aria-labelledby="ranking" id="ranking-section" className="scroll-mt-24">
            <SectionHeading
              id="ranking"
              title="Power Ranking"
              aside={
                <span className="text-sm text-muted">
                  {ranking.data.rows.length} teams · {LEAGUES.length} leagues
                </span>
              }
            />
            <RankingTable
              rows={ranking.data.rows}
              caption="Footiqra power ranking of all teams in the covered leagues"
            />
            <LastUpdated utc={ranking.lastUpdatedUtc} />
          </section>

          {bigGames.length > 0 && (
            <section aria-labelledby="big-games">
              <SectionHeading
                id="big-games"
                title="Biggest games this week"
                aside={
                  <Link href="/predictions/" className="text-sm text-muted hover:text-foreground">
                    All predictions
                  </Link>
                }
              />
              <ForecastList forecasts={bigGames} grouped={false} />
            </section>
          )}

          {hasPerformance && (
            <section aria-labelledby="table-vs-strength">
              <SectionHeading
                id="table-vs-strength"
                title="Table vs. strength"
                aside={
                  <Link
                    href="/table-vs-strength/"
                    className="text-sm text-muted hover:text-foreground"
                  >
                    All leagues
                  </Link>
                }
              />
              <p className="-mt-2 mb-5 max-w-2xl text-muted">
                Clubs whose league position differs most from their power rating.
              </p>
              <PerformanceCards
                over={performance.over}
                under={performance.under}
                showLeague
                previous={weekAgo}
              />
            </section>
          )}

          <section aria-labelledby="league-strength">
            <SectionHeading id="league-strength" title="League strength" />
            <p className="-mt-2 mb-5 max-w-2xl text-muted">
              Rating points added to every team of a league. It starts from the UEFA coefficients
              and moves with results between clubs of different leagues in Europe (
              {ranking.data.crossLeagueMatches} matches so far this season).
            </p>
            <LeagueStrength leagues={ranking.data.leagues} />
          </section>
        </>
      ) : (
        <DataNotice reason={ranking.reason} />
      )}
    </div>
  );
}
