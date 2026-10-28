import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated, MatchList } from "@/components/match-list";
import { RankingTable } from "@/components/ranking-table";
import { StandingsTable } from "@/components/standings-table";
import { Eyebrow, SectionHeading } from "@/components/ui";
import {
  getChampionsLeague,
  getLastUpdated,
  getPowerRanking,
  getUpcomingForecasts,
  nextWindow,
} from "@/data";
import { paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function championsLeagueMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Champions League table, predictions and results",
      "Champions League: Tabelle, Prognosen und Ergebnisse",
    ),
    description: tr(
      locale,
      "Champions League league phase table, win probabilities for the next matches, latest results and how the clubs rate in the Footiqra power ranking.",
      "Tabelle der Ligaphase, Siegwahrscheinlichkeiten für die nächsten Spiele, letzte Ergebnisse und alle Vereine im Footiqra Power-Ranking.",
    ),
    paths: { en: paths("en").championsLeague, de: paths("de").championsLeague },
    image: ogImage.championsLeague,
  });
}

/** League phase since 2024/25: 1 to 8 reach the round of 16, 9 to 24 the knockout play-offs. */
function zone(position: number): "direct" | "playoff" | null {
  if (position <= 8) return "direct";
  if (position <= 24) return "playoff";
  return null;
}

export async function ChampionsLeagueView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [cl, ranking, forecasts, lastUpdated] = await Promise.all([
    getChampionsLeague(),
    getPowerRanking(),
    getUpcomingForecasts(),
    getLastUpdated(),
  ]);
  const powerRanks = new Map(
    ranking.status === "ok" ? ranking.data.rows.map((r) => [r.team.slug, r.rank]) : [],
  );
  const clForecasts = nextWindow(
    forecasts.filter((f) => f.competition === "CL"),
    10,
  );
  const forecastIds = new Set(clForecasts.map((f) => f.id));
  const nextFixtures = cl.fixtures.filter((f) => !forecastIds.has(f.id));
  const firstDay = (clForecasts[0] ?? nextFixtures[0])?.utcDate;
  const otherFixtures = firstDay
    ? nextFixtures.filter((f) => Date.parse(f.utcDate) < Date.parse(firstDay) + 10 * 86400000)
    : [];
  const season = cl.season ? seasonLabel(cl.season) : null;

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: "Champions League", path: p.championsLeague },
        ])}
      />
      <header>
        <Eyebrow>
          {t("Europe", "Europa")}
          {season ? ` · ${season}` : ""}
        </Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          Champions League
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            "The league phase table, the next matches and how the clubs from the seven leagues covered by Footiqra compare. Forecasts are shown for matches between two rated clubs.",
            "Die Tabelle der Ligaphase, die nächsten Spiele und wie sich die Vereine aus den sieben Ligen von Footiqra schlagen. Prognosen gibt es für Spiele zwischen zwei bewerteten Vereinen.",
          )}
        </p>
      </header>

      {clForecasts.length > 0 && (
        <section aria-labelledby="cl-forecasts">
          <SectionHeading
            id="cl-forecasts"
            title={t("Next matches", "Nächste Spiele")}
            aside={
              <Link href={p.predictions} className="text-sm text-muted hover:text-foreground">
                {t("All predictions", "Alle Prognosen")}
              </Link>
            }
          />
          <ForecastList forecasts={clForecasts} locale={locale} />
        </section>
      )}

      {otherFixtures.length > 0 && (
        <section aria-labelledby="cl-other">
          <SectionHeading
            id="cl-other"
            title={
              clForecasts.length > 0
                ? t("More fixtures", "Weitere Spiele")
                : t("Next matches", "Nächste Spiele")
            }
          />
          <MatchList
            matches={otherFixtures}
            caption={t("Upcoming Champions League fixtures", "Nächste Spiele der Champions League")}
            locale={locale}
          />
          <p className="mt-3 text-sm text-muted">
            {t(
              "No forecast for these: at least one club plays outside the covered leagues and has no rating.",
              "Hierfür gibt es keine Prognose: Mindestens ein Verein spielt außerhalb der abgedeckten Ligen und hat kein Rating.",
            )}
          </p>
        </section>
      )}

      <section aria-labelledby="cl-table">
        <SectionHeading id="cl-table" title={t("League phase", "Ligaphase")} />
        {cl.table ? (
          <>
            <StandingsTable
              rows={cl.table.rows}
              caption={t(
                "Champions League league phase table",
                "Tabelle der Champions-League-Ligaphase",
              )}
              powerRanks={powerRanks}
              zone={zone}
              locale={locale}
            />
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-brand" />{" "}
                {t("1 to 8: round of 16", "1 bis 8: Achtelfinale")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-neutral" />{" "}
                {t("9 to 24: knockout play-offs", "9 bis 24: K.-o.-Play-offs")}
              </span>
              <span>
                {t(
                  "Power #: position in the Footiqra ranking (covered leagues only)",
                  "Power #: Platz im Footiqra Ranking (nur abgedeckte Ligen)",
                )}
              </span>
            </p>
          </>
        ) : (
          <DataNotice
            reason={t(
              "The league phase table will appear after the next data update.",
              "Die Tabelle der Ligaphase erscheint nach dem nächsten Datenupdate.",
            )}
            locale={locale}
          />
        )}
      </section>

      {cl.clubs.length > 0 && (
        <section aria-labelledby="cl-clubs">
          <SectionHeading
            id="cl-clubs"
            title={t("Strongest clubs in the competition", "Die stärksten Vereine im Wettbewerb")}
            aside={
              <span className="text-sm text-muted">
                {t("From the covered leagues", "Aus den abgedeckten Ligen")}
              </span>
            }
          />
          <RankingTable
            rows={cl.clubs}
            caption={t(
              "Champions League clubs by power rating",
              "Champions-League-Vereine nach Power-Rating",
            )}
            rankLabel={t("Overall", "Gesamt")}
            locale={locale}
          />
        </section>
      )}

      {cl.results.length > 0 && (
        <section aria-labelledby="cl-results">
          <SectionHeading id="cl-results" title={t("Latest results", "Letzte Ergebnisse")} />
          <MatchList
            matches={cl.results.slice(0, 18)}
            caption={t("Latest Champions League results", "Letzte Ergebnisse der Champions League")}
            locale={locale}
          />
        </section>
      )}
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
