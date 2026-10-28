import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { PerformanceCards } from "@/components/performance";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  getAllTableVsStrength,
  getLastUpdated,
  getWeekAgo,
  MIN_HIGHLIGHT_GAP,
  topAcrossLeagues,
} from "@/data";
import { paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function tableVsStrengthMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Overperformers and underperformers: table vs. strength",
      "Überflieger und Vereine unter Wert: Tabelle vs. Stärke",
    ),
    description: tr(
      locale,
      "Which clubs in Europe's top leagues are higher or lower in the table than their strength suggests? Updated several times a day.",
      "Welche Vereine der Top-Ligen Europas stehen höher oder tiefer in der Tabelle, als ihre Stärke erwarten lässt? Mehrmals täglich aktualisiert.",
    ),
    paths: { en: paths("en").tableVsStrength, de: paths("de").tableVsStrength },
    image: ogImage.tableVsStrength,
  });
}

export async function TableVsStrengthView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [perLeague, deep, lastUpdated, weekAgo] = await Promise.all([
    getAllTableVsStrength(3),
    getAllTableVsStrength(10),
    getLastUpdated(),
    getWeekAgo(),
  ]);
  const top = topAcrossLeagues(deep, 5);

  return (
    <div className="space-y-16">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Table vs. strength", "Tabelle vs. Stärke"), path: p.tableVsStrength },
        ])}
      />
      <header>
        <Eyebrow>{t("Table vs. strength", "Tabelle vs. Stärke")}</Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Who is punching above their weight?", "Wer spielt über seinen Verhältnissen?")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {locale === "de"
            ? `Für jeden Verein vergleichen wir den Tabellenplatz mit dem Platz nach Footiqra Power-Rating innerhalb derselben Liga. Ein großer Abstand heißt: Tabelle und tatsächliche Stärke erzählen unterschiedliche Geschichten. Gezeigt werden Abstände ab ${MIN_HIGHLIGHT_GAP} Plätzen.`
            : `For every club we compare its place in the league table with its place by Footiqra power rating within the same league. A big gap means the table and the underlying strength tell different stories. Gaps of at least ${MIN_HIGHLIGHT_GAP} places are shown.`}
        </p>
      </header>

      {perLeague.length === 0 ? (
        <DataNotice
          reason={t(
            "League tables have not been imported yet.",
            "Die Tabellen wurden noch nicht importiert.",
          )}
          locale={locale}
        />
      ) : (
        <>
          <section aria-labelledby="all-leagues">
            <SectionHeading
              id="all-leagues"
              title={t(`Across all ${LEAGUES.length} leagues`, `Über alle ${LEAGUES.length} Ligen`)}
            />
            <PerformanceCards
              over={top.over}
              under={top.under}
              showLeague
              previous={weekAgo}
              locale={locale}
            />
          </section>

          {perLeague.map((l) => {
            const league = getLeagueBySlug(l.leagueSlug);
            return (
              <section key={l.leagueSlug} aria-labelledby={`league-${l.leagueSlug}`}>
                <SectionHeading
                  id={`league-${l.leagueSlug}`}
                  title={league?.name ?? l.leagueSlug}
                  aside={
                    <Link
                      href={p.league(l.leagueSlug)}
                      className="text-sm text-muted hover:text-foreground"
                    >
                      {t("Table and ranking", "Tabelle und Ranking")}
                    </Link>
                  }
                />
                <PerformanceCards
                  over={l.over}
                  under={l.under}
                  previous={weekAgo}
                  locale={locale}
                />
              </section>
            );
          })}
        </>
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How to read this", "So ist das zu lesen")}
        </h2>
        <p>
          {t(
            "The power rating weighs every result by the strength of the opponent, the margin and home advantage, and it includes European matches. The table only counts points. A club that collected many narrow wins against weaker teams can sit higher in the table than its rating; a club with heavy defeats or a tough schedule so far can sit lower. Early in the season, gaps close quickly.",
            "Das Power-Rating gewichtet jedes Ergebnis nach Stärke des Gegners, Höhe des Ergebnisses und Heimvorteil und bezieht Europapokalspiele mit ein. Die Tabelle zählt nur Punkte. Ein Verein mit vielen knappen Siegen gegen schwächere Gegner kann in der Tabelle höher stehen als nach Rating; ein Verein mit hohen Niederlagen oder schwerem Restprogramm kann tiefer stehen. Früh in der Saison schließen sich solche Lücken schnell.",
          )}{" "}
          <Link href={p.methodology} className="underline underline-offset-4">
            {t("How the rating works", "So funktioniert das Rating")}
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
