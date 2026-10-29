import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProbabilityBar } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LocalTime } from "@/components/local-time";
import { LastUpdated, MatchList } from "@/components/match-list";
import { Crest, Eyebrow, FormGuide, SectionHeading } from "@/components/ui";
import { getLeagueBySlug } from "@/config/leagues";
import { getAllMatchSlugs, getLastUpdated, getMatch, type MatchDetail } from "@/data";
import { fmtDate, fmtDecimal, fmtPercent, ordinal, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Match pages: /matches/{home}-vs-{away}-{season}/ and /de/spiele/…
 * Before kick-off: forecast and form. After the match: result next to the
 * pre-match forecast.
 */
const NO_MATCHES_PLACEHOLDER = "no-matches-yet";

export async function matchStaticParams() {
  const slugs = await getAllMatchSlugs();
  return (slugs.length > 0 ? slugs : [NO_MATCHES_PLACEHOLDER]).map((slug) => ({ slug }));
}

const isFinished = (m: MatchDetail) =>
  m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;

const dateLabel = (locale: Locale, iso: string) =>
  fmtDate(locale, iso, { day: "numeric", month: "short", year: "numeric" });

export async function matchMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const m = slug === NO_MATCHES_PLACEHOLDER ? undefined : await getMatch(slug);
  if (!m) {
    return pageMetadata({
      locale,
      title: tr(locale, "Matches", "Spiele"),
      description: tr(locale, "Match pages are not available yet.", "Noch keine Spielseiten."),
      path: paths(locale).match(slug),
      noIndex: true,
    });
  }
  const h = m.home.shortName;
  const a = m.away.shortName;
  const date = dateLabel(locale, m.utcDate);
  const day = fmtDate(locale, m.utcDate, { day: "numeric", month: "short" });
  const both = { en: paths("en").match(m.slug), de: paths("de").match(m.slug) };
  const pct = (n: number) => fmtPercent(locale, n);
  if (isFinished(m)) {
    return pageMetadata({
      locale,
      title: tr(
        locale,
        `${h} ${m.homeGoals}:${m.awayGoals} ${a}: result and stats (${day})`,
        `${h} ${m.homeGoals}:${m.awayGoals} ${a}: Ergebnis (${day})`,
      ),
      description: tr(
        locale,
        `${h} vs ${a} (${m.competitionName}, ${date}) ended ${m.homeGoals}:${m.awayGoals}. With the pre-match forecast, form and season stats of both clubs.`,
        `${h} gegen ${a} (${m.competitionName}, ${date}) endete ${m.homeGoals}:${m.awayGoals}. Mit der Prognose vor dem Spiel, Form und Saisonstatistik.`,
      ),
      paths: both,
      image: ogImage.match(m.slug),
    });
  }
  const p = m.forecast?.percentages;
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${h} vs ${a} prediction and stats (${day})`,
      `${h} gegen ${a}: Prognose (${day})`,
    ),
    description: p
      ? tr(
          locale,
          `${h} vs ${a} (${m.competitionName}, ${date}): ${h} win ${pct(p.home)}, draw ${pct(p.draw)}, ${a} win ${pct(p.away)}. Plus form, table and season stats of both clubs.`,
          `${h} gegen ${a} (${m.competitionName}, ${date}): Sieg ${h} ${pct(p.home)}, Remis ${pct(p.draw)}, Sieg ${a} ${pct(p.away)}. Dazu Form, Tabelle und Saisonstatistik.`,
        )
      : tr(
          locale,
          `${h} vs ${a} (${m.competitionName}, ${date}): form, table, season stats and recent results of both clubs, updated several times a day.`,
          `${h} gegen ${a} (${m.competitionName}, ${date}): Form, Tabelle, Saisonstatistik und letzte Ergebnisse beider Vereine, mehrmals täglich aktuell.`,
        ),
    paths: both,
    image: ogImage.match(m.slug),
  });
}

/** Plain-language summary: the main text of the page for readers and search engines. */
function summary(m: MatchDetail, locale: Locale): string[] {
  const h = m.home;
  const a = m.away;
  const de = locale === "de";
  const pct = (n: number) => fmtPercent(locale, n);
  const lines: string[] = [];
  const describe = (s: MatchDetail["home"]) => {
    const league = getLeagueBySlug(s.leagueSlug)?.name;
    const parts: string[] = [];
    if (s.ranking) {
      parts.push(
        de
          ? `${s.shortName} steht im Footiqra Power-Ranking auf Platz ${s.ranking.rank} (Rating ${Math.round(s.ranking.rating)})`
          : `${s.shortName} are ${ordinal(locale, s.ranking.rank)} in the Footiqra power ranking (rating ${Math.round(s.ranking.rating)})`,
      );
    }
    if (s.table) {
      parts.push(
        de
          ? `${parts.length > 0 ? "" : `${s.shortName} ist `}${s.table.position}. der ${league ?? "Liga"} mit ${s.table.points} Punkten aus ${s.table.playedGames} Spielen`
          : `${ordinal(locale, s.table.position)} in the ${league ?? "league"} with ${s.table.points} points from ${s.table.playedGames} matches`,
      );
    }
    if (parts.length === 0) return null;
    return de && parts.length === 2
      ? `${parts[0]} und ist ${parts[1]}.`
      : `${parts.join(de ? " und " : " and ")}.`;
  };
  for (const s of [h, a]) {
    const text = describe(s);
    if (text) lines.push(text);
  }
  const p = m.forecast?.percentages;
  if (p) {
    const fav = p.home > p.away + 5 ? h.shortName : p.away > p.home + 5 ? a.shortName : null;
    if (isFinished(m)) {
      const outcome =
        m.homeGoals! > m.awayGoals! ? "home" : m.homeGoals! < m.awayGoals! ? "away" : "draw";
      const chance = p[outcome];
      const winner = outcome === "home" ? h.shortName : a.shortName;
      const result =
        outcome === "draw"
          ? de
            ? `Das Spiel endete ${m.homeGoals}:${m.awayGoals} unentschieden`
            : `The match ended in a ${m.homeGoals}:${m.awayGoals} draw`
          : de
            ? `${winner} gewann ${m.homeGoals}:${m.awayGoals}`
            : `${winner} won ${m.homeGoals}:${m.awayGoals}`;
      const favourite = p.home >= p.away ? "home" : "away";
      const verdict =
        outcome === "draw"
          ? ""
          : outcome === favourite
            ? de
              ? "; der Favorit hat also geliefert"
              : ", so the favourite delivered"
            : chance < 30
              ? de
                ? "; es war also eine Überraschung"
                : ", so it was an upset"
              : "";
      lines.push(
        de
          ? `${result}. Vor dem Anpfiff gab das Modell diesem Ausgang eine Chance von ${pct(chance)}${verdict}.`
          : `${result}. Before kick-off the model gave this outcome a ${pct(chance)} chance${verdict}.`,
      );
    } else {
      const odds = de
        ? `Sieg ${h.shortName} ${pct(p.home)}, Unentschieden ${pct(p.draw)}, Sieg ${a.shortName} ${pct(p.away)}`
        : `${h.shortName} win ${pct(p.home)}, draw ${pct(p.draw)}, ${a.shortName} win ${pct(p.away)}`;
      lines.push(
        fav
          ? de
            ? `Das Modell sieht ${fav} als Favoriten: ${odds}.`
            : `The model sees ${fav} as favourite: ${odds}.`
          : de
            ? `Das Modell erwartet ein enges Spiel: ${odds}.`
            : `The model expects a close match: ${odds}.`,
      );
    }
  }
  return lines;
}

function StatRow({ label, home, away }: { label: string; home: ReactNode; away: ReactNode }) {
  return (
    <tr className="border-t border-line/80">
      <td className="tabular w-1/3 py-3 pl-5 text-left font-display text-lg font-bold sm:pl-7">
        {home}
      </td>
      <th scope="row" className="py-3 text-center text-sm font-medium text-muted">
        {label}
      </th>
      <td className="tabular w-1/3 py-3 pr-5 text-right font-display text-lg font-bold sm:pr-7">
        {away}
      </td>
    </tr>
  );
}

export async function MatchView({ locale, slug }: { locale: Locale; slug: string }) {
  if (slug === NO_MATCHES_PLACEHOLDER) notFound();
  const [m, lastUpdated] = await Promise.all([getMatch(slug), getLastUpdated()]);
  if (!m) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);

  const finished = isFinished(m);
  const league = m.leagueSlug ? getLeagueBySlug(m.leagueSlug) : undefined;
  const h = m.home;
  const a = m.away;
  const statusLabel: Record<string, string> = {
    POSTPONED: t("Postponed", "Verlegt"),
    CANCELLED: t("Cancelled", "Abgesagt"),
    SUSPENDED: t("Suspended", "Unterbrochen"),
    IN_PLAY: "Live",
    PAUSED: t("Half-time", "Halbzeit"),
  };
  const perGame = (total: number, played: number) =>
    played > 0 ? fmtDecimal(locale, total / played, 2) : "·";
  const share = (n: number, played: number) =>
    played > 0 ? fmtPercent(locale, Math.round((n / played) * 100)) : "·";
  const record = (r: { won: number; drawn: number; lost: number }) =>
    `${r.won}-${r.drawn}-${r.lost}`;
  const vs = t("vs", "gegen");

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          league
            ? { name: league.name, path: p.league(league.slug) }
            : { name: t("Predictions", "Prognosen"), path: p.predictions },
          { name: `${h.shortName} ${vs} ${a.shortName}`, path: p.match(m.slug) },
        ])}
      />

      <header>
        <Eyebrow>
          {m.competitionName}
          {m.matchday ? ` · ${t("Matchday", "Spieltag")} ${m.matchday}` : ""}
        </Eyebrow>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] bg-surface px-4 py-8 sm:gap-6 sm:px-10 sm:py-10">
          <Link href={p.team(h.slug)} className="flex flex-col items-center gap-3 text-center">
            <Crest src={h.crest} name={h.name} size={72} />
            <span className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] sm:text-3xl">
              {h.shortName}
            </span>
          </Link>
          <div className="text-center">
            {finished ? (
              <p className="tabular font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">
                {m.homeGoals}:{m.awayGoals}
              </p>
            ) : (
              <p className="font-display text-2xl font-extrabold text-muted sm:text-4xl">vs</p>
            )}
            <p className="mt-2 text-xs font-medium text-muted sm:text-sm">
              {finished
                ? `${t("Full time", "Endstand")} · `
                : statusLabel[m.status]
                  ? `${statusLabel[m.status]} · `
                  : ""}
              <LocalTime utc={m.utcDate} locale={locale} />
            </p>
          </div>
          <Link href={p.team(a.slug)} className="flex flex-col items-center gap-3 text-center">
            <Crest src={a.crest} name={a.name} size={72} />
            <span className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] sm:text-3xl">
              {a.shortName}
            </span>
          </Link>
        </div>
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl">
          {finished
            ? `${h.shortName} ${m.homeGoals}:${m.awayGoals} ${a.shortName}`
            : t(
                `${h.shortName} vs ${a.shortName}: prediction and stats`,
                `${h.shortName} gegen ${a.shortName}: Prognose und Statistik`,
              )}
        </h1>
        <div className="mt-4 max-w-3xl space-y-2 text-lg text-muted">
          {summary(m, locale).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      {m.forecast && (
        <section aria-labelledby="forecast-heading">
          <SectionHeading
            id="forecast-heading"
            title={
              m.forecast.basis === "pre-match"
                ? t("Pre-match forecast", "Prognose vor dem Spiel")
                : t("Forecast", "Prognose")
            }
            aside={
              <Link
                href={`${p.methodology}#forecasts`}
                className="text-sm text-muted hover:text-foreground"
              >
                {t("How it works", "So funktioniert es")}
              </Link>
            }
          />
          <div className="rounded-3xl bg-surface p-5 sm:p-7">
            <ProbabilityBar
              percentages={m.forecast.percentages}
              labels={{ home: h.shortName, draw: t("draw", "Remis"), away: a.shortName }}
              large
              locale={locale}
            />
            <p className="mt-4 text-sm text-muted">
              {m.forecast.basis === "pre-match"
                ? t(
                    "Calculated with both ratings as they were before kick-off.",
                    "Berechnet mit beiden Ratings, wie sie vor dem Anpfiff waren.",
                  )
                : t(
                    "Based on the current ratings; it changes as results come in. Model estimate, not betting advice.",
                    "Basiert auf den aktuellen Ratings und ändert sich mit neuen Ergebnissen. Modellschätzung, keine Wettberatung.",
                  )}
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="compare-heading">
        <SectionHeading
          id="compare-heading"
          title={t("Comparison", "Vergleich")}
          aside={
            <span className="text-sm text-muted">
              {t("League matches this season", "Ligaspiele dieser Saison")}
            </span>
          }
        />
        <div className="overflow-hidden rounded-3xl bg-surface">
          <table className="w-full text-[15px]">
            <caption className="sr-only">
              {t(
                `Season statistics of ${h.name} and ${a.name}`,
                `Saisonstatistik von ${h.name} und ${a.name}`,
              )}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-4 pl-5 text-left sm:pl-7">
                  <span className="flex items-center gap-2 font-semibold">
                    <Crest src={h.crest} name={h.name} size={24} />
                    <span className="truncate">{h.shortName}</span>
                  </span>
                </th>
                <th scope="col" className="sr-only">
                  {t("Statistic", "Statistik")}
                </th>
                <th scope="col" className="py-4 pr-5 text-right sm:pr-7">
                  <span className="flex items-center justify-end gap-2 font-semibold">
                    <span className="truncate">{a.shortName}</span>
                    <Crest src={a.crest} name={a.name} size={24} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <StatRow
                label={t("Power rank", "Power-Rang")}
                home={h.ranking ? `#${h.ranking.rank}` : "·"}
                away={a.ranking ? `#${a.ranking.rank}` : "·"}
              />
              <StatRow
                label="Rating"
                home={h.ranking ? Math.round(h.ranking.rating) : "·"}
                away={a.ranking ? Math.round(a.ranking.rating) : "·"}
              />
              <StatRow
                label={t("League position", "Tabellenplatz")}
                home={h.table ? ordinal(locale, h.table.position) : "·"}
                away={a.table ? ordinal(locale, a.table.position) : "·"}
              />
              <StatRow
                label={t("Points", "Punkte")}
                home={h.table?.points ?? "·"}
                away={a.table?.points ?? "·"}
              />
              <StatRow
                label={t("Won-drawn-lost", "Siege-Remis-Niederlagen")}
                home={record(h.stats)}
                away={record(a.stats)}
              />
              <StatRow
                label={t("Home / away record", "Heim- / Auswärtsbilanz")}
                home={record(h.stats.home)}
                away={record(a.stats.away)}
              />
              <StatRow
                label={t("Goals per match", "Tore pro Spiel")}
                home={perGame(h.stats.goalsFor, h.stats.played)}
                away={perGame(a.stats.goalsFor, a.stats.played)}
              />
              <StatRow
                label={t("Conceded per match", "Gegentore pro Spiel")}
                home={perGame(h.stats.goalsAgainst, h.stats.played)}
                away={perGame(a.stats.goalsAgainst, a.stats.played)}
              />
              <StatRow
                label={t("Clean sheets", "Spiele ohne Gegentor")}
                home={share(h.stats.cleanSheets, h.stats.played)}
                away={share(a.stats.cleanSheets, a.stats.played)}
              />
              <StatRow
                label={t("Both teams scored", "Beide Teams treffen")}
                home={share(h.stats.bothScored, h.stats.played)}
                away={share(a.stats.bothScored, a.stats.played)}
              />
              <StatRow
                label={t("3+ goals in match", "3+ Tore im Spiel")}
                home={share(h.stats.over25, h.stats.played)}
                away={share(a.stats.over25, a.stats.played)}
              />
              <StatRow
                label="Form"
                home={<FormGuide form={h.form} locale={locale} />}
                away={
                  <span className="flex justify-end">
                    <FormGuide form={a.form} locale={locale} />
                  </span>
                }
              />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          {t(
            `Home / away record: ${h.shortName} at home, ${a.shortName} away. Form includes all competitions.`,
            `Heim- / Auswärtsbilanz: ${h.shortName} zu Hause, ${a.shortName} auswärts. Die Form umfasst alle Wettbewerbe.`,
          )}
        </p>
      </section>

      <section aria-labelledby="h2h-heading">
        <SectionHeading id="h2h-heading" title={t("Previous meetings", "Bisherige Duelle")} />
        {m.headToHead.length > 0 ? (
          <MatchList
            matches={m.headToHead}
            caption={t(
              `Previous meetings of ${h.name} and ${a.name}`,
              `Bisherige Duelle von ${h.name} und ${a.name}`,
            )}
            locale={locale}
          />
        ) : (
          <p className="rounded-3xl bg-surface px-6 py-6 text-muted">
            {t(
              "No earlier meeting of these two clubs this season.",
              "In dieser Saison gab es noch kein Duell der beiden Vereine.",
            )}
          </p>
        )}
      </section>

      <section aria-labelledby="recent-heading">
        <SectionHeading id="recent-heading" title={t("Latest results", "Letzte Ergebnisse")} />
        <div className="grid gap-6 lg:grid-cols-2">
          {[h, a].map((s) => (
            <div key={s.slug} className="min-w-0">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                <Crest src={s.crest} name={s.name} size={24} />
                <Link href={p.team(s.slug)} className="hover:underline hover:underline-offset-4">
                  {s.shortName}
                </Link>
              </h3>
              {s.recent.length > 0 ? (
                <MatchList
                  matches={s.recent}
                  caption={t(`Latest results of ${s.name}`, `Letzte Ergebnisse von ${s.name}`)}
                  locale={locale}
                />
              ) : (
                <p className="rounded-3xl bg-surface px-6 py-6 text-muted">
                  {t("No results yet.", "Noch keine Ergebnisse.")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <nav
        aria-label={t("Related pages", "Verwandte Seiten")}
        className="flex flex-wrap gap-2 text-sm"
      >
        {league && (
          <Link
            href={p.league(league.slug)}
            className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
          >
            {t(`${league.name} table and ranking`, `${league.name}: Tabelle und Ranking`)}
          </Link>
        )}
        <Link
          href={p.predictions}
          className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
        >
          {t("All predictions", "Alle Prognosen")}
        </Link>
      </nav>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
