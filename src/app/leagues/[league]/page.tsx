import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { ForecastList } from "@/components/forecast-list";
import { PerformanceCards } from "@/components/performance";
import { RankingTable } from "@/components/ranking-table";
import { StandingsTable } from "@/components/standings-table";
import { Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  getLeagueTable,
  getLeagueTeams,
  getPowerRanking,
  getTableVsStrength,
  getUpcomingForecasts,
  getWeekAgo,
  nextWindow,
} from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Only registered leagues exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/leagues/[league]">): Promise<Metadata> {
  const league = getLeagueBySlug((await params).league);
  if (!league) return {};
  return pageMetadata({
    title: `${league.name} power ranking, table and form`,
    description: `${league.name} (${league.country}): team strength, standings and form in the Footiqra power ranking.`,
    path: `/leagues/${league.slug}/`,
  });
}

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

export default async function LeaguePage({ params }: PageProps<"/leagues/[league]">) {
  const league = getLeagueBySlug((await params).league);
  if (!league) notFound();

  const [teams, ranking, table] = await Promise.all([
    getLeagueTeams(league.slug),
    getPowerRanking(),
    getLeagueTable(league.slug),
  ]);
  const [performance, weekAgo, allForecasts] = await Promise.all([
    getTableVsStrength(league.slug),
    getWeekAgo(),
    getUpcomingForecasts(),
  ]);
  const forecasts = nextWindow(
    allForecasts.filter((f) => f.leagueSlug === league.slug),
    6,
  );
  const powerRanks = new Map(
    ranking.status === "ok" ? ranking.data.rows.map((r) => [r.team.slug, r.rank]) : [],
  );
  const rows =
    ranking.status === "ok"
      ? ranking.data.rows.filter((r) => r.team.leagueSlug === league.slug)
      : [];
  const strength =
    ranking.status === "ok"
      ? ranking.data.leagues.find((l) => l.leagueSlug === league.slug)
      : undefined;
  const strengthRank =
    ranking.status === "ok" && strength ? ranking.data.leagues.indexOf(strength) + 1 : undefined;

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Leagues", path: "/leagues/" },
          { name: league.name, path: `/leagues/${league.slug}/` },
        ])}
      />
      <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow>{league.country}</Eyebrow>
          <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
            {league.name}
          </h1>
        </div>
        {strength && (
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: "League strength", value: signed(strength.currentAdjustment) },
              { label: "Strength rank", value: `${strengthRank} / ${LEAGUES.length}` },
              { label: "Teams", value: String(rows.length) },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl bg-surface px-5 py-4">
                <dt className="text-xs font-medium text-muted">{s.label}</dt>
                <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {rows.length > 0 && (
        <section aria-labelledby="podium">
          <h2 id="podium" className="sr-only">
            Strongest teams
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {rows.slice(0, 3).map((row, i) => (
              <li key={row.team.slug}>
                <Link
                  href={`/teams/${row.team.slug}/`}
                  className="flex h-full flex-col justify-between gap-6 rounded-3xl bg-surface p-6 transition hover:bg-surface-strong"
                >
                  <div className="flex items-start justify-between">
                    <Crest src={row.team.crest} name={row.team.name} size={56} />
                    <span className="font-display text-sm font-bold text-muted">
                      #{i + 1} in league · #{row.rank} overall
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold tracking-[-0.02em]">
                      {row.team.shortName || row.team.name}
                    </p>
                    <p className="tabular font-display text-4xl font-extrabold tracking-[-0.04em]">
                      {Math.round(row.rating)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {forecasts.length > 0 && (
        <section aria-labelledby="forecasts-heading">
          <SectionHeading
            id="forecasts-heading"
            title="Next matches"
            aside={
              <Link href="/predictions/" className="text-sm text-muted hover:text-foreground">
                All predictions
              </Link>
            }
          />
          <ForecastList forecasts={forecasts} grouped={false} />
        </section>
      )}

      <section aria-labelledby="table-heading">
        <SectionHeading
          id="table-heading"
          title="Table"
          aside={
            table && (
              <span className="text-sm text-muted">
                Season {table.season}/{String(table.season + 1).slice(2)}
              </span>
            )
          }
        />
        {table ? (
          <>
            <StandingsTable
              rows={table.rows}
              caption={`${league.name} table`}
              powerRanks={powerRanks}
            />
            <p className="mt-4 text-sm text-muted">
              League standings from football-data.org. Power # is the club&apos;s position in the
              Footiqra ranking across all {LEAGUES.length} leagues.
            </p>
          </>
        ) : (
          <DataNotice reason="The league table will appear after the next data update." />
        )}
      </section>

      {performance && (
        <section aria-labelledby="performance-heading">
          <SectionHeading
            id="performance-heading"
            title="Table vs. strength"
            aside={
              <Link href="/table-vs-strength/" className="text-sm text-muted hover:text-foreground">
                All leagues
              </Link>
            }
          />
          <PerformanceCards over={performance.over} under={performance.under} previous={weekAgo} />
        </section>
      )}

      <section aria-labelledby="teams-heading">
        <SectionHeading
          id="teams-heading"
          title="Teams by power rating"
          aside={
            <Link href="/methodology/" className="text-sm text-muted hover:text-foreground">
              What the numbers mean
            </Link>
          }
        />
        {rows.length > 0 ? (
          <RankingTable
            rows={rows}
            caption={`${league.name} teams ordered by Footiqra power rating`}
            showLeague={false}
            rankLabel="Overall"
          />
        ) : (
          <DataNotice
            reason={teams.status === "ok" ? "The ranking is being calculated." : teams.reason}
          />
        )}
        {teams.status === "ok" && <LastUpdated utc={teams.lastUpdatedUtc} />}
      </section>
    </div>
  );
}
