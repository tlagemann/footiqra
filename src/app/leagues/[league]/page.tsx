import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLeagueTeams, getPowerRanking } from "@/data";
import { RankingTable } from "@/components/ranking-table";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Only the five registered leagues exist; anything else is a 404.
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

export default async function LeaguePage({ params }: PageProps<"/leagues/[league]">) {
  const league = getLeagueBySlug((await params).league);
  if (!league) notFound();

  const [teams, ranking] = await Promise.all([getLeagueTeams(league.slug), getPowerRanking()]);
  const rows =
    ranking.status === "ok"
      ? ranking.data.rows.filter((r) => r.team.leagueSlug === league.slug)
      : [];
  const strength =
    ranking.status === "ok"
      ? ranking.data.leagues.find((l) => l.leagueSlug === league.slug)
      : undefined;

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Leagues", path: "/leagues/" },
          { name: league.name, path: `/leagues/${league.slug}/` },
        ])}
      />
      <header className="space-y-1">
        <p className="text-sm text-muted">{league.country}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{league.name}</h1>
        {strength && (
          <p className="text-sm text-muted">
            League strength:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {strength.currentAdjustment >= 0 ? "+" : ""}
              {Math.round(strength.currentAdjustment)}
            </span>{" "}
            rating points (
            <Link href="/methodology/" className="underline underline-offset-4">
              what this means
            </Link>
            )
          </p>
        )}
      </header>
      <section aria-labelledby="teams-heading">
        <h2 id="teams-heading" className="text-xl font-semibold">
          Teams by power rating
        </h2>
        <div className="mt-4">
          {rows.length > 0 ? (
            <RankingTable
              rows={rows}
              caption={`${league.name} teams ordered by Footiqra power rating`}
              showLeague={false}
              rankLabel="Overall"
            />
          ) : teams.status === "ok" ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.data.map((team) => (
                <li key={team.slug}>
                  <Link
                    href={`/teams/${team.slug}/`}
                    className="block rounded-lg border border-line px-4 py-3 hover:border-accent"
                  >
                    {team.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <DataNotice reason={teams.reason} />
          )}
        </div>
      </section>
      {teams.status === "ok" && <LastUpdated utc={teams.lastUpdatedUtc} />}
    </div>
  );
}
