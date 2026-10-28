import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated, MatchList } from "@/components/match-list";
import { getLeagueBySlug } from "@/config/leagues";
import { getAllTeamSlugs, getTeam, getTeamRanking } from "@/data";
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

  return (
    <div className="space-y-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          ...(league ? [{ name: league.name, path: `/leagues/${league.slug}/` }] : []),
          { name: team.name, path: `/teams/${team.slug}/` },
        ])}
      />
      <header className="space-y-1">
        {league && (
          <Link href={`/leagues/${league.slug}/`} className="text-sm text-muted hover:text-accent">
            {league.name}
          </Link>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{team.name}</h1>
      </header>

      {ranking && (
        <section aria-label="Power rating" className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-line px-5 py-3">
            <p className="text-xs text-muted">Power rank</p>
            <p className="font-mono text-2xl tabular-nums">#{ranking.rank}</p>
          </div>
          <div className="rounded-lg border border-line px-5 py-3">
            <p className="text-xs text-muted">Rating</p>
            <p className="font-mono text-2xl tabular-nums">{Math.round(ranking.rating)}</p>
          </div>
          <div className="rounded-lg border border-line px-5 py-3">
            <p className="text-xs text-muted">Matches rated</p>
            <p className="font-mono text-2xl tabular-nums">{ranking.matchesPlayed}</p>
          </div>
          <Link href="/methodology/" className="self-end text-sm text-muted hover:text-accent">
            How the rating works
          </Link>
        </section>
      )}

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="text-xl font-semibold">
          Latest results
        </h2>
        <div className="mt-3">
          {results.length > 0 ? (
            <MatchList matches={results} caption={`Latest results of ${team.name}`} />
          ) : (
            <p className="text-sm text-muted">No finished matches stored yet.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="fixtures-heading">
        <h2 id="fixtures-heading" className="text-xl font-semibold">
          Upcoming fixtures
        </h2>
        <div className="mt-3">
          {fixtures.length > 0 ? (
            <MatchList matches={fixtures} caption={`Upcoming fixtures of ${team.name}`} />
          ) : (
            <p className="text-sm text-muted">No scheduled matches stored.</p>
          )}
        </div>
      </section>

      <LastUpdated utc={result.lastUpdatedUtc} />
    </div>
  );
}
