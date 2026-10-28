import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { ForecastList } from "@/components/forecast-list";
import { LastUpdated, MatchList } from "@/components/match-list";
import { Crest, FormGuide, SectionHeading } from "@/components/ui";
import { getLeagueBySlug } from "@/config/leagues";
import {
  getAllTeamSlugs,
  getRankHistory,
  getRatingHistory,
  getTeam,
  getTeamRanking,
  getUpcomingForecasts,
} from "@/data";
import { HistoryPanel } from "@/components/history-panel";
import { paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Team profiles: /teams/{slug}/ and /de/vereine/{slug}/
 * Slugs come from data/teams.json and never change once assigned.
 */

/**
 * A static export refuses dynamic routes with zero params. While no teams have been
 * imported, this single noindex placeholder keeps the build working. It is excluded
 * from the sitemap and disappears as soon as real teams exist.
 */
const NO_TEAMS_PLACEHOLDER = "no-teams-yet";

export async function teamStaticParams() {
  const slugs = await getAllTeamSlugs();
  return (slugs.length > 0 ? slugs : [NO_TEAMS_PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function teamMetadata(locale: Locale, slug: string): Promise<Metadata> {
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return pageMetadata({
      locale,
      title: tr(locale, "Teams", "Vereine"),
      description: tr(locale, "Team profiles are not available yet.", "Noch keine Vereinsprofile."),
      path: paths(locale).team(slug),
      noIndex: true,
    });
  }
  const result = await getTeam(slug);
  if (result.status !== "ok") return {};
  const { team } = result.data;
  const league = getLeagueBySlug(team.leagueSlug);
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${team.name}: power rating, results and fixtures`,
      `${team.name}: Power-Rating, Ergebnisse und Spielplan`,
    ),
    description: tr(
      locale,
      `${team.name} (${league?.name ?? "Europe"}): latest results, upcoming fixtures and team strength on Footiqra.`,
      `${team.name} (${league?.name ?? "Europa"}): letzte Ergebnisse, nächste Spiele und Stärke des Vereins bei Footiqra.`,
    ),
    paths: { en: paths("en").team(team.slug), de: paths("de").team(team.slug) },
    image: ogImage.team(team.slug),
  });
}

export async function TeamView({ locale, slug }: { locale: Locale; slug: string }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return (
      <DataNotice
        title={t("No team profiles yet", "Noch keine Vereinsprofile")}
        reason={t(
          "Team data has not been imported.",
          "Es wurden noch keine Vereinsdaten importiert.",
        )}
        locale={locale}
      />
    );
  }

  const result = await getTeam(slug);
  if (result.status !== "ok") notFound();
  const { team, results, fixtures } = result.data;
  const league = getLeagueBySlug(team.leagueSlug);
  const ranking = await getTeamRanking(team.slug);
  const [history, rankHistory] = await Promise.all([
    getRatingHistory(team.slug),
    getRankHistory(team.slug),
  ]);
  const forecasts = (await getUpcomingForecasts())
    .filter((f) => f.home.slug === team.slug || f.away.slug === team.slug)
    .slice(0, 3);
  const forecastIds = new Set(forecasts.map((f) => f.id));
  const otherFixtures = fixtures.filter((f) => !forecastIds.has(f.id));

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          ...(league ? [{ name: league.name, path: p.league(league.slug) }] : []),
          { name: team.name, path: p.team(team.slug) },
        ])}
      />
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-surface">
          <Crest src={team.crest} name={team.name} size={72} />
        </span>
        <div className="min-w-0">
          {league && (
            <Link
              href={p.league(league.slug)}
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
              <dt className="text-xs font-medium opacity-70">{t("Power rank", "Power-Rang")}</dt>
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
              <dt className="text-xs font-medium text-muted">
                {t("Form (last 5)", "Form (letzte 5)")}
              </dt>
              <dd className="mt-3">
                <FormGuide form={ranking.form} locale={locale} />
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-6 py-5">
              <dt className="text-xs font-medium text-muted">
                {t("Matches rated", "Gewertete Spiele")}
              </dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold tracking-[-0.04em]">
                {ranking.matchesPlayed}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            <Link
              href={p.methodology}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("How the rating works", "So funktioniert das Rating")}
            </Link>
          </p>
        </section>
      )}

      {(history.length > 1 || rankHistory.length > 1) && (
        <section aria-labelledby="history-heading">
          <SectionHeading
            id="history-heading"
            title={t("Season so far", "Saisonverlauf")}
            aside={
              <span className="text-sm text-muted">
                {t("Power ranking and rating", "Power-Ranking und Rating")}
              </span>
            }
          />
          <div className="rounded-3xl bg-surface p-4 sm:p-6">
            <HistoryPanel
              teamName={team.name}
              ranks={rankHistory}
              ratings={history}
              locale={locale}
            />
          </div>
        </section>
      )}

      <section aria-labelledby="results-heading">
        <SectionHeading id="results-heading" title={t("Latest results", "Letzte Ergebnisse")} />
        {results.length > 0 ? (
          <MatchList
            matches={results}
            caption={t(`Latest results of ${team.name}`, `Letzte Ergebnisse von ${team.name}`)}
            locale={locale}
          />
        ) : (
          <DataNotice
            title={t("No results yet", "Noch keine Ergebnisse")}
            reason={t(
              "No finished matches stored yet.",
              "Noch keine beendeten Spiele gespeichert.",
            )}
            locale={locale}
          />
        )}
      </section>

      {forecasts.length > 0 && (
        <section aria-labelledby="forecasts-heading">
          <SectionHeading
            id="forecasts-heading"
            title={t("Next matches", "Nächste Spiele")}
            aside={
              <Link href={p.predictions} className="text-sm text-muted hover:text-foreground">
                {t("All predictions", "Alle Prognosen")}
              </Link>
            }
          />
          <ForecastList forecasts={forecasts} grouped={false} locale={locale} />
        </section>
      )}

      {(otherFixtures.length > 0 || forecasts.length === 0) && (
        <section aria-labelledby="fixtures-heading">
          <SectionHeading
            id="fixtures-heading"
            title={
              forecasts.length > 0
                ? t("More fixtures", "Weitere Spiele")
                : t("Upcoming fixtures", "Nächste Spiele")
            }
          />
          {otherFixtures.length > 0 ? (
            <MatchList
              matches={otherFixtures}
              caption={t(`Upcoming fixtures of ${team.name}`, `Nächste Spiele von ${team.name}`)}
              locale={locale}
            />
          ) : (
            <DataNotice
              title={t("No fixtures", "Keine Spiele")}
              reason={t("No scheduled matches stored.", "Keine angesetzten Spiele gespeichert.")}
              locale={locale}
            />
          )}
        </section>
      )}
      <LastUpdated utc={result.lastUpdatedUtc} locale={locale} />
    </div>
  );
}
