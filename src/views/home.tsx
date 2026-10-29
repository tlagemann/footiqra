import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { LeagueStrength } from "@/components/league-strength";
import { LastUpdated } from "@/components/match-list";
import { PerformanceCards } from "@/components/performance";
import { chance } from "@/components/projection-table";
import { RankingTable } from "@/components/ranking-table";
import { ButtonLink, Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { SITE, SITE_TEXT } from "@/config/site";
import {
  biggestMatches,
  getAllTableVsStrength,
  getLeagueProjection,
  getPowerRanking,
  getUpcomingForecasts,
  getWeekAgo,
  nextWindow,
  topAcrossLeagues,
} from "@/data";
import { fmtInt, paths, tr, type Locale } from "@/i18n";
import { organizationJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function homeMetadata(locale: Locale): Metadata {
  const text = SITE_TEXT[locale];
  return {
    ...pageMetadata({
      locale,
      title: text.tagline,
      description: text.description,
      paths: { en: paths("en").home, de: paths("de").home },
      image: ogImage.home,
    }),
    title: { absolute: `${SITE.name}: ${text.tagline}` },
  };
}

export async function HomeView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const ranking = await getPowerRanking();
  const top = ranking.status === "ok" ? ranking.data.rows.slice(0, 3) : [];
  const performance = topAcrossLeagues(await getAllTableVsStrength(10), 3);
  const weekAgo = await getWeekAgo();
  const bigGames = biggestMatches(nextWindow(await getUpcomingForecasts(), 7), 3).sort(
    (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate),
  );
  const projections = (
    await Promise.all(
      LEAGUES.map(async (l) => ({ league: l, p: await getLeagueProjection(l.slug) })),
    )
  ).flatMap(({ league, p: proj }) =>
    proj ? [{ league, favourite: proj.rows.reduce((a, b) => (b.title > a.title ? b : a)) }] : [],
  );
  const hasPerformance = performance.over.length + performance.under.length > 0;

  return (
    <div className="space-y-20 sm:space-y-28">
      <JsonLd data={organizationJsonLd()} />
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Eyebrow>{t("Cross-league power ranking", "Ligaübergreifendes Power-Ranking")}</Eyebrow>
          <h1 className="mt-5 font-display text-[2.9rem] leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
            {t("Every top club. One ranking.", "Alle Topklubs. Ein Ranking.")}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            {SITE_TEXT[locale].description}{" "}
            {t(
              "Updated several times a day from real match results.",
              "Mehrmals täglich aus echten Spielergebnissen aktualisiert.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#ranking-section">{t("See the ranking", "Zum Ranking")}</ButtonLink>
            <ButtonLink href={p.methodology} variant="secondary">
              {t("How it works", "So funktioniert es")}
            </ButtonLink>
          </div>
        </div>

        {top.length > 0 && (
          <div className="rounded-[2rem] bg-surface p-3 sm:p-4">
            <p className="px-3 pt-2 pb-3 text-sm font-semibold text-muted">
              {t("Top 3 right now", "Aktuelle Top 3")}
            </p>
            <ol className="space-y-2">
              {top.map((row) => (
                <li key={row.team.slug}>
                  <Link
                    href={p.team(row.team.slug)}
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
                  {ranking.data.rows.length} {t("teams", "Vereine")} · {LEAGUES.length}{" "}
                  {t("leagues", "Ligen")}
                </span>
              }
            />
            <LastUpdated
              utc={ranking.lastUpdatedUtc}
              locale={locale}
              className="-mt-2 mb-5 text-sm"
            />
            <RankingTable
              rows={ranking.data.rows}
              caption={t(
                "Footiqra power ranking of all teams in the covered leagues",
                "Footiqra Power-Ranking aller Vereine der abgedeckten Ligen",
              )}
              locale={locale}
            />
          </section>

          {bigGames.length > 0 && (
            <section aria-labelledby="big-games">
              <SectionHeading
                id="big-games"
                title={t("Biggest games this week", "Topspiele der Woche")}
                aside={
                  <Link href={p.predictions} className="text-sm text-muted hover:text-foreground">
                    {t("All predictions", "Alle Prognosen")}
                  </Link>
                }
              />
              <ForecastList forecasts={bigGames} grouped={false} locale={locale} />
            </section>
          )}

          {projections.length > 0 && (
            <section aria-labelledby="title-race">
              <SectionHeading
                id="title-race"
                title={t("Who wins the league?", "Wer wird Meister?")}
                aside={
                  <span className="text-sm text-muted">
                    {fmtInt(locale, 10000)} {t("simulated seasons", "simulierte Saisons")}
                  </span>
                }
              />
              <p className="-mt-2 mb-5 max-w-2xl text-muted">
                {t(
                  "Title favourites from the simulated final tables. Click a league for the full prediction with expected points and relegation risk.",
                  "Titelfavoriten aus den simulierten Abschlusstabellen. Ein Klick auf eine Liga zeigt die ganze Prognose mit erwarteten Punkten und Abstiegsrisiko.",
                )}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {projections.map(({ league, favourite }) => (
                  <li key={league.slug}>
                    <Link
                      href={p.projection(league.slug)}
                      className="flex h-full flex-col justify-between gap-5 rounded-3xl bg-surface p-5 transition hover:bg-surface-strong"
                    >
                      <span className="text-sm font-semibold text-muted">{league.name}</span>
                      <span className="flex items-center gap-3">
                        <Crest src={favourite.team.crest} name={favourite.team.name} size={40} />
                        <span className="min-w-0">
                          <span className="block truncate font-display text-lg font-bold tracking-[-0.02em]">
                            {favourite.team.name}
                          </span>
                          <span className="tabular block font-display text-2xl font-extrabold tracking-[-0.03em]">
                            {chance(favourite.title, locale)}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={p.leagues}
                    className="flex h-full min-h-32 flex-col justify-between gap-5 rounded-3xl bg-foreground p-5 text-inverse transition hover:opacity-90"
                  >
                    <span className="text-sm font-semibold opacity-70">
                      {t("All leagues", "Alle Ligen")}
                    </span>
                    <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
                      {t("Tables, ranking and predictions", "Tabellen, Ranking und Prognosen")}
                    </span>
                  </Link>
                </li>
              </ul>
            </section>
          )}

          {hasPerformance && (
            <section aria-labelledby="table-vs-strength">
              <SectionHeading
                id="table-vs-strength"
                title={t("Table vs. strength", "Tabelle vs. Stärke")}
                aside={
                  <Link
                    href={p.tableVsStrength}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    {t("All leagues", "Alle Ligen")}
                  </Link>
                }
              />
              <p className="-mt-2 mb-5 max-w-2xl text-muted">
                {t(
                  "Clubs whose league position differs most from their power rating.",
                  "Vereine, deren Tabellenplatz am stärksten von ihrem Power-Rating abweicht.",
                )}
              </p>
              <PerformanceCards
                over={performance.over}
                under={performance.under}
                showLeague
                previous={weekAgo}
                locale={locale}
              />
            </section>
          )}

          <section aria-labelledby="league-strength">
            <SectionHeading id="league-strength" title={t("League strength", "Ligastärke")} />
            <p className="-mt-2 mb-5 max-w-2xl text-muted">
              {locale === "de"
                ? `Ratingpunkte, die jeder Verein einer Liga zusätzlich erhält. Der Wert startete 2024/25 bei den UEFA-Koeffizienten und verändert sich seitdem mit Spielen zwischen Vereinen verschiedener Ligen im Europapokal (bisher ${ranking.data.crossLeagueMatches} Spiele in dieser Saison).`
                : `Rating points added to every team of a league. It started from the UEFA coefficients in 2024/25 and has moved since with results between clubs of different leagues in Europe (${ranking.data.crossLeagueMatches} matches so far this season).`}
            </p>
            <LeagueStrength leagues={ranking.data.leagues} locale={locale} />
          </section>
        </>
      ) : (
        <DataNotice
          reason={t(ranking.reason, "Es wurden noch keine Spieldaten importiert.")}
          locale={locale}
        />
      )}
    </div>
  );
}
