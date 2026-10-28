import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getForecastRecord, getLastUpdated, getUpcomingForecasts, nextWindow } from "@/data";
import { fmtPercent, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function predictionsMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Football predictions: win probabilities for the next matches",
      "Fußball-Prognosen: Siegwahrscheinlichkeiten für die nächsten Spiele",
    ),
    description: tr(
      locale,
      "Win, draw and loss probabilities for upcoming matches in the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie and Champions League, from the Footiqra rating model.",
      "Sieg-, Remis- und Niederlagenwahrscheinlichkeiten für die nächsten Spiele in Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie und Champions League, berechnet mit dem Footiqra Ratingmodell.",
    ),
    paths: { en: paths("en").predictions, de: paths("de").predictions },
    image: ogImage.predictions,
  });
}

export async function PredictionsView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const pct = (x: number) => fmtPercent(locale, Math.round(x * 100));
  const [all, record, lastUpdated] = await Promise.all([
    getUpcomingForecasts(),
    getForecastRecord(),
    getLastUpdated(),
  ]);
  const forecasts = nextWindow(all, 7);

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Predictions", "Prognosen"), path: p.predictions },
        ])}
      />
      <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow>{t("Match forecasts", "Spielprognosen")}</Eyebrow>
          <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
            {t("Predictions", "Prognosen")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            {t(
              "Win, draw and loss probabilities for the coming matches, calculated from the Footiqra power ratings of both clubs. Model estimates, not betting advice.",
              "Sieg-, Remis- und Niederlagenwahrscheinlichkeiten für die nächsten Spiele, berechnet aus den Footiqra Power-Ratings beider Vereine. Modellschätzungen, keine Wettberatung.",
            )}
          </p>
        </div>
        {record && (
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-surface px-5 py-4">
              <dt className="text-xs font-medium text-muted">
                {t("Favourite won", "Favorit gewann")}
              </dt>
              <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                {pct(record.hitRate)}
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-5 py-4">
              <dt className="text-xs font-medium text-muted">
                {t("Matches checked", "Geprüfte Spiele")}
              </dt>
              <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                {record.matches}
              </dd>
            </div>
          </dl>
        )}
      </header>

      <section aria-labelledby="upcoming">
        <SectionHeading
          id="upcoming"
          title={t("Next 7 days", "Nächste 7 Tage")}
          aside={
            <span className="text-sm text-muted">
              {forecasts.length} {t("matches", "Spiele")}
            </span>
          }
        />
        {forecasts.length > 0 ? (
          <ForecastList forecasts={forecasts} locale={locale} />
        ) : (
          <DataNotice
            reason={t(
              "No upcoming matches between rated clubs are stored right now.",
              "Aktuell sind keine anstehenden Spiele zwischen bewerteten Vereinen gespeichert.",
            )}
            locale={locale}
          />
        )}
      </section>

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How the forecasts work", "So funktionieren die Prognosen")}
        </h2>
        <p>
          {t(
            "The rating difference between the two clubs, plus home advantage, gives each side an expected score. A draw is most likely between evenly matched sides and becomes rarer the bigger the gap. The draw curve was fitted to this season's results.",
            "Die Rating-Differenz beider Vereine plus Heimvorteil ergibt für jede Seite einen Erwartungswert. Ein Remis ist bei gleich starken Teams am wahrscheinlichsten und wird seltener, je größer der Abstand ist. Die Remis-Kurve wurde an den Ergebnissen dieser Saison geeicht.",
          )}
        </p>
        {record && (
          <p>
            {locale === "de"
              ? `Geprüft an jedem gewerteten Spiel dieser Saison, mit den Ratings von vor dem Anpfiff: Der wahrscheinlichste Ausgang trat in ${pct(record.hitRate)} von ${record.matches} Spielen ein. Im Fußball fallen wenige Tore und es gibt viele Remis, deshalb liegt auch ein gutes Modell beim einzelnen Spiel oft daneben.`
              : `Checked against every rated match this season, with the ratings as they were before kick-off: the most likely outcome happened in ${pct(record.hitRate)} of ${record.matches} matches. Football is low scoring and draws are common, so even a good model is often wrong about a single match.`}
          </p>
        )}
        <p>
          {t(
            "Matches against clubs outside the covered leagues are not forecast, because those clubs have no rating.",
            "Spiele gegen Vereine außerhalb der abgedeckten Ligen bekommen keine Prognose, weil diese Vereine kein Rating haben.",
          )}{" "}
          <Link href={`${p.methodology}#forecasts`} className="underline underline-offset-4">
            {t("Full methodology", "Ganze Methodik")}
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
