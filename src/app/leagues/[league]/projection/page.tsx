import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { chance, ProjectionTable } from "@/components/projection-table";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLastUpdated, getLeagueProjection } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

const seasonLabel = (season: number) => `${season}/${String(season + 1).slice(2)}`;

export async function generateMetadata({
  params,
}: PageProps<"/leagues/[league]/projection">): Promise<Metadata> {
  const league = getLeagueBySlug((await params).league);
  if (!league) return {};
  const projection = await getLeagueProjection(league.slug);
  const season = projection ? ` ${seasonLabel(projection.season)}` : "";
  const leader = projection?.rows[0];
  return pageMetadata({
    title: `${league.name}${season} predicted final table: title and relegation chances`,
    description: leader
      ? `Simulated ${league.name} final table: ${leader.team.name} win the title in ${chance(leader.title)} of ${projection.runs.toLocaleString("en-GB")} simulations. Expected points, top 4 and bottom 3 chances for every club.`
      : `Simulated ${league.name} final table with title and relegation chances.`,
    path: `/leagues/${league.slug}/projection/`,
  });
}

export default async function ProjectionPage({
  params,
}: PageProps<"/leagues/[league]/projection">) {
  const league = getLeagueBySlug((await params).league);
  if (!league) notFound();
  const [projection, lastUpdated] = await Promise.all([
    getLeagueProjection(league.slug),
    getLastUpdated(),
  ]);
  const leader = projection?.rows[0];

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: league.name, path: `/leagues/${league.slug}/` },
          { name: "Predicted table", path: `/leagues/${league.slug}/projection/` },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={`/leagues/${league.slug}/`} className="hover:underline">
            {league.name}
          </Link>
          {projection ? ` · ${seasonLabel(projection.season)}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          Predicted final table
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {projection && leader
            ? `We played the remaining ${projection.remainingMatches} matches ${projection.runs.toLocaleString("en-GB")} times with the Footiqra forecast model. ${leader.team.name} finish top in ${chance(leader.title)} of the simulations.`
            : "The simulation needs the current table and ratings for every club."}
        </p>
      </header>

      {projection ? (
        <section aria-labelledby="projection-heading">
          <SectionHeading
            id="projection-heading"
            title="Simulated standings"
            aside={<span className="text-sm text-muted">Sorted by expected points</span>}
          />
          <ProjectionTable
            rows={projection.rows}
            caption={`${league.name} predicted final table`}
          />
          <p className="mt-4 max-w-3xl text-sm text-muted">
            Today: current table position and points. Final pts: expected points at the end of the
            season. Title, top 4 and bottom 3: share of simulations in which the club finished
            there. These are plain table positions; how many places lead to Europe or relegation
            depends on the league&apos;s rules. The coloured strip shows how likely every final
            position is.
          </p>
        </section>
      ) : (
        <DataNotice reason="The league table has not been imported yet." />
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          How the simulation works
        </h2>
        <p>
          Every simulation starts from the official table. Each remaining match is decided at random
          with the win, draw and loss probabilities of the forecast model; ratings then move as they
          would after a real result. Ties on points are split by goal difference. League specific
          tie-breakers such as head-to-head records are not modelled.{" "}
          <Link href="/methodology/#simulation" className="underline underline-offset-4">
            Methodology
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} />}
    </div>
  );
}
