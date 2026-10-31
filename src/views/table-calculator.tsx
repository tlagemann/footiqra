import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { TableCalculator } from "@/components/table-calculator";
import { Crest, Eyebrow } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLastUpdated, getTableCalculator } from "@/data";
import { country, paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Table calculator: /leagues/{slug}/table-calculator/ (de: /de/ligen/{slug}/tabellenrechner/)
 * and an overview of all leagues: /table-calculator/ (de: /de/tabellenrechner/).
 */
export function tableCalculatorStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export async function tableCalculatorMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const league = getLeagueBySlug(slug);
  if (!league) return {};
  const data = await getTableCalculator(league.slug);
  const season = data ? ` ${seasonLabel(data.season)}` : "";
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${league.name}${season} table calculator`,
      `${league.name}${season}: Tabellenrechner`,
    ),
    description: tr(
      locale,
      `Enter your own results for all ${data?.fixtures.length ?? ""} remaining ${league.name} matches and see the final table. With a model tip for every match.`,
      `Eigene Ergebnisse für alle ${data?.fixtures.length ?? ""} restlichen Spiele der ${league.name} eintragen und die Abschlusstabelle sehen. Mit Modell-Tipp für jedes Spiel.`,
    ),
    paths: {
      en: paths("en").leagueCalculator(league.slug),
      de: paths("de").leagueCalculator(league.slug),
    },
    image: ogImage.league(league.slug),
  });
}

export async function TableCalculatorView({ locale, slug }: { locale: Locale; slug: string }) {
  const league = getLeagueBySlug(slug);
  if (!league) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [data, lastUpdated] = await Promise.all([
    getTableCalculator(league.slug),
    getLastUpdated(),
  ]);

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: league.name, path: p.league(league.slug) },
          { name: t("Table calculator", "Tabellenrechner"), path: p.leagueCalculator(league.slug) },
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
          {t("Table calculator", "Tabellenrechner")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {data
            ? t(
                `Enter your own results for the ${data.fixtures.length} remaining matches of the ${league.name} and the table updates at once. Not sure? Each match has a model tip, or fill a whole matchday with one click.`,
                `Trag deine eigenen Ergebnisse für die ${data.fixtures.length} restlichen Spiele der ${league.name} ein, die Tabelle rechnet sofort mit. Unsicher? Jedes Spiel hat einen Modell-Tipp, ganze Spieltage füllst du mit einem Klick.`,
              )
            : t(
                "The calculator needs the current table and fixtures.",
                "Der Rechner braucht die aktuelle Tabelle und den Spielplan.",
              )}
        </p>
      </header>

      {data ? (
        <TableCalculator
          leagueSlug={league.slug}
          season={data.season}
          teams={data.teams}
          fixtures={data.fixtures}
          locale={locale}
        />
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
          {t("How it works", "So funktioniert es")}
        </h2>
        <p>
          {t(
            "The calculator starts from the official table, including any points deductions. Your results stay in this browser and are still there on your next visit; matches that have been played in the meantime drop out and count with their real score. Share link puts all your results in one link for friends.",
            "Der Rechner startet bei der offiziellen Tabelle, inklusive eventueller Punktabzüge. Deine Ergebnisse bleiben in diesem Browser gespeichert und sind beim nächsten Besuch noch da; inzwischen gespielte Partien fallen heraus und zählen mit dem echten Ergebnis. „Link teilen“ packt alle deine Ergebnisse in einen Link für Freunde.",
          )}
        </p>
        <p>
          {t(
            "Model tip: the most likely score of the most likely outcome, from the Footiqra ratings. Because the favourite's win is usually the most likely outcome, a table filled only with tips has fewer draws than a real season. For realistic chances, see the ",
            "Modell-Tipp: das wahrscheinlichste Ergebnis des wahrscheinlichsten Ausgangs, berechnet aus den Footiqra-Ratings. Weil meist ein Sieg des Favoriten am wahrscheinlichsten ist, hat eine nur mit Tipps gefüllte Tabelle weniger Remis als eine echte Saison. Realistische Chancen zeigt die ",
          )}
          <Link href={p.projection(league.slug)} className="underline underline-offset-4">
            {t("season simulation", "Saisonsimulation")}
          </Link>
          .
        </p>
      </section>

      <nav aria-label={t("Other leagues", "Andere Ligen")} className="flex flex-wrap gap-2 text-sm">
        {LEAGUES.filter((l) => l.slug !== league.slug).map((l) => (
          <Link
            key={l.slug}
            href={p.leagueCalculator(l.slug)}
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

/* ---------- Overview ---------- */

export function tableCalculatorIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Football table calculator", "Fußball-Tabellenrechner"),
    description: tr(
      locale,
      "Table calculator for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie: enter your own results and see the final table.",
      "Tabellenrechner für Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga und Eredivisie: eigene Ergebnisse eintragen und die Abschlusstabelle sehen.",
    ),
    paths: { en: paths("en").tableCalculator, de: paths("de").tableCalculator },
    image: ogImage.leagues,
  });
}

export async function TableCalculatorIndexView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const all = await Promise.all(LEAGUES.map((l) => getTableCalculator(l.slug)));

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Table calculator", "Tabellenrechner"), path: p.tableCalculator },
        ])}
      />
      <header>
        <Eyebrow>{t("Europe's top leagues", "Europas Topligen")}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Table calculator", "Tabellenrechner")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            "Pick a league, enter your own results for the rest of the season and see how the final table would look.",
            "Wähle eine Liga, trag deine eigenen Ergebnisse für den Rest der Saison ein und sieh, wie die Abschlusstabelle aussehen würde.",
          )}
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEAGUES.map((l, i) => {
          const d = all[i];
          const leader = d?.teams[0];
          return (
            <li key={l.slug}>
              <Link
                href={p.leagueCalculator(l.slug)}
                className="flex h-full flex-col justify-between gap-5 rounded-3xl bg-surface p-5 transition hover:bg-surface-strong"
              >
                <span>
                  <span className="block font-display text-xl font-extrabold tracking-[-0.02em]">
                    {l.name}
                  </span>
                  <span className="text-sm text-muted">{country(locale, l.country)}</span>
                </span>
                <span className="flex items-center justify-between gap-3 text-sm">
                  {leader ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Crest src={leader.crest} name={leader.name} size={22} />
                      <span className="truncate text-muted">
                        {t(`Leader: ${leader.name}`, `Spitze: ${leader.name}`)}
                      </span>
                    </span>
                  ) : (
                    <span />
                  )}
                  {d && (
                    <span className="tabular font-semibold whitespace-nowrap">
                      {t(`${d.fixtures.length} matches left`, `${d.fixtures.length} Spiele offen`)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
