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
import { MatchTrend, type TrendSeries } from "@/components/rating-trend";
import {
  getAllMatchSlugs,
  getLastUpdated,
  getLeagueProjection,
  getMatch,
  getRankHistory,
  getRatingHistory,
  type MatchDetail,
  type MatchStakes,
  type RankPoint,
  type RatingPoint,
  type ZoneChances,
} from "@/data";
import {
  fmtChance,
  fmtDate,
  fmtDecimal,
  fmtPercent,
  ordinal,
  paths,
  seasonLabel,
  tr,
  type Locale,
} from "@/i18n";
import { getSiteUrl } from "@/config/site";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";
import { getWeekRanking } from "@/views/top-matches";

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

/** "Sunday, 1 November 2026" / "Sonntag, 1. November 2026" */
const fullDate = (locale: Locale, iso: string) =>
  fmtDate(locale, iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
    // The full date with year stays in the title, so it is always clear which match it was.
    return pageMetadata({
      locale,
      title: tr(
        locale,
        `${h} ${m.homeGoals}:${m.awayGoals} ${a}: result (${date})`,
        `${h} ${m.homeGoals}:${m.awayGoals} ${a}: Ergebnis (${date})`,
      ),
      description: m.archived
        ? tr(
            locale,
            `${h} vs ${a} (${m.competitionName}, ${fullDate(locale, m.utcDate)}) ended ${m.homeGoals}:${m.awayGoals}. With the pre-match forecast of the Footiqra model.`,
            `${h} gegen ${a} (${m.competitionName}, ${fullDate(locale, m.utcDate)}) endete ${m.homeGoals}:${m.awayGoals}. Mit der Prognose des Footiqra Modells vor dem Spiel.`,
          )
        : tr(
            locale,
            `${h} vs ${a} (${m.competitionName}, ${date}) ended ${m.homeGoals}:${m.awayGoals}. With the pre-match forecast, form and season stats of both clubs.`,
            `${h} gegen ${a} (${m.competitionName}, ${date}) endete ${m.homeGoals}:${m.awayGoals}. Mit der Prognose vor dem Spiel, Form und Saisonstatistik.`,
          ),
      paths: both,
      image: m.archived
        ? m.leagueSlug
          ? ogImage.league(m.leagueSlug)
          : ogImage.championsLeague
        : ogImage.match(m.slug),
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
function summary(m: MatchDetail, locale: Locale, stakesLine: string | null): string[] {
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
      const top = m.forecast?.scorelines.top[0];
      if (top) {
        lines.push(
          de
            ? `Das wahrscheinlichste Ergebnis ist ${top.home}:${top.away} (${pct(Math.round(top.probability * 100))}), die Chance auf mindestens drei Tore liegt bei ${fmtChance(locale, m.forecast!.scorelines.over25)}.`
            : `The most likely score is ${top.home}:${top.away} (${pct(Math.round(top.probability * 100))}), and the chance of three or more goals is ${fmtChance(locale, m.forecast!.scorelines.over25)}.`,
        );
      }
    }
  }
  const pr = m.profile;
  if (pr && pr.weekRank <= 10 && pr.weekMatches >= 10) {
    const where = de
      ? pr.weekRank === 1
        ? "ist es das größte"
        : `liegt es auf Platz ${pr.weekRank}`
      : pr.weekRank === 1
        ? "it is the biggest"
        : `it is the ${ordinal(locale, pr.weekRank)} biggest`;
    lines.push(
      de
        ? `Gemessen an der Stärke beider Vereine ${where} von ${pr.weekMatches} Spielen dieser Woche in Europas Topligen.`
        : `By the strength of both clubs ${where} of ${pr.weekMatches} matches this week in Europe's top leagues.`,
    );
  }
  if (stakesLine) lines.push(stakesLine);
  return lines;
}

type Zone = keyof ZoneChances;
type SideStakes = MatchStakes["home"];
const ZONES: readonly Zone[] = ["title", "top4", "bottom3"];

/** A zone is worth showing when the match can move it and it is not already settled. */
function relevantZones(st: SideStakes): Zone[] {
  return ZONES.filter((z) => {
    const v = [st.now[z], st.win[z], st.draw[z], st.loss[z]];
    const max = Math.max(...v);
    const min = Math.min(...v);
    return max >= 0.03 && min <= 0.97 && max - min >= 0.02;
  });
}

/** The biggest swing of the match as one sentence, or null if nothing much is at stake. */
function stakesHeadline(m: MatchDetail, stakes: MatchStakes, locale: Locale): string | null {
  const de = locale === "de";
  const c = (p: number) => fmtChance(locale, p);
  let best: { name: string; zone: Zone; st: SideStakes; swing: number } | null = null;
  for (const [name, st] of [
    [m.home.shortName, stakes.home],
    [m.away.shortName, stakes.away],
  ] as const) {
    for (const zone of relevantZones(st)) {
      const swing = Math.abs(st.win[zone] - st.loss[zone]);
      if (!best || swing > best.swing) best = { name, zone, st, swing };
    }
  }
  if (!best || best.swing < 0.03) return null;
  const { name, zone, st } = best;
  const now = st.now[zone];
  const win = st.win[zone];
  const loss = st.loss[zone];
  if (zone === "bottom3") {
    if (!(win < now && loss > now)) return null;
    return de
      ? `Ein Sieg würde das Risiko von ${name}, die Saison unter den letzten drei zu beenden, von ${c(now)} auf ${c(win)} senken, eine Niederlage würde es auf ${c(loss)} erhöhen.`
      : `A win would cut ${name}'s risk of finishing the season in the bottom three from ${c(now)} to ${c(win)}; a defeat would raise it to ${c(loss)}.`;
  }
  if (!(win > now && loss < now)) return null;
  const what = de
    ? zone === "title"
      ? "die Meisterschaft"
      : "einen Platz unter den ersten vier am Saisonende"
    : zone === "title"
      ? "title"
      : "top-four";
  return de
    ? `Ein Sieg würde die Chance von ${name} auf ${what} von ${c(now)} auf ${c(win)} heben, eine Niederlage würde sie auf ${c(loss)} senken.`
    : `A win would lift ${name}'s chance of a ${what} finish from ${c(now)} to ${c(win)}; a defeat would drop it to ${c(loss)}.`;
}

function StakesTable({
  name,
  crest,
  st,
  locale,
}: {
  name: string;
  crest: string | null;
  st: SideStakes;
  locale: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const zones = relevantZones(st);
  const label: Record<Zone, string> = {
    title: t("Title", "Meister"),
    top4: "Top 4",
    bottom3: t("Bottom 3", "Letzte drei"),
  };
  const tone = (zone: Zone, v: number) => {
    const d = v - st.now[zone];
    if (Math.abs(d) < 0.01) return "";
    const good = zone === "bottom3" ? d < 0 : d > 0;
    return good ? "text-positive" : "text-negative";
  };
  const num = "tabular px-2 py-3 text-right font-display text-lg font-bold";
  return (
    <div className="min-w-0 rounded-3xl bg-surface p-5 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <Crest src={crest} name={name} size={24} />
        {name}
      </h3>
      {zones.length > 0 ? (
        <table className="w-full text-[15px]">
          <caption className="sr-only">
            {t(
              `${name}: chances at the end of the season, now and after a win, draw or defeat`,
              `${name}: Chancen zum Saisonende, aktuell und nach Sieg, Remis oder Niederlage`,
            )}
          </caption>
          <thead>
            <tr className="text-xs font-medium text-muted">
              <th scope="col" className="py-2 text-left font-medium">
                {t("Season end", "Saisonende")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {t("Now", "Aktuell")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {t("Win", "Sieg")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {t("Draw", "Remis")}
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">
                {t("Defeat", "Niederlage")}
              </th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z} className="border-t border-line/80">
                <th scope="row" className="py-3 pr-2 text-left text-sm font-medium text-muted">
                  {label[z]}
                </th>
                <td className={num}>{fmtChance(locale, st.now[z])}</td>
                <td className={`${num} ${tone(z, st.win[z])}`}>{fmtChance(locale, st.win[z])}</td>
                <td className={`${num} ${tone(z, st.draw[z])}`}>{fmtChance(locale, st.draw[z])}</td>
                <td className={`${num.replace("px-2", "pl-2")} ${tone(z, st.loss[z])}`}>
                  {fmtChance(locale, st.loss[z])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted">
          {t(
            "This result hardly changes the title, top 4 or bottom 3 race for this club.",
            "Für diesen Verein ändert das Ergebnis im Rennen um Meisterschaft, Top 4 und Letzte drei kaum etwas.",
          )}
        </p>
      )}
    </div>
  );
}

/** Latest rated matches of one club, up to `until` (UTC ms). */
function trendSeries(
  name: string,
  history: RatingPoint[],
  until: number,
  locale: Locale,
  count = 15,
): TrendSeries {
  const where = (home: boolean) =>
    locale === "de" ? (home ? "gegen" : "bei") : home ? "vs" : "at";
  const points = history
    .filter((p) => p.kind !== "start" && Date.parse(p.utcDate) <= until)
    .slice(-count)
    .map((p) => ({
      t: Date.parse(p.utcDate),
      value: p.rating,
      change: p.change,
      match: p.match
        ? `${where(p.match.home)} ${p.match.opponent} ${p.match.goalsFor}:${p.match.goalsAgainst}`
        : null,
    }));
  return { name, points };
}

/** Weekly power ranking positions of one club this season, up to `until` (UTC ms). */
function rankSeries(name: string, history: RankPoint[], until: number): TrendSeries {
  const points = history
    .filter((p) => Date.parse(p.utcDate) <= until)
    .map((p) => ({ t: Date.parse(p.utcDate), value: p.rank, change: p.change, match: null }));
  return { name, points };
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

/**
 * Archive page for a match finished more than 30 days ago: date, result and
 * the pre-match forecast. Nothing on it depends on today's data, so the page
 * stays the same from build to build.
 */
function ArchivedMatch({ m, locale }: { m: MatchDetail; locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const h = m.home;
  const a = m.away;
  const league = m.leagueSlug ? getLeagueBySlug(m.leagueSlug) : undefined;
  const vs = t("vs", "gegen");
  const date = fullDate(locale, m.utcDate);
  const hg = m.homeGoals!;
  const ag = m.awayGoals!;
  const pf = m.forecast?.percentages;
  const outcome = hg > ag ? "home" : hg < ag ? "away" : "draw";
  const winner = outcome === "home" ? h.shortName : a.shortName;
  const result =
    outcome === "draw"
      ? t(
          `${h.shortName} and ${a.shortName} drew ${hg}:${ag}`,
          `${h.shortName} und ${a.shortName} trennten sich ${hg}:${ag} unentschieden`,
        )
      : t(`${winner} won ${hg}:${ag}`, `${winner} gewann ${hg}:${ag}`);
  const where = m.venue ? t(` at ${m.venue}`, ` im Stadion ${m.venue}`) : "";
  const context = `${m.competitionName}${m.matchday ? t(`, matchday ${m.matchday}`, `, ${m.matchday}. Spieltag`) : ""}`;
  return (
    <div className="space-y-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${h.name} ${vs} ${a.name}`,
          sport: "Football",
          startDate: m.utcDate,
          eventStatus: "https://schema.org/EventScheduled",
          url: `${getSiteUrl()}${p.match(m.slug)}`,
          homeTeam: { "@type": "SportsTeam", name: h.name },
          awayTeam: { "@type": "SportsTeam", name: a.name },
          ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
          ...(league ? { superEvent: { "@type": "SportsEvent", name: league.name } } : {}),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          league
            ? { name: league.name, path: p.league(league.slug) }
            : { name: "Champions League", path: p.championsLeague },
          { name: `${h.shortName} ${vs} ${a.shortName}`, path: p.match(m.slug) },
        ])}
      />
      {m.currentMeeting && (
        <Link
          href={p.match(m.currentMeeting.slug)}
          className="flex items-center justify-between gap-4 rounded-3xl bg-foreground px-6 py-5 text-inverse transition hover:opacity-90"
        >
          <span>
            <span className="block text-xs font-semibold tracking-wide uppercase opacity-70">
              {m.currentMeeting.upcoming
                ? t("Next meeting", "Nächstes Duell")
                : t("Latest meeting", "Letztes Duell")}
            </span>
            <span className="mt-1 block font-display text-xl font-extrabold tracking-[-0.02em]">
              {m.currentMeeting.homeShortName} {vs} {m.currentMeeting.awayShortName}
            </span>
            <span className="block text-sm opacity-70">
              {fullDate(locale, m.currentMeeting.utcDate)} · {m.currentMeeting.competitionName}
            </span>
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">
            {m.currentMeeting.upcoming ? t("Preview", "Vorschau") : t("Result", "Ergebnis")}{" "}
            <span aria-hidden>→</span>
          </span>
        </Link>
      )}
      <header>
        <Eyebrow>
          {context} · {seasonLabel(m.season)}
        </Eyebrow>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] bg-surface px-4 py-8 sm:gap-6 sm:px-10 sm:py-10">
          <Link href={p.team(h.slug)} className="flex flex-col items-center gap-3 text-center">
            <Crest src={h.crest} name={h.name} size={72} />
            <span className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] sm:text-3xl">
              {h.shortName}
            </span>
          </Link>
          <div className="text-center">
            <p className="tabular font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">
              {hg}:{ag}
            </p>
            <p className="mt-2 text-xs font-medium text-muted sm:text-sm">
              {t("Full time", "Endstand")}
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
          {h.shortName} {hg}:{ag} {a.shortName}
        </h1>
        <p className="mt-3 font-display text-xl font-bold">
          <time dateTime={m.utcDate}>{date}</time>
          {m.venue ? <span className="text-muted"> · {m.venue}</span> : null}
        </p>
        <div className="mt-4 max-w-3xl space-y-2 text-lg text-muted">
          <p>
            {t(
              `${result} on ${date}${where} (${context}).`,
              outcome === "draw"
                ? `Am ${date} trennten sich ${h.shortName} und ${a.shortName}${where} ${hg}:${ag} unentschieden (${context}).`
                : `Am ${date} gewann ${winner}${where} ${hg}:${ag} (${context}).`,
            )}
          </p>
          {pf && (
            <p>
              {t(
                `Before kick-off the Footiqra model gave ${h.shortName} ${fmtPercent(locale, pf.home)}, a draw ${fmtPercent(locale, pf.draw)} and ${a.shortName} ${fmtPercent(locale, pf.away)}.`,
                `Vor dem Anpfiff sah das Footiqra Modell ${h.shortName} bei ${fmtPercent(locale, pf.home)}, ein Remis bei ${fmtPercent(locale, pf.draw)} und ${a.shortName} bei ${fmtPercent(locale, pf.away)}.`,
              )}
            </p>
          )}
        </div>
      </header>

      {m.forecast && (
        <section aria-labelledby="forecast-heading">
          <SectionHeading
            id="forecast-heading"
            title={t("Pre-match forecast", "Prognose vor dem Spiel")}
          />
          <div className="rounded-3xl bg-surface p-5 sm:p-7">
            <ProbabilityBar
              percentages={m.forecast.percentages}
              labels={{ home: h.shortName, draw: t("draw", "Remis"), away: a.shortName }}
              large
              locale={locale}
            />
            <p className="mt-4 text-sm text-muted">
              {t(
                "Calculated with both ratings as they were before kick-off.",
                "Berechnet mit beiden Ratings, wie sie vor dem Anpfiff waren.",
              )}
            </p>
          </div>
        </section>
      )}

      <nav
        aria-label={t("Related pages", "Verwandte Seiten")}
        className="flex flex-wrap gap-2 text-sm"
      >
        {[h, a].map((s) => (
          <Link
            key={s.slug}
            href={p.team(s.slug)}
            className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
          >
            {t(`${s.shortName}: ranking and results`, `${s.shortName}: Ranking und Ergebnisse`)}
          </Link>
        ))}
        {league && (
          <Link
            href={p.league(league.slug)}
            className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
          >
            {t(`${league.name} table`, `${league.name}: Tabelle`)}
          </Link>
        )}
      </nav>
    </div>
  );
}

export async function MatchView({ locale, slug }: { locale: Locale; slug: string }) {
  if (slug === NO_MATCHES_PLACEHOLDER) notFound();
  const archivedMatch = await getMatch(slug);
  if (archivedMatch?.archived) return <ArchivedMatch m={archivedMatch} locale={locale} />;
  const found = archivedMatch;
  const [lastUpdated, week] = await Promise.all([getLastUpdated(), getWeekRanking()]);
  if (!found) notFound();
  // Matches in the top matches list get exactly the rank shown there.
  const weekIndex = week.findIndex((f) => f.id === found.id);
  const inTopList = weekIndex >= 0;
  const m: MatchDetail =
    inTopList && found.profile
      ? {
          ...found,
          profile: { ...found.profile, weekRank: weekIndex + 1, weekMatches: week.length },
        }
      : found;
  const upcoming = m.status === "SCHEDULED" || m.status === "TIMED";
  const [projection, homeHistory, awayHistory, homeRanks, awayRanks] = await Promise.all([
    upcoming && m.leagueSlug ? getLeagueProjection(m.leagueSlug) : undefined,
    getRatingHistory(m.home.slug),
    getRatingHistory(m.away.slug),
    getRankHistory(m.home.slug),
    getRankHistory(m.away.slug),
  ]);
  const stakes = projection?.stakes.get(m.id);
  const stakesLine = stakes ? stakesHeadline(m, stakes, locale) : null;
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
  const until = finished ? Date.parse(m.utcDate) + 6 * 3600000 : Number.POSITIVE_INFINITY;
  const trend: [TrendSeries, TrendSeries] = [
    trendSeries(h.shortName, homeHistory, until, locale),
    trendSeries(a.shortName, awayHistory, until, locale),
  ];
  const showTrend = trend.every((s) => s.points.length >= 2);
  const ranks: [TrendSeries, TrendSeries] = [
    rankSeries(h.shortName, homeRanks, until),
    rankSeries(a.shortName, awayRanks, until),
  ];
  const showRanks = ranks.every((s) => s.points.length >= 2);
  const sc = m.forecast?.scorelines;
  const pf = m.forecast?.percentages;
  const underdog = pf
    ? pf.home < pf.away
      ? { name: h.shortName, chance: pf.home }
      : pf.away < pf.home
        ? { name: a.shortName, chance: pf.away }
        : null
    : null;
  const favourite = pf ? (pf.home >= pf.away ? h.shortName : a.shortName) : null;
  const top = pf ? Math.max(pf.home, pf.away) : 0;
  const balanceLine = !pf
    ? null
    : top < 45
      ? t(
          "Evenly matched: neither side wins in more than 45% of cases.",
          "Ausgeglichen: Keine Seite gewinnt in mehr als 45 % der Fälle.",
        )
      : top < 60
        ? t(
            `${favourite} are favourites, but an upset is very possible.`,
            `${favourite} ist Favorit, eine Überraschung ist aber gut möglich.`,
          )
        : t(`${favourite} are clear favourites.`, `${favourite} ist klarer Favorit.`);
  const profileCell = (label: string, value: string, note: string, href?: string) => {
    const body = (
      <>
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="tabular mt-1 font-display text-3xl font-extrabold tracking-[-0.03em]">
          {value}
        </p>
        {note && <p className="mt-1 text-sm text-muted">{note}</p>}
        {href && (
          <p className="mt-2 text-sm font-semibold">
            {t("All top matches", "Alle Topspiele")} <span aria-hidden>→</span>
          </p>
        )}
      </>
    );
    return href ? (
      <Link
        href={href}
        className="block rounded-3xl bg-surface px-5 py-4 transition hover:bg-surface-strong"
      >
        {body}
      </Link>
    ) : (
      <div className="rounded-3xl bg-surface px-5 py-4">{body}</div>
    );
  };
  const showScorers =
    (h.scorers.length > 0 || a.scorers.length > 0) && Boolean(h.leagueSlug && a.leagueSlug);
  const marketCell = (label: string, value: string) => (
    <div className="rounded-2xl bg-background px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="tabular mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${h.name} ${vs} ${a.name}`,
          sport: "Football",
          startDate: m.utcDate,
          eventStatus:
            m.status === "POSTPONED"
              ? "https://schema.org/EventPostponed"
              : m.status === "CANCELLED"
                ? "https://schema.org/EventCancelled"
                : "https://schema.org/EventScheduled",
          url: `${getSiteUrl()}${p.match(m.slug)}`,
          homeTeam: { "@type": "SportsTeam", name: h.name },
          awayTeam: { "@type": "SportsTeam", name: a.name },
          competitor: [
            { "@type": "SportsTeam", name: h.name },
            { "@type": "SportsTeam", name: a.name },
          ],
          ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
          ...(league ? { superEvent: { "@type": "SportsEvent", name: league.name } } : {}),
        }}
      />
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
            {m.venue && <p className="mt-1 text-xs font-medium text-muted sm:text-sm">{m.venue}</p>}
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
          {summary(m, locale, stakesLine).map((line) => (
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

      {m.profile && (
        <section aria-labelledby="profile-heading">
          <SectionHeading
            id="profile-heading"
            title={t("How big is this match?", "Wie groß ist dieses Spiel?")}
          />
          {balanceLine && <p className="mb-5 max-w-3xl text-lg">{balanceLine}</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {profileCell(
              t("This week", "Diese Woche"),
              `#${m.profile.weekRank}`,
              t(
                `of ${m.profile.weekMatches} matches in Europe's top leagues`,
                `von ${m.profile.weekMatches} Spielen in Europas Topligen`,
              ),
              inTopList ? p.topMatches : undefined,
            )}
            {profileCell(
              t("This season", "Diese Saison"),
              m.profile.percentile >= 0.5
                ? `Top ${Math.max(1, Math.round((1 - m.profile.percentile) * 100))}${locale === "de" ? " %" : "%"}`
                : t("Lower half", "Untere Hälfte"),
              t(
                "of all matches by strength of both clubs",
                "aller Spiele nach Stärke beider Vereine",
              ),
            )}
            {profileCell(
              t("Rating gap", "Rating-Abstand"),
              `${Math.round(m.profile.ratingGap)}`,
              h.ranking && a.ranking
                ? t(
                    `power rank #${h.ranking.rank} vs #${a.ranking.rank}`,
                    `Power-Rang #${h.ranking.rank} gegen #${a.ranking.rank}`,
                  )
                : "",
            )}
            {underdog &&
              profileCell(
                finished
                  ? t("Underdog win (pre-match)", "Außenseitersieg (vorher)")
                  : t("Underdog win", "Außenseitersieg"),
                fmtPercent(locale, underdog.chance),
                underdog.name,
              )}
          </div>
          <p className="mt-3 text-sm text-muted">
            {t(
              "Size ranks matches by the strength of both clubs: two strong, evenly rated clubs make the biggest match. This week: rank in the top matches list of the next 7 days, or for later matches among all matches within three and a half days of kick-off, ranked with today's ratings.",
              "Die Größe ordnet Spiele nach der Stärke beider Vereine: Zwei starke, gleich bewertete Vereine ergeben das größte Spiel. Diese Woche: Rang in der Topspiel-Liste der nächsten 7 Tage, bei späteren Spielen unter allen Spielen innerhalb von dreieinhalb Tagen um den Anstoß, bewertet mit den aktuellen Ratings.",
            )}
          </p>
        </section>
      )}

      {sc && m.forecast && (
        <section aria-labelledby="scores-heading">
          <SectionHeading
            id="scores-heading"
            title={t("Most likely scores", "Wahrscheinlichste Ergebnisse")}
            aside={
              <span className="text-sm text-muted">
                {t("Expected goals", "Erwartete Tore")}{" "}
                <span className="tabular font-semibold text-foreground">
                  {fmtDecimal(locale, sc.expectedGoals.home, 1)} :{" "}
                  {fmtDecimal(locale, sc.expectedGoals.away, 1)}
                </span>
              </span>
            }
          />
          <div className="rounded-3xl bg-surface p-5 sm:p-7">
            <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {sc.top.map((s, i) => {
                const actual = finished && s.home === m.homeGoals && s.away === m.awayGoals;
                return (
                  <li
                    key={`${s.home}-${s.away}`}
                    className={`rounded-2xl bg-background px-3 py-4 text-center ${actual ? "ring-2 ring-brand" : ""} ${i >= 3 ? "hidden sm:block" : ""}`}
                  >
                    <p className="tabular font-display text-3xl font-extrabold tracking-[-0.03em]">
                      {s.home}:{s.away}
                    </p>
                    <p className="tabular mt-1 text-sm font-semibold text-muted">
                      {fmtPercent(locale, Math.round(s.probability * 100))}
                    </p>
                    {actual && (
                      <p className="mt-1 text-xs font-semibold text-brand-ink">
                        {t("Final score", "Endstand")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {marketCell(t("3+ goals", "3+ Tore"), fmtChance(locale, sc.over25))}
              {marketCell(
                t("Both teams score", "Beide Teams treffen"),
                fmtChance(locale, sc.bothScore),
              )}
              {marketCell(
                t(`${h.shortName} clean sheet`, `${h.shortName} ohne Gegentor`),
                fmtChance(locale, sc.homeCleanSheet),
              )}
              {marketCell(
                t(`${a.shortName} clean sheet`, `${a.shortName} ohne Gegentor`),
                fmtChance(locale, sc.awayCleanSheet),
              )}
            </div>
            <p className="mt-4 text-sm text-muted">
              {t(
                "Exact scores from the same forecast: the league's average home and away goals, adjusted for the strength of both clubs. Model estimate, not betting advice.",
                "Ergebnisse aus derselben Prognose: die durchschnittlichen Heim- und Auswärtstore der Liga, angepasst an die Stärke beider Vereine. Modellschätzung, keine Wettberatung.",
              )}
            </p>
          </div>
        </section>
      )}

      {stakes && (
        <section aria-labelledby="stakes-heading">
          <SectionHeading
            id="stakes-heading"
            title={t("What's at stake for the season", "Was für die Saison auf dem Spiel steht")}
            aside={
              league ? (
                <Link
                  href={p.projection(league.slug)}
                  className="text-sm text-muted hover:text-foreground"
                >
                  {t("Full season forecast", "Komplette Saisonprognose")}
                </Link>
              ) : undefined
            }
          />
          <p className="mb-4 max-w-3xl text-muted">
            {t(
              `How likely each club is to finish the ${league?.name ?? "league"} season as champion, in the top 4 or in the bottom 3, from ${(projection?.runs ?? 10000).toLocaleString("en-GB")} simulations of all remaining matches: now, and depending on the result of this match.`,
              `Wie wahrscheinlich jeder Verein die Saison der ${league?.name ?? "Liga"} als Meister, unter den ersten vier oder unter den letzten drei beendet, aus ${(projection?.runs ?? 10000).toLocaleString("de-DE")} Simulationen aller restlichen Spiele: aktuell und je nach Ergebnis dieses Spiels.`,
            )}
          </p>
          {stakesLine && <p className="mb-5 max-w-3xl text-lg">{stakesLine}</p>}
          <div className="grid gap-6 lg:grid-cols-2">
            <StakesTable name={h.shortName} crest={h.crest} st={stakes.home} locale={locale} />
            <StakesTable name={a.shortName} crest={a.crest} st={stakes.away} locale={locale} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {t(
              `Final table positions only; how many places lead to Europe or relegation depends on the ${league?.name ?? "league"} rules.`,
              `Nur Platzierungen in der Abschlusstabelle; wie viele Plätze zu Europapokal oder Abstieg führen, regelt die ${league?.name ?? "Liga"}.`,
            )}
          </p>
        </section>
      )}

      {showTrend && (
        <section aria-labelledby="trend-heading">
          <SectionHeading
            id="trend-heading"
            title={t("Rating and ranking trend", "Rating- und Ranking-Verlauf")}
          />
          <div className="rounded-3xl bg-surface p-4 sm:p-6">
            <MatchTrend
              rating={trend}
              rank={showRanks ? ranks : null}
              locale={locale}
              names={[h.name, a.name]}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            {t(
              "Rating: value after each of the latest 15 matches in all competitions; higher means stronger. Power ranking: position across all clubs of Europe's top leagues at the end of each week this season.",
              "Rating: Wert nach jedem der letzten 15 Spiele in allen Wettbewerben, höher heißt stärker. Power-Ranking: Platz unter allen Vereinen der europäischen Topligen am Ende jeder Woche dieser Saison.",
            )}
          </p>
        </section>
      )}

      {showScorers && (
        <section aria-labelledby="scorers-heading">
          <SectionHeading
            id="scorers-heading"
            title={t("Top scorers", "Torjäger")}
            aside={
              <span className="text-sm text-muted">
                {t("League goals this season", "Ligatore dieser Saison")}
              </span>
            }
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {[h, a].map((s) => {
              const leagueName = getLeagueBySlug(s.leagueSlug)?.name ?? t("league", "Liga");
              return (
                <div key={s.slug} className="min-w-0 rounded-3xl bg-surface p-5 sm:p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                    <Crest src={s.crest} name={s.name} size={24} />
                    {s.shortName}
                  </h3>
                  {s.scorers.length > 0 ? (
                    <table className="w-full text-[15px]">
                      <caption className="sr-only">
                        {t(`Top scorers of ${s.name}`, `Torjäger von ${s.name}`)}
                      </caption>
                      <thead>
                        <tr className="text-xs font-medium text-muted">
                          <th scope="col" className="py-2 text-left font-medium">
                            {t("Player", "Spieler")}
                          </th>
                          <th scope="col" className="px-2 py-2 text-right font-medium">
                            {t("Goals", "Tore")}
                          </th>
                          <th scope="col" className="px-2 py-2 text-right font-medium">
                            {t("Assists", "Vorlagen")}
                          </th>
                          <th scope="col" className="py-2 pl-2 text-right font-medium">
                            {t(`${leagueName} rank`, `Rang ${leagueName}`)}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.scorers.map((x) => (
                          <tr key={x.name} className="border-t border-line/80">
                            <th scope="row" className="py-3 pr-2 text-left font-semibold">
                              {x.name}
                              {x.penalties ? (
                                <span className="ml-2 text-xs font-medium text-muted">
                                  {t(`${x.penalties} pen.`, `${x.penalties} Elfm.`)}
                                </span>
                              ) : null}
                            </th>
                            <td className="tabular px-2 py-3 text-right font-display text-lg font-bold">
                              {x.goals}
                            </td>
                            <td className="tabular px-2 py-3 text-right text-muted">
                              {x.assists ?? "·"}
                            </td>
                            <td className="tabular py-3 pl-2 text-right text-muted">
                              {x.leagueRank}.
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-muted">
                      {t(
                        `No ${s.shortName} player among the ${leagueName}'s listed top scorers yet.`,
                        `Noch kein Spieler von ${s.shortName} unter den gelisteten Torjägern der ${leagueName}.`,
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[...new Set([h.leagueSlug, a.leagueSlug])].map((slug) => (
              <Link
                key={slug}
                href={p.leagueScorers(slug)}
                className="rounded-full bg-surface px-4 py-2 font-medium hover:bg-surface-strong"
              >
                {t(
                  `${getLeagueBySlug(slug)?.name ?? "League"} top 100 scorers`,
                  `Top 100 Torjäger ${getLeagueBySlug(slug)?.name ?? "Liga"}`,
                )}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            {t(
              "Goals and assists in league matches only, from the official scorer list of each league.",
              "Tore und Vorlagen nur in Ligaspielen, aus der offiziellen Torjägerliste der jeweiligen Liga.",
            )}
          </p>
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
