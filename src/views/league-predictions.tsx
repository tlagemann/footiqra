import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  getForecastRecord,
  getLastUpdated,
  getLeagueTable,
  getUpcomingForecasts,
  type MatchForecast,
} from "@/data";
import { fmtDate, fmtPercent, paths, seasonLabel, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Predictions of one league: /leagues/{slug}/predictions/ and /de/ligen/{slug}/prognosen/
 * Shows the next two matchdays, with the most likely outcome of every match as the tip.
 */

export function leaguePredictionsStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export interface MatchdayGroup {
  /** null when the provider has no matchday number. */
  matchday: number | null;
  forecasts: MatchForecast[];
}

/**
 * The next `count` matchdays of a league. Postponed single matches of earlier
 * rounds are kept with the round they are played in, not shown as a matchday of their own.
 */
export function nextMatchdays(
  forecasts: readonly MatchForecast[],
  leagueSlug: string,
  count = 2,
): MatchdayGroup[] {
  const own = forecasts.filter((f) => f.leagueSlug === leagueSlug);
  const byDay = new Map<number | null, MatchForecast[]>();
  for (const f of own) byDay.set(f.matchday, [...(byDay.get(f.matchday) ?? []), f]);
  const groups = [...byDay].map(([matchday, list]) => ({ matchday, forecasts: list }));
  const first = (g: MatchdayGroup) => Date.parse(g.forecasts[0]!.utcDate);
  groups.sort((a, b) => first(a) - first(b));
  const rounds = groups.filter((g) => g.forecasts.length >= 3).slice(0, count);
  if (rounds.length === 0) return groups.slice(0, count);
  const lastEnd = Math.max(...rounds.at(-1)!.forecasts.map((f) => Date.parse(f.utcDate)));
  // Leftover matches of earlier rounds played within the window join the round on the same dates.
  for (const g of groups) {
    if (rounds.includes(g) || first(g) > lastEnd) continue;
    const host =
      rounds.find((r) => first(g) <= Math.max(...r.forecasts.map((f) => Date.parse(f.utcDate)))) ??
      rounds.at(-1)!;
    host.forecasts = [...host.forecasts, ...g.forecasts].sort(
      (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id,
    );
  }
  return rounds;
}

/** Outcome with the highest probability. */
export function tipOf(f: MatchForecast): "home" | "draw" | "away" {
  const p = f.probabilities;
  return p.home >= p.away
    ? p.home >= p.draw
      ? "home"
      : "draw"
    : p.away >= p.draw
      ? "away"
      : "draw";
}

function tipText(locale: Locale, f: MatchForecast): string {
  const tip = tipOf(f);
  const pct = fmtPercent(locale, f.percentages[tip]);
  if (tip === "draw") return tr(locale, `draw (${pct})`, `Remis (${pct})`);
  const team = tip === "home" ? f.home.name : f.away.name;
  return tr(locale, `${team} win (${pct})`, `Sieg ${team} (${pct})`);
}

function roundLabel(locale: Locale, matchday: number | null): string {
  return matchday === null
    ? tr(locale, "next matches", "nächste Spiele")
    : tr(locale, `matchday ${matchday}`, `${matchday}. Spieltag`);
}

/** "all 9 matches" for a full round, "the remaining 3 matches" once part of it is played. */
function matchCount(locale: Locale, n: number, perRound: number): string {
  if (perRound > 0 && n < perRound)
    return tr(locale, `the remaining ${n} matches`, `die restlichen ${n} Spiele`);
  return tr(locale, `all ${n} matches`, `alle ${n} Spiele`);
}

/** Clearest favourite and the most even match of a round. */
function highlights(list: readonly MatchForecast[]) {
  const strength = (f: MatchForecast) => Math.max(f.probabilities.home, f.probabilities.away);
  const sorted = [...list].sort((a, b) => strength(b) - strength(a) || a.id - b.id);
  return { favourite: sorted[0], closest: sorted.at(-1) };
}

async function load(slug: string) {
  const league = getLeagueBySlug(slug);
  if (!league) return undefined;
  const [all, table] = await Promise.all([getUpcomingForecasts(), getLeagueTable(league.slug)]);
  const rounds = nextMatchdays(all, league.slug);
  const perRound = table ? Math.floor(table.rows.length / 2) : 0;
  return { league, rounds, season: table?.season ?? null, perRound };
}

export async function leaguePredictionsMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const data = await load(slug);
  if (!data) return {};
  const { league, rounds, season, perRound } = data;
  const round = rounds[0];
  const s = season ? ` ${seasonLabel(season)}` : "";
  const fav = round ? highlights(round.forecasts).favourite : undefined;
  const label = round ? roundLabel(locale, round.matchday) : null;
  return pageMetadata({
    locale,
    title:
      round && round.matchday !== null
        ? tr(
            locale,
            `${league.name} predictions and tips: matchday ${round.matchday}${s}`,
            `${league.name} Prognosen und Tipps: ${round.matchday}. Spieltag${s}`,
          )
        : tr(
            locale,
            `${league.name} predictions and tips${s}`,
            `${league.name} Prognosen und Tipps${s}`,
          ),
    description:
      round && fav
        ? tr(
            locale,
            `Win, draw and loss chances for ${matchCount(locale, round.forecasts.length, perRound)} of ${label} in the ${league.name}. Biggest favourite: ${fav.home.name} vs ${fav.away.name}, tip ${tipText(locale, fav)}. From the Footiqra power ratings.`,
            `Sieg-, Remis- und Niederlagenchancen für ${matchCount(locale, round.forecasts.length, perRound)} der ${league.name} am ${label}. Größter Favorit: ${fav.home.name} gegen ${fav.away.name}, Tipp ${tipText(locale, fav)}. Aus den Footiqra Power-Ratings.`,
          )
        : tr(
            locale,
            `Win, draw and loss chances for the next ${league.name} matches, from the Footiqra power ratings.`,
            `Sieg-, Remis- und Niederlagenchancen für die nächsten Spiele der ${league.name}, aus den Footiqra Power-Ratings.`,
          ),
    paths: {
      en: paths("en").leaguePredictions(league.slug),
      de: paths("de").leaguePredictions(league.slug),
    },
    image: ogImage.league(league.slug),
  });
}

export async function LeaguePredictionsView({ locale, slug }: { locale: Locale; slug: string }) {
  const data = await load(slug);
  if (!data) notFound();
  const { league, rounds, season, perRound } = data;
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [record, lastUpdated] = await Promise.all([getForecastRecord(), getLastUpdated()]);
  const first = rounds[0];
  const hl = first ? highlights(first.forecasts) : undefined;
  const dateRange = (list: readonly MatchForecast[]) => {
    const fmt = (iso: string) => fmtDate(locale, iso, { day: "numeric", month: "long" });
    const a = fmt(list[0]!.utcDate);
    const b = fmt(list.at(-1)!.utcDate);
    return a === b ? a : `${a} ${t("to", "bis")} ${b}`;
  };

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: league.name, path: p.league(league.slug) },
          { name: t("Predictions", "Prognosen"), path: p.leaguePredictions(league.slug) },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={p.league(league.slug)} className="hover:underline">
            {league.name}
          </Link>
          {season ? ` · ${seasonLabel(season)}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {first && first.matchday !== null
            ? t(
                `${league.name} predictions: matchday ${first.matchday}`,
                `${league.name} Prognosen: ${first.matchday}. Spieltag`,
              )
            : t(`${league.name} predictions`, `${league.name} Prognosen`)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {first && hl?.favourite && hl.closest
            ? locale === "de"
              ? `Unsere Tipps für ${matchCount(locale, first.forecasts.length, perRound)} am ${roundLabel(locale, first.matchday)} (${dateRange(first.forecasts)}). Größter Favorit ist ${hl.favourite.home.name} gegen ${hl.favourite.away.name}: Tipp ${tipText(locale, hl.favourite)}. Am offensten ist ${hl.closest.home.name} gegen ${hl.closest.away.name}.`
              : `Our tips for ${matchCount(locale, first.forecasts.length, perRound)} of ${roundLabel(locale, first.matchday)} (${dateRange(first.forecasts)}). The biggest favourite is ${hl.favourite.home.name} vs ${hl.favourite.away.name}: tip ${tipText(locale, hl.favourite)}. The most open match is ${hl.closest.home.name} vs ${hl.closest.away.name}.`
            : t(
                `Win, draw and loss chances for the next ${league.name} matches.`,
                `Sieg-, Remis- und Niederlagenchancen für die nächsten Spiele der ${league.name}.`,
              )}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <Link href={p.projection(league.slug)} className="hover:underline">
            {t("Predicted final table", "Prognose Abschlusstabelle")} <span aria-hidden>→</span>
          </Link>
          <Link href={p.leagueCalculator(league.slug)} className="hover:underline">
            {t("Table calculator", "Tabellenrechner")} <span aria-hidden>→</span>
          </Link>
          <Link href={p.league(league.slug)} className="hover:underline">
            {t(`${league.name} table`, `Tabelle ${league.name}`)} <span aria-hidden>→</span>
          </Link>
        </p>
      </header>

      {rounds.length > 0 ? (
        rounds.map((round, i) => (
          <section key={`${round.matchday}-${i}`} aria-labelledby={`round-${i}`}>
            <SectionHeading
              id={`round-${i}`}
              title={
                round.matchday !== null
                  ? t(`Matchday ${round.matchday}`, `${round.matchday}. Spieltag`)
                  : t("Next matches", "Nächste Spiele")
              }
              aside={<span className="text-sm text-muted">{dateRange(round.forecasts)}</span>}
            />
            <ForecastList forecasts={round.forecasts} locale={locale} showTip />
          </section>
        ))
      ) : (
        <DataNotice
          reason={t(
            "No upcoming league matches are stored right now.",
            "Aktuell sind keine anstehenden Ligaspiele gespeichert.",
          )}
          locale={locale}
        />
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How the tips are made", "So entstehen die Tipps")}
        </h2>
        <p>
          {t(
            `Each tip is the most likely outcome from the Footiqra power ratings of both clubs plus home advantage. Every result in the ${league.name} and in European competition moves the ratings, so the tips are updated several times a day. Model estimates, not betting advice.`,
            `Jeder Tipp ist der wahrscheinlichste Ausgang laut den Footiqra Power-Ratings beider Vereine plus Heimvorteil. Jedes Ergebnis in der ${league.name} und im Europapokal verändert die Ratings, deshalb werden die Tipps mehrmals täglich aktualisiert. Modellschätzungen, keine Wettberatung.`,
          )}
        </p>
        {record && (
          <p>
            {locale === "de"
              ? `Bilanz dieser Saison über alle Ligen: Der Favorit des Modells gewann ${fmtPercent(locale, Math.round(record.hitRate * 100))} von ${record.matches} Spielen.`
              : `Record this season across all leagues: the model's favourite won ${fmtPercent(locale, Math.round(record.hitRate * 100))} of ${record.matches} matches.`}
          </p>
        )}
        <p>
          <Link href={`${p.methodology}#forecasts`} className="underline underline-offset-4">
            {t("Methodology", "Methodik")}
          </Link>
          {" · "}
          <Link href={p.predictions} className="underline underline-offset-4">
            {t("Predictions for all leagues", "Prognosen aller Ligen")}
          </Link>
        </p>
        <nav aria-label={t("Predictions by league", "Prognosen nach Liga")}>
          <ul className="flex flex-wrap gap-2 pt-2">
            {LEAGUES.filter((l) => l.slug !== league.slug).map((l) => (
              <li key={l.slug}>
                <Link
                  href={p.leaguePredictions(l.slug)}
                  className="inline-block rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-strong"
                >
                  {t(`${l.name} predictions`, `${l.name} Prognosen`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
