import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  getLastUpdated,
  getPowerRanking,
  getScorerIndex,
  getWeekAgo,
  scorerKey,
  type ScorerIndexRow,
} from "@/data";
import { fmtDate, fmtDecimal, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";
import { leagueFactor } from "@/ranking";

/** Scorer power ranking: /top-scorers/power-ranking/ and /de/torjaeger/power-ranking/ */
const TOP = 50;

function TrendCell({
  change,
  locale,
}: {
  change: { rank: number; isNew: boolean };
  locale: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const base = "tabular px-2 py-3 text-right text-sm font-semibold";
  if (change.isNew) return <td className={`${base} text-brand-ink`}>{t("new", "neu")}</td>;
  if (change.rank === 0) return <td className={`${base} text-muted`}>·</td>;
  const up = change.rank > 0;
  return (
    <td
      className={`${base} ${up ? "text-positive" : "text-negative"}`}
      aria-label={
        up
          ? t(`up ${change.rank}`, `${change.rank} Plätze hoch`)
          : t(`down ${-change.rank}`, `${-change.rank} Plätze runter`)
      }
    >
      {up ? "▲" : "▼"} {Math.abs(change.rank)}
    </td>
  );
}

export function scorerIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Scorer power ranking: Europe's best", "Torjäger-Power-Ranking Europas"),
    description: tr(
      locale,
      "Europe's best goalscorers on one scale: league goals weighted by league strength, penalties counted lower and scaled to the same number of matches.",
      "Die besten Torjäger Europas auf einer Skala: Ligatore gewichtet nach Ligastärke, Elfmeter geringer gezählt und auf gleich viele Spiele hochgerechnet.",
    ),
    paths: { en: paths("en").scorerIndex, de: paths("de").scorerIndex },
    image: ogImage.scorerPower,
  });
}

export async function ScorerIndexView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [index, ranking, lastUpdated, weekAgo] = await Promise.all([
    getScorerIndex(),
    getPowerRanking(),
    getLastUpdated(),
    getWeekAgo(),
  ]);
  // Change since the stored day a week ago; only once that day has scorer data.
  const before = weekAgo?.scorers;
  const change = (s: ScorerIndexRow) => {
    if (!before) return null;
    const old = before.get(scorerKey(s.leagueSlug, s.playerId));
    return old
      ? { rank: old.indexRank - s.indexRank, goals: s.goals - old.goals, isNew: false }
      : { rank: 0, goals: 0, isNew: true };
  };
  const rows = index.rows.slice(0, TOP);
  const climber = before
    ? rows
        .map((s) => ({ s, c: change(s)! }))
        .filter(({ c }) => !c.isNew && c.rank > 0)
        .sort((a, b) => b.c.rank - a.c.rank || a.s.indexRank - b.s.indexRank)[0]
    : undefined;
  const since = weekAgo
    ? fmtDate(locale, `${weekAgo.date}T12:00:00Z`, { day: "numeric", month: "long" })
    : "";
  const n = index.referenceMatches;
  const lead = rows[0];
  const factors =
    ranking.status === "ok"
      ? ranking.data.leagues.map((l) => ({
          name: getLeagueBySlug(l.leagueSlug)?.name ?? l.leagueSlug,
          factor: leagueFactor(l.currentAdjustment),
        }))
      : [];
  const dec = (x: number, d = 1) => fmtDecimal(locale, x, d);
  const num = "tabular px-2 py-3 text-right";
  const head = "px-2 py-3 text-right text-xs font-medium text-muted";

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Top scorers", "Torjäger"), path: p.scorers },
          { name: t("Power ranking", "Power-Ranking"), path: p.scorerIndex },
        ])}
      />
      <header>
        <Eyebrow>
          <Link href={p.scorers} className="hover:underline">
            {t("Top scorers", "Torjäger")}
          </Link>
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Scorer power ranking", "Torjäger-Power-Ranking")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            `Who is Europe's best goalscorer? League goals from seven leagues on one scale: weighted by league strength, with penalties counted lower and every club scaled to ${n} matches.`,
            `Wer ist Europas bester Torjäger? Die Ligatore aus sieben Ligen auf einer Skala: gewichtet nach Ligastärke, Elfmeter geringer gezählt und jeder Verein auf ${n} Spiele hochgerechnet.`,
          )}
          {lead &&
            t(
              ` ${lead.name} (${lead.team.name}) leads with ${dec(lead.points)} points from ${lead.goals} goals.`,
              ` ${lead.name} (${lead.team.name}) führt mit ${dec(lead.points)} Punkten aus ${lead.goals} Toren.`,
            )}
          {climber &&
            t(
              ` Biggest climber since ${since}: ${climber.s.name}, up ${climber.c.rank} places to ${climber.s.indexRank}.`,
              ` Größter Sprung seit dem ${since}: ${climber.s.name}, ${climber.c.rank} Plätze nach oben auf Platz ${climber.s.indexRank}.`,
            )}
        </p>
      </header>

      {rows.length > 0 ? (
        <section aria-labelledby="index-heading">
          <SectionHeading
            id="index-heading"
            title={`Top ${rows.length}`}
            aside={
              <Link href={p.scorers} className="text-sm text-muted hover:text-foreground">
                {t("Plain scorer lists", "Normale Torjägerlisten")}
              </Link>
            }
          />
          <div className="overflow-hidden rounded-3xl bg-surface">
            <table className="w-full text-[15px]">
              <caption className="sr-only">
                {t("Scorer power ranking", "Torjäger-Power-Ranking")}
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-12 py-3 pl-4 text-left text-xs font-medium text-muted sm:pl-6"
                  >
                    #
                  </th>
                  <th scope="col" className="py-3 pr-2 text-left text-xs font-medium text-muted">
                    {t("Player", "Spieler")}
                  </th>
                  {before && (
                    <th scope="col" className={head}>
                      <span title={t(`Change since ${since}`, `Veränderung seit dem ${since}`)}>
                        {t("Trend", "Trend")}
                      </span>
                    </th>
                  )}
                  <th scope="col" className={head}>
                    {t("Points", "Punkte")}
                  </th>
                  <th scope="col" className={head}>
                    {t("Goals", "Tore")}
                  </th>
                  <th scope="col" className={`${head} hidden sm:table-cell`}>
                    {t("Pen.", "Elfm.")}
                  </th>
                  <th scope="col" className={`${head} hidden md:table-cell`}>
                    {t("Club matches", "Vereinsspiele")}
                  </th>
                  <th scope="col" className={`${head} hidden pr-4 sm:pr-6 md:table-cell`}>
                    {t("League factor", "Ligafaktor")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const same = i > 0 && rows[i - 1]!.indexRank === s.indexRank;
                  return (
                    <tr key={`${s.leagueSlug}-${s.playerId}`} className="border-t border-line/80">
                      <td className="tabular py-3 pl-4 font-display font-bold text-muted sm:pl-6">
                        {same ? "" : `${s.indexRank}.`}
                      </td>
                      <th scope="row" className="py-3 pr-2 text-left font-normal">
                        <span className="block font-semibold">{s.name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                          <Crest src={s.team.crest} name={s.team.name} size={16} />
                          {s.team.slug ? (
                            <Link
                              href={p.team(s.team.slug)}
                              className="hover:text-foreground hover:underline"
                            >
                              {s.team.name}
                            </Link>
                          ) : (
                            s.team.name
                          )}
                          {` · ${getLeagueBySlug(s.leagueSlug)?.name ?? ""}`}
                        </span>
                      </th>
                      {before && <TrendCell change={change(s)!} locale={locale} />}
                      <td className={`${num} font-display text-lg font-extrabold`}>
                        {dec(s.points)}
                      </td>
                      <td className={`${num} text-muted`}>
                        {s.goals}
                        {(() => {
                          const c = change(s);
                          return c && !c.isNew && c.goals > 0 ? (
                            <span className="ml-1 text-xs font-semibold text-positive">
                              +{c.goals}
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td className={`${num} hidden text-muted sm:table-cell`}>
                        {s.penalties ?? "·"}
                      </td>
                      <td className={`${num} hidden text-muted md:table-cell`}>{s.clubMatches}</td>
                      <td className={`${num} hidden pr-4 text-muted sm:pr-6 md:table-cell`}>
                        {dec(s.leagueFactor, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <DataNotice
          reason={t(
            "The scorer lists have not been imported yet.",
            "Die Torjägerlisten wurden noch nicht importiert.",
          )}
          locale={locale}
        />
      )}

      <section aria-labelledby="how" className="max-w-3xl space-y-4 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          {t("How the points are calculated", "So werden die Punkte berechnet")}
        </h2>
        <p className="rounded-2xl bg-surface px-5 py-4 font-semibold text-foreground">
          {t(
            `Points = (goals − ¼ × penalty goals) × league factor × ${n} ÷ club matches`,
            `Punkte = (Tore − ¼ × Elfmetertore) × Ligafaktor × ${n} ÷ Vereinsspiele`,
          )}
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            {t(
              "Penalty goals count three quarters: they say less about a striker than goals from open play.",
              "Elfmetertore zählen drei Viertel: Sie sagen weniger über einen Stürmer aus als Tore aus dem Spiel.",
            )}
          </li>
          <li>
            {t(
              "The league factor comes from the league strength of the Footiqra ranking, deliberately damped so it only decides close cases.",
              "Der Ligafaktor stammt aus der Ligastärke des Footiqra Rankings und ist bewusst abgeschwächt, damit er nur knappe Fälle entscheidet.",
            )}
          </li>
          <li>
            {t(
              `Leagues have played different numbers of matches. Each player's goals per league match of his club are scaled to ${n} matches, the most any club has played.`,
              `Die Ligen haben unterschiedlich viele Spiele absolviert. Die Tore eines Spielers pro Ligaspiel seines Vereins werden auf ${n} Spiele hochgerechnet, so viele wie der Verein mit den meisten Spielen.`,
            )}
          </li>
          <li>
            {t(
              "League goals only, from each league's official scorer list. Without the scale, points would equal goals.",
              "Nur Ligatore, aus der offiziellen Torjägerliste jeder Liga. Ohne Gewichtung wären Punkte gleich Tore.",
            )}
          </li>
          <li>
            {t(
              "Trend: places gained or lost against the ranking of a week ago, and goals scored since then (+). New: not in the ranking a week ago.",
              "Trend: gewonnene oder verlorene Plätze gegenüber dem Ranking von vor einer Woche, dazu die Tore seitdem (+). Neu: vor einer Woche noch nicht im Ranking.",
            )}
          </li>
        </ul>
        {factors.length === LEAGUES.length && (
          <div className="flex flex-wrap gap-2 text-sm">
            {factors.map((f) => (
              <span key={f.name} className="rounded-full bg-surface px-3 py-1.5">
                {f.name} <b className="tabular text-foreground">{dec(f.factor, 2)}</b>
              </span>
            ))}
          </div>
        )}
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} locale={locale} />}
    </div>
  );
}
