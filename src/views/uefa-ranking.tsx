import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Eyebrow } from "@/components/ui";
import { LEAGUES } from "@/config/leagues";
import { getUefaRanking, type UefaRanking } from "@/data";
import { fmtDate, fmtDecimal, fmtInt, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * UEFA five-season association ranking: /uefa-coefficients/ and /de/5-jahres-wertung/.
 * Computed by Footiqra from match results (content/uefa), not an official UEFA table.
 */

/** Association code of each covered league, for links to its league page. */
const LEAGUE_BY_ASSOCIATION: Record<string, string> = {
  ENG: "premier-league",
  ESP: "la-liga",
  ITA: "serie-a",
  GER: "bundesliga",
  FRA: "ligue-1",
  POR: "primeira-liga",
  NED: "eredivisie",
};

const short = (season: string) => `${season.slice(2, 4)}/${season.slice(5)}`;

export async function uefaRankingMetadata(locale: Locale): Promise<Metadata> {
  const ranking = await getUefaRanking();
  return pageMetadata({
    locale,
    title: tr(locale, "UEFA 5-year ranking (country coefficients)", "UEFA-5-Jahres-Wertung"),
    description: tr(
      locale,
      "The UEFA five-year ranking of all 55 associations: country coefficients per season, total and gap, updated after every European matchday.",
      "Die UEFA-Fünfjahreswertung aller 55 Verbände: Länderkoeffizienten pro Saison, Gesamtpunkte und Abstände, nach jedem Europapokal-Spieltag aktualisiert.",
    ),
    paths: { en: paths("en").uefaRanking, de: paths("de").uefaRanking },
    image: ogImage.leagues,
    // Without the earlier seasons the table is not a five-year ranking yet.
    noIndex: !ranking || ranking.historyIncomplete,
  });
}

function Change({ now, before, locale }: { now: number; before: number | null; locale: Locale }) {
  if (before === null) return <span className="text-muted">·</span>;
  const d = before - now;
  if (d === 0) return <span className="text-muted">=</span>;
  return (
    <span
      className={d > 0 ? "text-positive" : "text-negative"}
      aria-label={
        d > 0
          ? tr(locale, `up ${d}`, `${d} Plätze hoch`)
          : tr(locale, `down ${-d}`, `${-d} Plätze runter`)
      }
    >
      {d > 0 ? "▲" : "▼"}
      {Math.abs(d)}
    </span>
  );
}

function RankingTable({ ranking, locale }: { ranking: UefaRanking; locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const num = (v: number | null) => (v === null ? "·" : fmtDecimal(locale, v, 3));
  return (
    <div className="overflow-x-auto rounded-3xl bg-surface p-2 sm:p-4">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="sr-only">
          {t("UEFA five-year ranking", "UEFA-Fünfjahreswertung")} {short(ranking.season)}
        </caption>
        <thead className="text-left text-xs text-muted">
          <tr>
            <th scope="col" className="px-2 py-3 text-right font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-3 text-right font-medium">
              <span
                title={t(
                  "Change against last year's ranking",
                  "Veränderung zur Wertung vor einem Jahr",
                )}
              >
                ±
              </span>
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              {t("Association", "Verband")}
            </th>
            {ranking.seasons.map((s, i) => (
              <th
                key={s}
                scope="col"
                className={`px-2 py-3 text-right font-medium ${i === ranking.seasons.length - 1 ? "text-foreground" : ""}`}
              >
                {short(s)}
              </th>
            ))}
            <th scope="col" className="px-3 py-3 text-right font-semibold text-foreground">
              {t("Total", "Gesamt")}
            </th>
            <th scope="col" className="px-2 py-3 text-right font-medium">
              {t("Gap", "Rückstand")}
            </th>
            <th scope="col" className="px-2 py-3 text-right font-medium">
              <span
                title={t("Clubs in Europe this season", "Vereine im Europapokal in dieser Saison")}
              >
                {t("Clubs", "Vereine")}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((r) => {
            const league = LEAGUE_BY_ASSOCIATION[r.association.code];
            const name = locale === "de" ? r.association.nameDe : r.association.nameEn;
            return (
              <tr
                key={r.association.code}
                className={`border-t border-line ${league ? "font-semibold" : ""}`}
              >
                <td className="tabular px-2 py-2.5 text-right">{r.rank}</td>
                <td className="tabular px-2 py-2.5 text-right text-xs">
                  <Change now={r.rank} before={r.previousRank} locale={locale} />
                </td>
                <th scope="row" className="px-3 py-2.5 text-left font-[inherit] whitespace-nowrap">
                  <span className="mr-2 inline-block w-9 text-xs font-medium text-muted">
                    {r.association.code}
                  </span>
                  {league ? (
                    <Link href={p.league(league)} className="hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </th>
                {r.seasons.map((v, i) => (
                  <td
                    key={i}
                    className={`tabular px-2 py-2.5 text-right ${i === r.seasons.length - 1 ? "" : "text-muted"}`}
                  >
                    {num(v)}
                  </td>
                ))}
                <td className="tabular px-3 py-2.5 text-right font-bold">{num(r.total)}</td>
                <td className="tabular px-2 py-2.5 text-right text-muted">
                  {r.gap === null ? "" : num(r.gap)}
                </td>
                <td className="tabular px-2 py-2.5 text-right text-muted">{r.clubs || "·"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClubTable({ ranking, locale }: { ranking: UefaRanking; locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const names = new Map(ranking.rows.map((r) => [r.association.code, r.association]));
  const num = (v: number) => fmtDecimal(locale, v, v % 1 === 0 ? 0 : (v * 4) % 1 === 0 ? 2 : 3);
  return (
    <details className="rounded-3xl bg-surface p-4 sm:p-6">
      <summary className="cursor-pointer font-display text-xl font-extrabold tracking-[-0.02em]">
        {t(
          `Points of every club in ${short(ranking.season)}`,
          `Punkte aller Vereine ${short(ranking.season)}`,
        )}
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">
                {t("Club", "Verein")}
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                {t("Association", "Verband")}
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                {t("Matches", "Spiele")}
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                {t("Match pts", "Spielpunkte")}
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                {t("Bonus", "Bonus")}
              </th>
              <th scope="col" className="py-2 text-right font-semibold text-foreground">
                {t("Total", "Gesamt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.clubs.map((c) => {
              const a = names.get(c.country);
              return (
                <tr key={c.club} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
                    {c.club}
                  </th>
                  <td className="py-2 pr-3 text-muted">
                    {a ? (locale === "de" ? a.nameDe : a.nameEn) : c.country}
                  </td>
                  <td className="tabular py-2 pr-3 text-right">{c.played}</td>
                  <td className="tabular py-2 pr-3 text-right">{num(c.matchPoints)}</td>
                  <td className="tabular py-2 pr-3 text-right">{num(c.bonus)}</td>
                  <td className="tabular py-2 text-right font-bold">
                    {num(c.matchPoints + c.bonus)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export async function UefaRankingView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const ranking = await getUefaRanking();
  const covered = LEAGUES.length;

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Leagues", "Ligen"), path: p.leagues },
          { name: t("UEFA 5-year ranking", "5-Jahres-Wertung"), path: p.uefaRanking },
        ])}
      />
      <header>
        <Eyebrow>
          {t("Europe", "Europa")}
          {ranking ? ` · ${ranking.season.replace("-", "/")}` : ""}
        </Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("UEFA 5-year ranking", "UEFA-5-Jahres-Wertung")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            "The country coefficients of all 55 UEFA associations over the last five seasons. They decide how many clubs each country sends to the Champions League, Europa League and Conference League.",
            "Die Länderkoeffizienten aller 55 UEFA-Verbände aus den letzten fünf Saisons. Sie entscheiden, wie viele Vereine ein Land in Champions League, Europa League und Conference League schicken darf.",
          )}
        </p>
        {ranking && (
          <p className="mt-4 text-sm text-muted">
            {ranking.lastMatch
              ? t(
                  `Includes all results up to ${fmtDate(locale, `${ranking.lastMatch}T12:00:00Z`, { day: "numeric", month: "long", year: "numeric" })}, ${fmtInt(locale, ranking.matchesEntered + ranking.matchesImported)} matches this season.`,
                  `Enthält alle Ergebnisse bis ${fmtDate(locale, `${ranking.lastMatch}T12:00:00Z`, { day: "numeric", month: "long", year: "numeric" })}, ${fmtInt(locale, ranking.matchesEntered + ranking.matchesImported)} Spiele in dieser Saison.`,
                )
              : t("No results this season yet.", "Noch keine Ergebnisse in dieser Saison.")}
          </p>
        )}
      </header>

      {ranking?.historyIncomplete && (
        <div role="status" className="rounded-3xl border border-line p-6 text-sm text-muted">
          <p className="font-display text-lg font-bold text-foreground">
            {t("Earlier seasons are still being added", "Vorjahre werden noch ergänzt")}
          </p>
          <p className="mt-1">
            {t(
              "Some season values before this one are missing, so totals and ranks are not final yet.",
              "Für einige Verbände fehlen noch Werte aus früheren Saisons. Gesamtpunkte und Platzierungen sind deshalb noch nicht endgültig.",
            )}
          </p>
        </div>
      )}

      {ranking && ranking.matchesEntered === 0 && (
        <div role="status" className="rounded-3xl border border-line p-6 text-sm text-muted">
          <p className="font-display text-lg font-bold text-foreground">
            {t("This season is incomplete", "Diese Saison ist noch unvollständig")}
          </p>
          <p className="mt-1">
            {t(
              "So far only the Champions League from the league phase on is included. Qualifying, Europa League and Conference League results are still being added.",
              "Bisher ist nur die Champions League ab der Ligaphase enthalten. Qualifikation, Europa League und Conference League werden noch ergänzt.",
            )}
          </p>
        </div>
      )}

      {ranking && <RankingTable ranking={ranking} locale={locale} />}

      {ranking && ranking.clubs.length > 0 && <ClubTable ranking={ranking} locale={locale} />}

      <section className="max-w-3xl space-y-3 text-sm text-muted">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
          {t("How the coefficients are calculated", "So werden die Koeffizienten berechnet")}
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-brand">
          <li>
            {t(
              "2 points per win and 1 per draw from the league phase on, half that in qualifying. The result after extra time counts, penalty shoot-outs do not.",
              "2 Punkte pro Sieg und 1 pro Remis ab der Ligaphase, in der Qualifikation die Hälfte. Es zählt das Ergebnis nach Verlängerung, Elfmeterschießen zählen nicht.",
            )}
          </li>
          <li>
            {t(
              "Bonus points: 6 for reaching the Champions League league phase, up to 6 more (Europa League up to 6, Conference League up to 4) for the final league phase position, and for every knockout round from the round of 16 on 1.5 (CL), 1 (EL) or 0.5 (ECL).",
              "Bonuspunkte: 6 für die Teilnahme an der Ligaphase der Champions League, bis zu 6 weitere (Europa League bis 6, Conference League bis 4) für die Endplatzierung der Ligaphase und für jede K.-o.-Runde ab dem Achtelfinale 1,5 (CL), 1 (EL) oder 0,5 (ECL).",
            )}
          </li>
          <li>
            {t(
              "A country's season coefficient is the points of all its clubs divided by the number of its clubs, to three decimals and never rounded up. The ranking adds the last five seasons; ties go to the better most recent season.",
              "Der Saisonkoeffizient eines Landes sind die Punkte aller seiner Vereine geteilt durch die Zahl der Vereine, auf drei Nachkommastellen und nie aufgerundet. Die Wertung addiert die letzten fünf Saisons, bei Gleichstand entscheidet die jüngste Saison.",
            )}
          </li>
        </ul>
        <p>
          {t(
            `Footiqra calculates this table itself from match results under the published UEFA rules. It is not an official UEFA table and may differ in rare cases, for example after decisions by UEFA. The ${covered} leagues covered by Footiqra are in bold; how strong they are right now is measured by the `,
            `Footiqra berechnet diese Tabelle selbst aus den Spielergebnissen nach den veröffentlichten UEFA-Regeln. Sie ist keine offizielle UEFA-Tabelle und kann in seltenen Fällen abweichen, etwa nach Entscheidungen der UEFA. Fett sind die ${covered} Ligen, die Footiqra abdeckt; wie stark sie aktuell sind, misst die `,
          )}
          <Link href={p.leagues} className="font-semibold underline underline-offset-4">
            {t("Footiqra league strength", "Footiqra-Ligastärke")}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
