import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { ForecastList } from "@/components/forecast-list";
import { LastUpdated, MatchList } from "@/components/match-list";
import { Crest, FormGuide, SectionHeading } from "@/components/ui";
import { getLeagueBySlug } from "@/config/leagues";
import { getAllTeamSlugs, getTeam, getTeamRanking, getUpcomingForecasts } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/**
 * Team profiles: /teams/{slug}/
 * Slugs come from data/teams.json and never change once assigned.
 * Unknown slugs return 404.
 */
export const dynamicParams = false;

/**
 * A static export refuses dynamic routes with zero params. While no teams have been
 * imported, this single noindex placeholder keeps the build working. It is excluded
 * from the sitemap and disappears as soon as real teams exist.
 */
const NO_TEAMS_PLACEHOLDER = "no-teams-yet";

export async function generateStaticParams() {
  const slugs = await getAllTeamSlugs();
  return (slugs.length > 0 ? slugs : [NO_TEAMS_PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/teams/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return pageMetadata({
      title: "Teams",
      description: "Team profiles are not available yet.",
      path: `/teams/${slug}/`,
      noIndex: true,
    });
  }
  const result = await getTeam(slug);
  if (result.status !== "ok") return {};
  const { team } = result.data;
  const league = getLeagueBySlug(team.leagueSlug);
  return pageMetadata({
    title: `${team.name}: power rating, results and fixtures`,
    description: `${team.name} (${league?.name ?? "Europe"}): latest results, upcoming fixtures and team strength on Footiqra.`,
    path: `/teams/${team.slug}/`,
  });
}

export default async function TeamPage({ params }: PageProps<"/teams/[slug]">) {
  const { slug } = await params;
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return <DataNotice title="No team profiles yet" reason="Team data has not been imported." />;
  }

  const result = await getTeam(slug);
  if (result.status !== "ok") notFound();
  const { team, results, fixtures } = result.data;
  const league = getLeagueBySlug(team.leagueSlug);
  const ranking = await getTeamRanking(team.slug);
  const forecasts = (await getUpcomingForecasts())
    .filter((f) => f.home.slug === team.slug || f.away.slug === team.slug)
    .slice(0, 3);
  const forecastIds = new Set(forecasts.map((f) => f.id));
  const otherFixtures = fixtures.filter((f) => !forecastIds.has(f.id));

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          ...(league ? [{ name: league.name, path: `/leagues/${league.slug}/` }] : []),
          { name: team.name, path: `/teams/${team.slug}/` },
        ])}
      />
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-surface">
          <Crest src={team.crest} name={team.name} size={72} />
        </span>
        <div className="min-w-0">
          {league && (
            <Link
              href={`/leagues/${league.slug}/`}
              className="text-sm font-semibold text-brand-ink hover:underline hover:underline-offset-4"
            >
              {league.name}
            </Link>
          )}
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-0.045em] sm:text-6xl">
            {team.name}
          </h1>
        </div>
      </header>

      {ranking && (
        <section aria-labelledby="rating-heading">
          <h2 id="rating-heading" className="sr-only">
            Power rating
          </h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-3xl bg-foreground px-6 py-5 text-inverse">
              <dt className="text-xs font-medium opacity-70">Power rank</dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold tracking-[-0.04em]">
                #{ranking.rank}
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-6 py-5">
              <dt className="text-xs font-medium text-muted">Rating</dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold tracking-[-0.04em]">
                {Math.round(ranking.rating)}
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-6 py-5">
              <dt className="text-xs font-medium text-muted">Form (last 5)</dt>
              <dd className="mt-3">
                <FormGuide form={ranking.form} />
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-6 py-5">
              <dt className="text-xs font-medium text-muted">Matches rated</dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold tracking-[-0.04em]">
                {ranking.matchesPlayed}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            <Link
              href="/methodology/"
              className="underline underline-offset-4 hover:text-foreground"
            >
              How the rating works
            </Link>
          </p>
        </section>
      )}

      <section aria-labelledby="results-heading">
        <SectionHeading id="results-heading" title="Latest results" />
        {results.length > 0 ? (
          <MatchList matches={results} caption={`Latest results of ${team.name}`} />
        ) : (
          <DataNotice title="No results yet" reason="No finished matches stored yet." />
        )}
      </section>

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

      {(otherFixtures.length > 0 || forecasts.length === 0) && (
        <section aria-labelledby="fixtures-heading">
          <SectionHeading
            id="fixtures-heading"
            title={forecasts.length > 0 ? "More fixtures" : "Upcoming fixtures"}
          />
          {otherFixtures.length > 0 ? (
            <MatchList matches={otherFixtures} caption={`Upcoming fixtures of ${team.name}`} />
          ) : (
            <DataNotice title="No fixtures" reason="No scheduled matches stored." />
          )}
        </section>
      )}
      <LastUpdated utc={result.lastUpdatedUtc} />
    </div>
  );
}
