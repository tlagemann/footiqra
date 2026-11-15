import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { TableCalculator } from "@/components/table-calculator";
import { Crest, Eyebrow } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getChampionsLeagueCalculator, getLastUpdated, getTableCalculator } from "@/data";
import { country, paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Table calculator: /leagues/{slug}/table-calculator/ (de: /de/ligen/{slug}/tabellenrechner/)
 * and an overview of all leagues: /table-calculator/ (de: /de/tabellenrechner/).
 * Champions League league phase: /champions-league/table-calculator/
 * (de: /de/champions-league/tabellenrechner/).
 */
export function tableCalculatorStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

function remaining(locale: Locale, n: number | undefined): string {
  return n
    ? tr(locale, `the ${n} remaining matches`, `die ${n} restlichen Spiele`)
    : tr(locale, "the remaining matches", "die restlichen Spiele");
}

export async function tableCalculatorMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const league = getLeagueBySlug(slug);
  if (!league) return {};
  const data = await getTableCalculator(league.slug);
  const season = data ? ` ${seasonLabel(data.season)}` : "";
  return pageMetadata({
    locale,
    // Searches come in both orders ("serie a tabellenrechner", "tabellenrechner serie a");
    // the title leads with the tool, the description names the outcome people want.
    title: tr(
      locale,
      `${league.name} table calculator${season}: predict the table`,
      `Tabellenrechner ${league.name}${season}: Tabelle selbst tippen`,
    ),
    description: tr(
      locale,
      `Free ${league.name} table calculator: tip ${remaining(locale, data?.fixtures.length)} and see who wins the title and who goes down. No sign-up, save and share.`,
      `Kostenloser Tabellenrechner ${league.name}: ${remaining(locale, data?.fixtures.length)} tippen und sehen, wer Meister wird und wer absteigt. Ohne Anmeldung, speichern und teilen.`,
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
          {t(`${league.name} table calculator`, `Tabellenrechner ${league.name}`)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {data
            ? t(
                `Enter your own results for the ${data.fixtures.length} remaining matches of the ${league.name} and the table updates at once. Your results are saved in this browser and can be shared as a link.`,
                `Trag deine eigenen Ergebnisse für die ${data.fixtures.length} restlichen Spiele der ${league.name} ein, die Tabelle rechnet sofort mit. Deine Ergebnisse bleiben in diesem Browser gespeichert und lassen sich als Link teilen.`,
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
            "How likely each final position really is, from 10,000 simulated seasons, is shown in the ",
            "Wie wahrscheinlich jeder Endplatz tatsächlich ist, berechnet aus 10.000 simulierten Saisons, zeigt die ",
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
        <Link
          href={p.championsLeagueCalculator}
          className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
        >
          Champions League
        </Link>
      </nav>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}

/* ---------- Overview ---------- */

export function tableCalculatorIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Football table calculator for 7 top leagues",
      "Tabellenrechner Fußball: 7 Top-Ligen selbst tippen",
    ),
    description: tr(
      locale,
      "Free table calculator for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie and the Champions League: tip the rest of the season, see the final table.",
      "Kostenloser Tabellenrechner für Bundesliga, Premier League, La Liga, Serie A, Ligue 1, Primeira Liga, Eredivisie und Champions League: Restspiele tippen, Tabelle sehen.",
    ),
    paths: { en: paths("en").tableCalculator, de: paths("de").tableCalculator },
    image: ogImage.leagues,
  });
}

export async function TableCalculatorIndexView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [all, cl] = await Promise.all([
    Promise.all(LEAGUES.map((l) => getTableCalculator(l.slug))),
    getChampionsLeagueCalculator(),
  ]);

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
          {t("Football table calculator", "Fußball-Tabellenrechner")}
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
        <li>
          <Link
            href={p.championsLeagueCalculator}
            className="flex h-full flex-col justify-between gap-5 rounded-3xl bg-surface p-5 transition hover:bg-surface-strong"
          >
            <span>
              <span className="block font-display text-xl font-extrabold tracking-[-0.02em]">
                Champions League
              </span>
              <span className="text-sm text-muted">{t("League phase", "Ligaphase")}</span>
            </span>
            {cl && (
              <span className="tabular text-right text-sm font-semibold whitespace-nowrap">
                {t(`${cl.fixtures.length} matches left`, `${cl.fixtures.length} Spiele offen`)}
              </span>
            )}
          </Link>
        </li>
      </ul>
    </div>
  );
}

/* ---------- Champions League league phase ---------- */

export async function championsLeagueCalculatorMetadata(locale: Locale): Promise<Metadata> {
  const data = await getChampionsLeagueCalculator();
  const season = data ? ` ${seasonLabel(data.season)}` : "";
  const n = data?.fixtures.length;
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `Champions League table calculator${season}: predict the table`,
      `Tabellenrechner Champions League${season}: Ligaphase tippen`,
    ),
    description: tr(
      locale,
      `Free Champions League table calculator: tip ${n ? `the ${n} remaining` : "the remaining"} league phase matches and see who reaches the round of 16 or the play-offs. No sign-up.`,
      `Kostenloser Tabellenrechner Champions League: ${n ? `die ${n} restlichen` : "die restlichen"} Spiele der Ligaphase tippen und sehen, wer ins Achtelfinale oder in die Play-offs kommt.`,
    ),
    paths: {
      en: paths("en").championsLeagueCalculator,
      de: paths("de").championsLeagueCalculator,
    },
    image: ogImage.championsLeague,
  });
}

export async function ChampionsLeagueCalculatorView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [data, lastUpdated] = await Promise.all([getChampionsLeagueCalculator(), getLastUpdated()]);

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: "Champions League", path: p.championsLeague },
          { name: t("Table calculator", "Tabellenrechner"), path: p.championsLeagueCalculator },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={p.championsLeague} className="hover:underline">
            Champions League
          </Link>
          {data ? ` · ${seasonLabel(data.season)}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Champions League table calculator", "Tabellenrechner Champions League")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {data
            ? t(
                `Enter your own results for the ${data.fixtures.length} remaining matches of the league phase and see at once who finishes in the top 8, who goes into the play-offs and who is out. Your results are saved in this browser and can be shared as a link.`,
                `Trag deine eigenen Ergebnisse für die ${data.fixtures.length} restlichen Spiele der Ligaphase ein und sieh sofort, wer unter die ersten 8 kommt, wer in die Play-offs muss und wer ausscheidet. Deine Ergebnisse bleiben in diesem Browser gespeichert und lassen sich als Link teilen.`,
              )
            : t(
                "The calculator needs the current league phase table and fixtures.",
                "Der Rechner braucht die aktuelle Tabelle der Ligaphase und den Spielplan.",
              )}
        </p>
      </header>

      {data && data.fixtures.length > 0 ? (
        <>
          <TableCalculator
            leagueSlug={data.leagueSlug}
            season={data.season}
            teams={data.teams}
            fixtures={data.fixtures}
            locale={locale}
            zones={{ direct: 8, playoff: 24 }}
            tieNote={t(
              "▲▼: places compared with the current table. Ties are split by goal difference, then goals scored; UEFA's further criteria (away goals, wins and more) are not applied.",
              "▲▼: Plätze im Vergleich zur aktuellen Tabelle. Bei Punktgleichheit entscheiden Tordifferenz, dann erzielte Tore; die weiteren UEFA-Kriterien (Auswärtstore, Siege und mehr) werden nicht angewendet.",
            )}
          />
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-brand" />{" "}
              {t("1 to 8: round of 16", "1 bis 8: Achtelfinale")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-neutral" />{" "}
              {t("9 to 24: knockout play-offs", "9 bis 24: K.-o.-Play-offs")}
            </span>
            <span>{t("25 to 36: out", "25 bis 36: ausgeschieden")}</span>
          </p>
        </>
      ) : (
        <DataNotice
          reason={
            data
              ? t(
                  "All league phase matches have been played.",
                  "Alle Spiele der Ligaphase sind gespielt.",
                )
              : t(
                  "The league phase table has not been imported yet.",
                  "Die Tabelle der Ligaphase wurde noch nicht importiert.",
                )
          }
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
            "Since 2024/25 the Champions League starts with one league phase of 36 clubs and 8 matches each. Places 1 to 8 go straight to the round of 16, places 9 to 24 play a two-legged knockout play-off, places 25 to 36 are out. The calculator starts from the official table; matches played in the meantime drop out and count with their real score. Share link puts all your results in one link for friends.",
            "Seit 2024/25 beginnt die Champions League mit einer Ligaphase aus 36 Vereinen und je 8 Spielen. Die Plätze 1 bis 8 ziehen direkt ins Achtelfinale ein, die Plätze 9 bis 24 spielen K.-o.-Play-offs mit Hin- und Rückspiel, die Plätze 25 bis 36 scheiden aus. Der Rechner startet bei der offiziellen Tabelle; inzwischen gespielte Partien fallen heraus und zählen mit dem echten Ergebnis. „Link teilen“ packt alle deine Ergebnisse in einen Link für Freunde.",
          )}
        </p>
        <p>
          {t(
            "Win probabilities for the next matches are on the ",
            "Siegwahrscheinlichkeiten für die nächsten Spiele stehen auf der ",
          )}
          <Link href={p.championsLeague} className="underline underline-offset-4">
            {t("Champions League page", "Champions-League-Seite")}
          </Link>
          .
        </p>
      </section>

      <nav
        aria-label={t("League calculators", "Liga-Rechner")}
        className="flex flex-wrap gap-2 text-sm"
      >
        {LEAGUES.map((l) => (
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
