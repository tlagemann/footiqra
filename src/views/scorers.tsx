import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLastUpdated, getLeagueScorers, type LeagueScorer } from "@/data";
import { fmtDecimal, paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Top scorer pages: one per league (/leagues/{slug}/top-scorers/, top 100)
 * and an overview of all leagues (/top-scorers/).
 * League goals only, from each league's official scorer list.
 */
export function leagueScorersStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

const goalsWord = (locale: Locale, n: number) =>
  // German forms follow "mit": "mit 1 Tor", "mit 8 Toren".
  locale === "de" ? (n === 1 ? "Tor" : "Toren") : n === 1 ? "goal" : "goals";

/** "Kane leads with 12 goals, ahead of A (9) and B (8)." */
function leaderLine(list: LeagueScorer[], locale: Locale, leagueName: string): string | null {
  const [a, b, c] = list;
  if (!a) return null;
  const tied = list.filter((s) => s.goals === a.goals);
  if (tied.length > 1) {
    const names = tied.slice(0, 3).map((s) => s.name);
    const joined = names.slice(0, -1).join(", ") + tr(locale, " and ", " und ") + names.at(-1);
    return tr(
      locale,
      `${joined} share the lead in the ${leagueName} scoring chart with ${a.goals} ${goalsWord(locale, a.goals)} each.`,
      `${joined} führen die Torjägerliste der ${leagueName} mit je ${a.goals} ${goalsWord(locale, a.goals)} an.`,
    );
  }
  const rest = [b, c].filter(Boolean).map((s) => `${s!.name} (${s!.goals})`);
  const behind = rest.length
    ? tr(locale, `, ahead of ${rest.join(" and ")}`, `, vor ${rest.join(" und ")}`)
    : "";
  return tr(
    locale,
    `${a.name} (${a.team.name}) leads the ${leagueName} scoring chart with ${a.goals} ${goalsWord(locale, a.goals)}${behind}.`,
    `${a.name} (${a.team.name}) führt die Torjägerliste der ${leagueName} mit ${a.goals} ${goalsWord(locale, a.goals)} an${behind}.`,
  );
}

function ScorerTable({
  scorers,
  locale,
  caption,
  showLeague = false,
}: {
  scorers: LeagueScorer[];
  locale: Locale;
  caption: string;
  showLeague?: boolean;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const num = "tabular px-2 py-3 text-right";
  const head = "px-2 py-3 text-right text-xs font-medium text-muted";
  return (
    <div className="overflow-hidden rounded-3xl bg-surface">
      <table className="w-full text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-12 py-3 pl-4 text-left text-xs font-medium text-muted sm:pl-6"
            >
              #
            </th>
            <th scope="col" className="py-3 pr-2 text-left text-xs font-medium text-muted">
              {t("Player", "Spieler")}
            </th>
            <th scope="col" className={head}>
              {t("Goals", "Tore")}
            </th>
            <th scope="col" className={`${head} hidden sm:table-cell`}>
              {t("Assists", "Vorlagen")}
            </th>
            <th scope="col" className={`${head} hidden sm:table-cell`}>
              {t("Pen.", "Elfm.")}
            </th>
            <th scope="col" className={`${head} hidden md:table-cell`}>
              {t("Matches", "Spiele")}
            </th>
            <th scope="col" className={`${head} hidden md:table-cell pr-4 sm:pr-6`}>
              {t("Per match", "Pro Spiel")}
            </th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => {
            const sameRank = i > 0 && scorers[i - 1]!.rank === s.rank;
            const league = showLeague ? getLeagueBySlug(s.leagueSlug)?.name : undefined;
            return (
              <tr key={`${s.leagueSlug}-${s.playerId}`} className="border-t border-line/80">
                <td className="tabular py-3 pl-4 font-display font-bold text-muted sm:pl-6">
                  {sameRank ? "" : `${s.rank}.`}
                </td>
                <th scope="row" className="py-3 pr-2 text-left font-normal">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                    <Crest src={s.team.crest} name={s.team.name} size={16} />
                    {s.team.slug ? (
                      <Link
                        href={p.team(s.team.slug)}
                        className="hover:text-foreground hover:underline"
                      >
                        {s.team.name}
                      </Link>
                    ) : (
                      s.team.name
                    )}
                    {league ? ` · ${league}` : ""}
                  </span>
                </th>
                <td className={`${num} font-display text-lg font-extrabold`}>{s.goals}</td>
                <td className={`${num} hidden text-muted sm:table-cell`}>{s.assists ?? "·"}</td>
                <td className={`${num} hidden text-muted sm:table-cell`}>{s.penalties ?? "·"}</td>
                <td className={`${num} hidden text-muted md:table-cell`}>
                  {s.playedMatches ?? "·"}
                </td>
                <td className={`${num} hidden pr-4 text-muted sm:pr-6 md:table-cell`}>
                  {s.playedMatches ? fmtDecimal(locale, s.goals / s.playedMatches, 2) : "·"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const noteText = (locale: Locale) =>
  tr(
    locale,
    "League matches only, from the official scorer list of each league. Pen.: goals from penalties. Equal goals share a rank.",
    "Nur Ligaspiele, aus der offiziellen Torjägerliste der jeweiligen Liga. Elfm.: Tore per Elfmeter. Bei gleich vielen Toren gilt derselbe Rang.",
  );

/* ---------- One league ---------- */

export async function leagueScorersMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const league = getLeagueBySlug(slug);
  if (!league) return {};
  const data = await getLeagueScorers(league.slug);
  const season = data ? ` ${seasonLabel(data.season)}` : "";
  const lead = data ? leaderLine(data.scorers, locale, league.name) : null;
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${league.name}${season} top scorers`,
      `${league.name}${season}: Torjägerliste`,
    ),
    description:
      (lead ? `${lead} ` : "") +
      tr(
        locale,
        `The 100 best goalscorers of the ${league.name} with goals, assists and penalties.`,
        `Die 100 besten Torschützen der ${league.name} mit Toren, Vorlagen und Elfmetern.`,
      ),
    paths: {
      en: paths("en").leagueScorers(league.slug),
      de: paths("de").leagueScorers(league.slug),
    },
    image: ogImage.scorers(league.slug),
  });
}

export async function LeagueScorersView({ locale, slug }: { locale: Locale; slug: string }) {
  const league = getLeagueBySlug(slug);
  if (!league) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [data, lastUpdated] = await Promise.all([getLeagueScorers(league.slug), getLastUpdated()]);
  const list = data?.scorers.slice(0, 100) ?? [];
  const lead = leaderLine(list, locale, league.name);

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: league.name, path: p.league(league.slug) },
          { name: t("Top scorers", "Torjäger"), path: p.leagueScorers(league.slug) },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={p.league(league.slug)} className="hover:underline">
            {league.name}
          </Link>
          {data ? ` · ${seasonLabel(data.season)}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Top scorers", "Torjäger")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {lead ??
            t(
              `The best goalscorers of the ${league.name} this season.`,
              `Die besten Torschützen der ${league.name} in dieser Saison.`,
            )}
        </p>
      </header>

      {list.length > 0 ? (
        <section aria-labelledby="scorers-heading">
          <SectionHeading
            id="scorers-heading"
            title={t(`Top ${list.length}`, `Top ${list.length}`)}
            aside={
              <Link href={p.scorers} className="text-sm text-muted hover:text-foreground">
                {t("All leagues", "Alle Ligen")}
              </Link>
            }
          />
          <ScorerTable
            scorers={list}
            locale={locale}
            caption={t(`${league.name} top scorers`, `Torjäger der ${league.name}`)}
          />
          <p className="mt-4 max-w-3xl text-sm text-muted">{noteText(locale)}</p>
        </section>
      ) : (
        <DataNotice
          reason={t(
            "The scorer list has not been imported yet.",
            "Die Torjägerliste wurde noch nicht importiert.",
          )}
          locale={locale}
        />
      )}

      <nav aria-label={t("Other leagues", "Andere Ligen")} className="flex flex-wrap gap-2 text-sm">
        {LEAGUES.filter((l) => l.slug !== league.slug).map((l) => (
          <Link
            key={l.slug}
            href={p.leagueScorers(l.slug)}
            className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
          >
            {l.name}
          </Link>
        ))}
      </nav>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}

/* ---------- All leagues ---------- */

export function scorersIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Top scorers in Europe's top leagues", "Torjäger der europäischen Topligen"),
    description: tr(
      locale,
      "The best goalscorers of the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie this season, with the top 100 of every league.",
      "Die besten Torschützen von Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga und Eredivisie in dieser Saison, mit den Top 100 jeder Liga.",
    ),
    paths: { en: paths("en").scorers, de: paths("de").scorers },
    image: ogImage.scorersIndex,
  });
}

export async function ScorersIndexView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [all, lastUpdated] = await Promise.all([
    Promise.all(LEAGUES.map((l) => getLeagueScorers(l.slug))),
    getLastUpdated(),
  ]);
  const merged = all
    .flatMap((d) => d?.scorers ?? [])
    .sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0));
  const europe = merged.slice(0, 20).map((s) => ({
    ...s,
    rank: 1 + merged.filter((o) => o.goals > s.goals).length,
  }));

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Top scorers", "Torjäger"), path: p.scorers },
        ])}
      />
      <header>
        <Eyebrow>{t("Europe's top leagues", "Europas Topligen")}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Top scorers", "Torjäger")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {europe[0]
            ? t(
                `${europe[0].name} (${europe[0].team.name}) is the leading league scorer across Europe's seven top leagues with ${europe[0].goals} goals. Below: the best scorers of every league, each with a full top 100.`,
                `${europe[0].name} (${europe[0].team.name}) ist mit ${europe[0].goals} Toren der beste Ligatorschütze in Europas sieben Topligen. Darunter: die besten Torschützen jeder Liga, jeweils mit kompletter Top 100.`,
              )
            : t(
                "The best goalscorers of Europe's seven top leagues.",
                "Die besten Torschützen der sieben Topligen Europas.",
              )}
        </p>
      </header>

      {europe.length > 0 ? (
        <section aria-labelledby="europe-heading">
          <SectionHeading
            id="europe-heading"
            title={t("Across all leagues", "Über alle Ligen")}
            aside={<span className="text-sm text-muted">Top {europe.length}</span>}
          />
          <ScorerTable
            scorers={europe}
            locale={locale}
            showLeague
            caption={t("Top scorers across Europe's top leagues", "Torjäger über alle Topligen")}
          />
          <p className="mt-4 max-w-3xl text-sm text-muted">
            {t(
              "Leagues play different numbers of matches (the Bundesliga, Eredivisie and Primeira Liga have 18 clubs), so goals per match is the fairer comparison.",
              "Die Ligen haben unterschiedlich viele Spieltage (Bundesliga, Eredivisie und Primeira Liga haben 18 Vereine), fairer ist deshalb der Vergleich der Tore pro Spiel.",
            )}{" "}
            {noteText(locale)}
          </p>
        </section>
      ) : (
        <DataNotice
          reason={t(
            "The scorer lists have not been imported yet.",
            "Die Torjägerlisten wurden noch nicht importiert.",
          )}
          locale={locale}
        />
      )}

      <section aria-labelledby="leagues-heading">
        <SectionHeading id="leagues-heading" title={t("By league", "Nach Liga")} />
        <div className="grid gap-6 lg:grid-cols-2">
          {LEAGUES.map((league, i) => {
            const top = all[i]?.scorers.slice(0, 5) ?? [];
            return (
              <div key={league.slug} className="min-w-0 rounded-3xl bg-surface p-5 sm:p-6">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">
                    <Link href={p.leagueScorers(league.slug)} className="hover:underline">
                      {league.name}
                    </Link>
                  </h3>
                  <Link
                    href={p.leagueScorers(league.slug)}
                    className="text-sm font-semibold whitespace-nowrap"
                  >
                    Top 100 <span aria-hidden>→</span>
                  </Link>
                </div>
                {top.length > 0 ? (
                  <ol>
                    {top.map((s, j) => (
                      <li
                        key={s.playerId}
                        className="flex items-center gap-3 border-t border-line/80 py-2.5 first:border-t-0"
                      >
                        <span className="tabular w-6 font-display font-bold text-muted">
                          {j > 0 && top[j - 1]!.rank === s.rank ? "" : `${s.rank}.`}
                        </span>
                        <Crest src={s.team.crest} name={s.team.name} size={20} />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{s.name}</span>{" "}
                          <span className="text-sm text-muted">{s.team.name}</span>
                        </span>
                        <span className="tabular font-display text-lg font-extrabold">
                          {s.goals}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted">{t("No data yet.", "Noch keine Daten.")}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
