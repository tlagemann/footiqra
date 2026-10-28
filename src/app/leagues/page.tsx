import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Crest, Eyebrow } from "@/components/ui";
import { leagueCountryList, LEAGUES } from "@/config/leagues";
import { getPowerRanking } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Leagues covered: Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and more",
  description: "Overview of the European football leagues covered by the Footiqra power ranking.",
  path: "/leagues/",
});

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

export default async function LeaguesPage() {
  const ranking = await getPowerRanking();
  const strengthBySlug = new Map(
    ranking.status === "ok" ? ranking.data.leagues.map((l) => [l.leagueSlug, l]) : [],
  );
  const leaderBySlug = new Map(
    ranking.status === "ok"
      ? LEAGUES.map((l) => [l.slug, ranking.data.rows.find((r) => r.team.leagueSlug === l.slug)])
      : [],
  );
  const leagues = [...LEAGUES].sort(
    (a, b) =>
      (strengthBySlug.get(b.slug)?.currentAdjustment ?? 0) -
      (strengthBySlug.get(a.slug)?.currentAdjustment ?? 0),
  );

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Leagues", path: "/leagues/" },
        ])}
      />
      <header>
        <Eyebrow>{LEAGUES.length} leagues</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
          Leagues
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Footiqra covers the top divisions of {leagueCountryList()}, sorted by current league
          strength.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => {
          const strength = strengthBySlug.get(league.slug);
          const leader = leaderBySlug.get(league.slug);
          return (
            <li key={league.slug}>
              <Link
                href={`/leagues/${league.slug}/`}
                className="flex h-full flex-col justify-between gap-10 rounded-3xl bg-surface p-6 transition hover:bg-surface-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">{league.country}</p>
                    <p className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                      {league.name}
                    </p>
                  </div>
                  {strength && (
                    <span className="tabular rounded-full bg-background px-3 py-1 font-display text-sm font-bold">
                      {signed(strength.currentAdjustment)}
                    </span>
                  )}
                </div>
                {leader && (
                  <div className="flex items-center gap-3">
                    <Crest src={leader.team.crest} name={leader.team.name} size={32} />
                    <div className="min-w-0 text-sm">
                      <p className="text-muted">Strongest team</p>
                      <p className="truncate font-semibold">
                        {leader.team.shortName || leader.team.name}
                      </p>
                    </div>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <section aria-labelledby="europe">
        <h2 id="europe" className="mb-4 font-display text-3xl font-extrabold tracking-[-0.035em]">
          European competition
        </h2>
        <Link
          href="/champions-league/"
          className="flex flex-col justify-between gap-6 rounded-3xl bg-foreground p-6 text-inverse transition hover:opacity-90 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-sm font-medium opacity-70">Europe</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-[-0.03em]">
              Champions League
            </p>
          </div>
          <p className="max-w-sm text-sm opacity-70">
            League phase table, forecasts for matches between covered clubs and the strongest teams
            in the competition.
          </p>
        </Link>
      </section>
    </div>
  );
}
