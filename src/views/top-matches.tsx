import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getSiteUrl } from "@/config/site";
import { biggestMatches, getLastUpdated, getUpcomingForecasts, nextWindow } from "@/data";
import { fmtDate, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/** Matches shown at the top; the rest of the week sits behind "Show all". */
const TOP = 10;

/** The week's matches ranked biggest first, as on the top matches page and the match pages. */
export async function getWeekRanking() {
  const week = nextWindow(await getUpcomingForecasts(), 7);
  return biggestMatches(week, week.length);
}

export function topMatchesMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Top football matches this week", "Fußball-Topspiele der Woche"),
    description: tr(
      locale,
      "The biggest matches of the next 7 days in Europe's seven top leagues and the Champions League, ranked by the strength of both clubs, with win probabilities.",
      "Die größten Spiele der nächsten 7 Tage in Europas sieben Topligen und der Champions League, geordnet nach der Stärke beider Vereine, mit Siegwahrscheinlichkeiten.",
    ),
    paths: { en: paths("en").topMatches, de: paths("de").topMatches },
    image: ogImage.topMatches,
  });
}

export async function TopMatchesView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [ranked, lastUpdated] = await Promise.all([getWeekRanking(), getLastUpdated()]);
  const top = ranked.slice(0, TOP);
  const rest = ranked.slice(TOP);
  const dates = ranked.map((f) => f.utcDate).sort();
  const day = (iso: string) => fmtDate(locale, iso, { day: "numeric", month: "short" });
  const range = dates.length > 0 ? `${day(dates[0]!)} ${t("to", "bis")} ${day(dates.at(-1)!)}` : "";
  const base = getSiteUrl();

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Predictions", "Prognosen"), path: p.predictions },
          { name: t("Top matches", "Topspiele"), path: p.topMatches },
        ])}
      />
      {top.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("Top matches this week", "Topspiele der Woche"),
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: top.map((f, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `${f.home.name} ${t("vs", "gegen")} ${f.away.name}`,
              ...(f.slug ? { url: `${base}${p.match(f.slug)}` } : {}),
            })),
          }}
        />
      )}

      <header>
        <Eyebrow>{t("Match forecasts", "Spielprognosen")}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Top football matches this week", "Fußball-Topspiele der Woche")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            "The biggest games of the next 7 days in Europe's seven top leagues and the Champions League. Ranked by the strength of both clubs: two strong, evenly matched clubs make the biggest game.",
            "Die größten Spiele der nächsten 7 Tage in Europas sieben Topligen und der Champions League. Geordnet nach der Stärke beider Vereine: Zwei starke, gleich bewertete Vereine ergeben das größte Spiel.",
          )}
        </p>
        {ranked.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            {t(
              `${ranked.length} matches between rated clubs (${range})`,
              `${ranked.length} Spiele zwischen bewerteten Vereinen (${range})`,
            )}
          </p>
        )}
      </header>

      {top.length > 0 ? (
        <section aria-labelledby="top-heading">
          <SectionHeading
            id="top-heading"
            title={t(`Top ${top.length} this week`, `Top ${top.length} der Woche`)}
            aside={
              <Link href={p.predictions} className="text-sm text-muted hover:text-foreground">
                {t("All matches by date", "Alle Spiele nach Datum")}
              </Link>
            }
          />
          <ForecastList forecasts={top} grouped={false} firstRank={1} locale={locale} />
        </section>
      ) : (
        <DataNotice
          reason={t(
            "No upcoming matches between rated clubs are stored right now.",
            "Aktuell sind keine anstehenden Spiele zwischen bewerteten Vereinen gespeichert.",
          )}
          locale={locale}
        />
      )}

      {rest.length > 0 && (
        <section aria-labelledby="rest-heading">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl bg-surface px-6 py-5 hover:bg-surface-strong">
              <h2
                id="rest-heading"
                className="font-display text-2xl font-extrabold tracking-[-0.02em]"
              >
                {t(`Show all ${ranked.length} matches`, `Alle ${ranked.length} Spiele zeigen`)}
              </h2>
              <span aria-hidden className="text-2xl text-muted transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-3">
              <ForecastList forecasts={rest} grouped={false} firstRank={TOP + 1} locale={locale} />
            </div>
          </details>
        </section>
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How the ranking works", "So entsteht die Reihenfolge")}
        </h2>
        <p>
          {t(
            "Each match gets a score from the Footiqra ratings of both clubs: the sum of both ratings minus the gap between them. A clash of two top clubs scores highest, a top club against a weak side scores lower, even if the favourite is very strong. Ratings are comparable across leagues, so a Champions League night and a league derby are ranked on the same scale.",
            "Jedes Spiel bekommt einen Wert aus den Footiqra-Ratings beider Vereine: die Summe beider Ratings minus den Abstand zwischen ihnen. Ein Duell zweier Spitzenvereine liegt ganz oben, ein Spitzenverein gegen einen schwachen Gegner weiter unten, selbst wenn der Favorit sehr stark ist. Die Ratings sind ligaübergreifend vergleichbar, deshalb stehen Champions-League-Abende und Ligaspiele auf derselben Skala.",
          )}
        </p>
        <p>
          {t(
            "The list covers 7 days from the next kick-off and is updated several times a day. Each match page shows the same rank under “How big is this match?”.",
            "Die Liste umfasst 7 Tage ab dem nächsten Anstoß und wird mehrmals täglich aktualisiert. Jede Spielseite zeigt denselben Rang unter „Wie groß ist dieses Spiel?“.",
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
