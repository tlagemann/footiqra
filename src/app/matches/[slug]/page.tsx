import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProbabilityBar } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LocalTime } from "@/components/local-time";
import { LastUpdated, MatchList } from "@/components/match-list";
import { Crest, Eyebrow, FormGuide, SectionHeading } from "@/components/ui";
import { getLeagueBySlug } from "@/config/leagues";
import { getSiteUrl } from "@/config/site";
import { getAllMatchSlugs, getLastUpdated, getMatch, type MatchDetail } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/**
 * Match pages: /matches/{home}-vs-{away}-{season}/
 * One page per match of the current league seasons (plus Champions League
 * matches between covered clubs). Before kick-off: forecast and form.
 * After the match: result next to the pre-match forecast.
 */
export const dynamicParams = false;

const NO_MATCHES_PLACEHOLDER = "no-matches-yet";

export async function generateStaticParams() {
  const slugs = await getAllMatchSlugs();
  return (slugs.length > 0 ? slugs : [NO_MATCHES_PLACEHOLDER]).map((slug) => ({ slug }));
}

const isFinished = (m: MatchDetail) =>
  m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

export async function generateMetadata({
  params,
}: PageProps<"/matches/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = slug === NO_MATCHES_PLACEHOLDER ? undefined : await getMatch(slug);
  if (!m) {
    return pageMetadata({
      title: "Matches",
      description: "Match pages are not available yet.",
      path: `/matches/${slug}/`,
      noIndex: true,
    });
  }
  const h = m.home.shortName;
  const a = m.away.shortName;
  const date = dateLabel(m.utcDate);
  if (isFinished(m)) {
    return pageMetadata({
      title: `${h} ${m.homeGoals}:${m.awayGoals} ${a}: result, stats and pre-match prediction`,
      description: `${m.home.name} vs ${m.away.name}, ${m.competitionName}, ${date}: result ${m.homeGoals}:${m.awayGoals}, the pre-match forecast, form and season stats of both clubs.`,
      path: `/matches/${m.slug}/`,
    });
  }
  const p = m.forecast?.percentages;
  return pageMetadata({
    title: `${h} vs ${a} prediction, stats and form (${date})`,
    description: p
      ? `${m.home.name} vs ${m.away.name}, ${m.competitionName}, ${date}: ${h} win ${p.home}%, draw ${p.draw}%, ${a} win ${p.away}%. Form, table and season stats of both clubs.`
      : `${m.home.name} vs ${m.away.name}, ${m.competitionName}, ${date}: form, table and season stats of both clubs.`,
    path: `/matches/${m.slug}/`,
  });
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const perGame = (total: number, played: number) => (played > 0 ? (total / played).toFixed(2) : "·");
const share = (n: number, played: number) =>
  played > 0 ? `${Math.round((n / played) * 100)}%` : "·";
const record = (r: { won: number; drawn: number; lost: number }) => `${r.won}-${r.drawn}-${r.lost}`;

/** Plain-language summary: the main text of the page for readers and search engines. */
function summary(m: MatchDetail): string[] {
  const h = m.home;
  const a = m.away;
  const lines: string[] = [];
  const describe = (s: MatchDetail["home"]) => {
    const league = getLeagueBySlug(s.leagueSlug)?.name ?? "their league";
    const parts: string[] = [];
    if (s.ranking) {
      parts.push(
        `${s.shortName} are ${ordinal(s.ranking.rank)} in the Footiqra power ranking (rating ${Math.round(s.ranking.rating)})`,
      );
    }
    if (s.table) {
      parts.push(
        `${ordinal(s.table.position)} in the ${league} with ${s.table.points} points from ${s.table.playedGames} matches`,
      );
    }
    return parts.length > 0 ? `${parts.join(" and ")}.` : null;
  };
  for (const s of [h, a]) {
    const text = describe(s);
    if (text) lines.push(text);
  }
  const p = m.forecast?.percentages;
  if (p) {
    const fav = p.home > p.away + 5 ? h.shortName : p.away > p.home + 5 ? a.shortName : null;
    if (isFinished(m)) {
      const outcome =
        m.homeGoals! > m.awayGoals! ? "home" : m.homeGoals! < m.awayGoals! ? "away" : "draw";
      const chance = p[outcome];
      const result =
        outcome === "draw"
          ? `The match ended in a ${m.homeGoals}:${m.awayGoals} draw`
          : `${outcome === "home" ? h.shortName : a.shortName} won ${m.homeGoals}:${m.awayGoals}`;
      const favourite = p.home >= p.away ? "home" : "away";
      const verdict =
        outcome === "draw"
          ? ""
          : outcome === favourite
            ? ", so the favourite delivered"
            : chance < 30
              ? ", so it was an upset"
              : "";
      lines.push(
        `${result}. Before kick-off the model gave this outcome a ${chance}% chance${verdict}.`,
      );
    } else {
      lines.push(
        fav
          ? `The model sees ${fav} as favourite: ${h.shortName} win ${p.home}%, draw ${p.draw}%, ${a.shortName} win ${p.away}%.`
          : `The model expects a close match: ${h.shortName} win ${p.home}%, draw ${p.draw}%, ${a.shortName} win ${p.away}%.`,
      );
    }
  }
  return lines;
}

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: React.ReactNode;
  away: React.ReactNode;
}) {
  return (
    <tr className="border-t border-line/80">
      <td className="tabular w-1/3 py-3 pl-5 text-left font-display text-lg font-bold sm:pl-7">
        {home}
      </td>
      <th scope="row" className="py-3 text-center text-sm font-medium text-muted">
        {label}
      </th>
      <td className="tabular w-1/3 py-3 pr-5 text-right font-display text-lg font-bold sm:pr-7">
        {away}
      </td>
    </tr>
  );
}

export default async function MatchPage({ params }: PageProps<"/matches/[slug]">) {
  const { slug } = await params;
  if (slug === NO_MATCHES_PLACEHOLDER) notFound();
  const [m, lastUpdated] = await Promise.all([getMatch(slug), getLastUpdated()]);
  if (!m) notFound();

  const finished = isFinished(m);
  const league = m.leagueSlug ? getLeagueBySlug(m.leagueSlug) : undefined;
  const h = m.home;
  const a = m.away;
  const statusLabel: Record<string, string> = {
    POSTPONED: "Postponed",
    CANCELLED: "Cancelled",
    SUSPENDED: "Suspended",
    IN_PLAY: "Live",
    PAUSED: "Half-time",
  };
  const base = getSiteUrl();

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          league
            ? { name: league.name, path: `/leagues/${league.slug}/` }
            : { name: "Predictions", path: "/predictions/" },
          { name: `${h.shortName} vs ${a.shortName}`, path: `/matches/${m.slug}/` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${h.name} vs ${a.name}`,
          sport: "Football",
          startDate: m.utcDate,
          eventStatus:
            m.status === "POSTPONED"
              ? "https://schema.org/EventPostponed"
              : m.status === "CANCELLED"
                ? "https://schema.org/EventCancelled"
                : "https://schema.org/EventScheduled",
          homeTeam: { "@type": "SportsTeam", name: h.name, url: `${base}/teams/${h.slug}/` },
          awayTeam: { "@type": "SportsTeam", name: a.name, url: `${base}/teams/${a.slug}/` },
          superEvent: { "@type": "SportsEvent", name: m.competitionName },
          url: `${base}/matches/${m.slug}/`,
        }}
      />

      <header>
        <Eyebrow>
          {m.competitionName}
          {m.matchday ? ` · Matchday ${m.matchday}` : ""}
        </Eyebrow>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] bg-surface px-4 py-8 sm:gap-6 sm:px-10 sm:py-10">
          <Link href={`/teams/${h.slug}/`} className="flex flex-col items-center gap-3 text-center">
            <Crest src={h.crest} name={h.name} size={72} />
            <span className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] sm:text-3xl">
              {h.shortName}
            </span>
          </Link>
          <div className="text-center">
            {finished ? (
              <p className="tabular font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">
                {m.homeGoals}:{m.awayGoals}
              </p>
            ) : (
              <p className="font-display text-2xl font-extrabold text-muted sm:text-4xl">vs</p>
            )}
            <p className="mt-2 text-xs font-medium text-muted sm:text-sm">
              {finished
                ? "Full time · "
                : statusLabel[m.status]
                  ? `${statusLabel[m.status]} · `
                  : ""}
              <LocalTime utc={m.utcDate} />
            </p>
          </div>
          <Link href={`/teams/${a.slug}/`} className="flex flex-col items-center gap-3 text-center">
            <Crest src={a.crest} name={a.name} size={72} />
            <span className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] sm:text-3xl">
              {a.shortName}
            </span>
          </Link>
        </div>
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl">
          {finished
            ? `${h.shortName} ${m.homeGoals}:${m.awayGoals} ${a.shortName}`
            : `${h.shortName} vs ${a.shortName}: prediction and stats`}
        </h1>
        <div className="mt-4 max-w-3xl space-y-2 text-lg text-muted">
          {summary(m).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      {m.forecast && (
        <section aria-labelledby="forecast-heading">
          <SectionHeading
            id="forecast-heading"
            title={m.forecast.basis === "pre-match" ? "Pre-match forecast" : "Forecast"}
            aside={
              <Link
                href="/methodology/#forecasts"
                className="text-sm text-muted hover:text-foreground"
              >
                How it works
              </Link>
            }
          />
          <div className="rounded-3xl bg-surface p-5 sm:p-7">
            <ProbabilityBar
              percentages={m.forecast.percentages}
              labels={{ home: h.shortName, draw: "draw", away: a.shortName }}
              large
            />
            <p className="mt-4 text-sm text-muted">
              {m.forecast.basis === "pre-match"
                ? "Calculated with both ratings as they were before kick-off."
                : "Based on the current ratings; it changes as results come in. Model estimate, not betting advice."}
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="compare-heading">
        <SectionHeading
          id="compare-heading"
          title="Comparison"
          aside={<span className="text-sm text-muted">League matches this season</span>}
        />
        <div className="overflow-hidden rounded-3xl bg-surface">
          <table className="w-full text-[15px]">
            <caption className="sr-only">
              Season statistics of {h.name} and {a.name}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-4 pl-5 text-left sm:pl-7">
                  <span className="flex items-center gap-2 font-semibold">
                    <Crest src={h.crest} name={h.name} size={24} />
                    <span className="truncate">{h.shortName}</span>
                  </span>
                </th>
                <th scope="col" className="sr-only">
                  Statistic
                </th>
                <th scope="col" className="py-4 pr-5 text-right sm:pr-7">
                  <span className="flex items-center justify-end gap-2 font-semibold">
                    <span className="truncate">{a.shortName}</span>
                    <Crest src={a.crest} name={a.name} size={24} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <StatRow
                label="Power rank"
                home={h.ranking ? `#${h.ranking.rank}` : "·"}
                away={a.ranking ? `#${a.ranking.rank}` : "·"}
              />
              <StatRow
                label="Rating"
                home={h.ranking ? Math.round(h.ranking.rating) : "·"}
                away={a.ranking ? Math.round(a.ranking.rating) : "·"}
              />
              <StatRow
                label="League position"
                home={h.table ? ordinal(h.table.position) : "·"}
                away={a.table ? ordinal(a.table.position) : "·"}
              />
              <StatRow label="Points" home={h.table?.points ?? "·"} away={a.table?.points ?? "·"} />
              <StatRow label="Won-drawn-lost" home={record(h.stats)} away={record(a.stats)} />
              <StatRow
                label="Home / away record"
                home={record(h.stats.home)}
                away={record(a.stats.away)}
              />
              <StatRow
                label="Goals per match"
                home={perGame(h.stats.goalsFor, h.stats.played)}
                away={perGame(a.stats.goalsFor, a.stats.played)}
              />
              <StatRow
                label="Conceded per match"
                home={perGame(h.stats.goalsAgainst, h.stats.played)}
                away={perGame(a.stats.goalsAgainst, a.stats.played)}
              />
              <StatRow
                label="Clean sheets"
                home={share(h.stats.cleanSheets, h.stats.played)}
                away={share(a.stats.cleanSheets, a.stats.played)}
              />
              <StatRow
                label="Both teams scored"
                home={share(h.stats.bothScored, h.stats.played)}
                away={share(a.stats.bothScored, a.stats.played)}
              />
              <StatRow
                label="3+ goals in match"
                home={share(h.stats.over25, h.stats.played)}
                away={share(a.stats.over25, a.stats.played)}
              />
              <StatRow
                label="Form"
                home={<FormGuide form={h.form} />}
                away={
                  <span className="flex justify-end">
                    <FormGuide form={a.form} />
                  </span>
                }
              />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Home / away record: {h.shortName} at home, {a.shortName} away. Form includes all
          competitions.
        </p>
      </section>

      <section aria-labelledby="h2h-heading">
        <SectionHeading id="h2h-heading" title="Previous meetings" />
        {m.headToHead.length > 0 ? (
          <MatchList
            matches={m.headToHead}
            caption={`Previous meetings of ${h.name} and ${a.name}`}
          />
        ) : (
          <p className="rounded-3xl bg-surface px-6 py-6 text-muted">
            No earlier meeting of these two clubs this season.
          </p>
        )}
      </section>

      <section aria-labelledby="recent-heading">
        <SectionHeading id="recent-heading" title="Latest results" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[h, a].map((s) => (
            <div key={s.slug} className="min-w-0">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                <Crest src={s.crest} name={s.name} size={24} />
                <Link
                  href={`/teams/${s.slug}/`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {s.shortName}
                </Link>
              </h3>
              {s.recent.length > 0 ? (
                <MatchList matches={s.recent} caption={`Latest results of ${s.name}`} />
              ) : (
                <p className="rounded-3xl bg-surface px-6 py-6 text-muted">No results yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="Related pages" className="flex flex-wrap gap-2 text-sm">
        {league && (
          <Link
            href={`/leagues/${league.slug}/`}
            className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
          >
            {league.name} table and ranking
          </Link>
        )}
        <Link
          href="/predictions/"
          className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
        >
          All predictions
        </Link>
      </nav>
      {lastUpdated && <LastUpdated utc={lastUpdated} />}
    </div>
  );
}
