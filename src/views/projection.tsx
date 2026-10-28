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
import { fmtInt, paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function projectionStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export async function projectionMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const league = getLeagueBySlug(slug);
  if (!league) return {};
  const projection = await getLeagueProjection(league.slug);
  const season = projection ? ` ${seasonLabel(projection.season)}` : "";
  const leader = projection?.rows[0];
  const runs = projection ? fmtInt(locale, projection.runs) : "";
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${league.name}${season} predicted final table: title and relegation chances`,
      `${league.name}${season} Prognose Abschlusstabelle: Meister- und Abstiegschancen`,
    ),
    description: leader
      ? tr(
          locale,
          `Simulated ${league.name} final table: ${leader.team.name} win the title in ${chance(leader.title, locale)} of ${runs} simulations. Expected points, top 4 and bottom 3 chances for every club.`,
          `Simulierte Abschlusstabelle der ${league.name}: ${leader.team.name} wird in ${chance(leader.title, locale)} von ${runs} Simulationen Meister. Erwartete Punkte sowie Chancen auf die Top 4 und die letzten 3 Plätze für jeden Verein.`,
        )
      : tr(
          locale,
          `Simulated ${league.name} final table with title and relegation chances.`,
          `Simulierte Abschlusstabelle der ${league.name} mit Meister- und Abstiegschancen.`,
        ),
    paths: { en: paths("en").projection(league.slug), de: paths("de").projection(league.slug) },
    image: ogImage.projection(league.slug),
  });
}

export async function ProjectionView({ locale, slug }: { locale: Locale; slug: string }) {
  const league = getLeagueBySlug(slug);
  if (!league) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [projection, lastUpdated] = await Promise.all([
    getLeagueProjection(league.slug),
    getLastUpdated(),
  ]);
  const leader = projection?.rows[0];

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: league.name, path: p.league(league.slug) },
          { name: t("Predicted table", "Prognose"), path: p.projection(league.slug) },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={p.league(league.slug)} className="hover:underline">
            {league.name}
          </Link>
          {projection ? ` · ${seasonLabel(projection.season)}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Predicted final table", "Prognose Abschlusstabelle")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {projection && leader
            ? locale === "de"
              ? `Wir haben die restlichen ${projection.remainingMatches} Spiele ${fmtInt(locale, projection.runs)}-mal mit dem Footiqra Prognosemodell durchgespielt. ${leader.team.name} landet in ${chance(leader.title, locale)} der Simulationen auf Platz 1.`
              : `We played the remaining ${projection.remainingMatches} matches ${fmtInt(locale, projection.runs)} times with the Footiqra forecast model. ${leader.team.name} finish top in ${chance(leader.title, locale)} of the simulations.`
            : t(
                "The simulation needs the current table and ratings for every club.",
                "Die Simulation braucht die aktuelle Tabelle und Ratings für jeden Verein.",
              )}
        </p>
      </header>

      {projection ? (
        <section aria-labelledby="projection-heading">
          <SectionHeading
            id="projection-heading"
            title={t("Simulated standings", "Simulierte Tabelle")}
            aside={
              <span className="text-sm text-muted">
                {t("Sorted by expected points", "Sortiert nach erwarteten Punkten")}
              </span>
            }
          />
          <ProjectionTable
            rows={projection.rows}
            caption={t(
              `${league.name} predicted final table`,
              `${league.name}: Prognose Abschlusstabelle`,
            )}
            locale={locale}
          />
          <p className="mt-4 max-w-3xl text-sm text-muted">
            {t(
              "Today: current table position and points. Change: places gained or lost from today to the predicted final position (#), which is the order by expected points. Final pts: expected points at the end of the season. Title, top 4 and bottom 3: share of simulations in which the club finished there. These are plain table positions; how many places lead to Europe or relegation depends on the league's rules. The coloured strip shows how likely every final position is.",
              "Heute: aktueller Tabellenplatz und Punkte. Trend: gewonnene oder verlorene Plätze von heute bis zum prognostizierten Endplatz (#), also der Reihenfolge nach erwarteten Punkten. Pkt. Ende: erwartete Punkte am Saisonende. Meister, Top 4 und letzte 3: Anteil der Simulationen, in denen der Verein dort landet. Das sind reine Tabellenplätze; wie viele Plätze für Europa oder den Abstieg zählen, hängt von den Regeln der Liga ab. Der farbige Streifen zeigt, wie wahrscheinlich jeder Endplatz ist.",
            )}
          </p>
        </section>
      ) : (
        <DataNotice
          reason={t(
            "The league table has not been imported yet.",
            "Die Tabelle wurde noch nicht importiert.",
          )}
          locale={locale}
        />
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How the simulation works", "So funktioniert die Simulation")}
        </h2>
        <p>
          {t(
            "Every simulation starts from the official table. Each remaining match is decided at random with the win, draw and loss probabilities of the forecast model; ratings then move as they would after a real result. Ties on points are split by goal difference. League specific tie-breakers such as head-to-head records are not modelled.",
            "Jede Simulation startet bei der offiziellen Tabelle. Jedes verbleibende Spiel wird zufällig mit den Sieg-, Remis- und Niederlagenwahrscheinlichkeiten des Prognosemodells entschieden; danach verändern sich die Ratings wie nach einem echten Ergebnis. Bei Punktgleichheit entscheidet die Tordifferenz. Ligaspezifische Regeln wie der direkte Vergleich werden nicht abgebildet.",
          )}{" "}
          <Link href={`${p.methodology}#simulation`} className="underline underline-offset-4">
            {t("Methodology", "Methodik")}
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
