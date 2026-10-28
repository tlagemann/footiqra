import Link from "next/link";
import type { ProjectionRow } from "@/data";
import { fmtChance, ordinal, paths, tr, type Locale } from "@/i18n";
import { Crest, HeaderHint } from "./ui";

/** Places gained (green, up) or lost (red, down) between today and the predicted end. */
function PositionChange({ from, to, locale }: { from: number; to: number; locale: Locale }) {
  const diff = from - to;
  if (diff === 0) {
    return (
      <span
        className="text-muted"
        title={tr(locale, "No change expected", "Keine Veränderung erwartet")}
      >
        =
      </span>
    );
  }
  const up = diff > 0;
  const n = Math.abs(diff);
  const title =
    locale === "de"
      ? `${n} ${n === 1 ? "Platz" : "Plätze"} ${up ? "besser" : "schlechter"} als heute`
      : `${n} place${n === 1 ? "" : "s"} ${up ? "higher" : "lower"} than today`;
  return (
    <span
      className={`font-semibold whitespace-nowrap ${up ? "text-positive" : "text-negative"}`}
      title={title}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">
        {up ? tr(locale, "up", "hoch") : tr(locale, "down", "runter")}{" "}
      </span>
      {n}
    </span>
  );
}

/** Chance as text: "·", "<1%", "36%", ">99%" (German: "36 %"). */
export function chance(p: number, locale: Locale = "en"): string {
  return fmtChance(locale, p);
}

/** One cell of the position strip: full colour from a 35% chance upwards. */
function Heat({ p, locale }: { p: number; locale: Locale }) {
  return (
    <span
      className={`block h-5 w-full rounded-[3px] ${p > 0 ? "bg-brand" : "bg-line"}`}
      style={{ opacity: p > 0 ? 0.1 + 0.9 * Math.min(1, p / 0.35) : 0.5 }}
      title={chance(p, locale)}
    />
  );
}

/** Simulated final table with key probabilities and the full position spread. */
export function ProjectionTable({
  rows,
  caption,
  locale = "en",
}: {
  rows: ProjectionRow[];
  caption: string;
  locale?: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const n = rows.length;
  const num = "tabular px-2 py-3 text-right sm:px-3";
  return (
    <div className="relative overflow-x-auto rounded-3xl bg-surface">
      <table className="w-full text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-10 py-4 pl-5 text-left font-medium sm:w-14 sm:pl-7">
              <HeaderHint
                label="#"
                hint={t(
                  "Predicted final position, ordered by expected points.",
                  "Prognostizierter Endplatz, sortiert nach erwarteten Punkten.",
                )}
              />
            </th>
            <th scope="col" className="py-4 text-left font-medium">
              <HeaderHint
                label={t("Team", "Verein")}
                hint={t(
                  "Click a club for its profile with results and fixtures.",
                  "Ein Klick auf den Verein öffnet das Profil mit Ergebnissen und Spielplan.",
                )}
              />
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium md:table-cell">
              <HeaderHint
                label={t("Today", "Heute")}
                hint={t(
                  "Current table position and points.",
                  "Aktueller Tabellenplatz und aktuelle Punkte.",
                )}
              />
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <HeaderHint
                align="right"
                label={
                  <>
                    <span className="sm:hidden">+/-</span>
                    <span className="hidden sm:inline">{t("Change", "Trend")}</span>
                  </>
                }
                hint={t(
                  "Places gained or lost from today's table position to the predicted final position.",
                  "Plätze, die der Verein vom heutigen Tabellenplatz bis zum prognostizierten Endplatz gewinnt oder verliert.",
                )}
              />
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <HeaderHint
                align="right"
                label={
                  <>
                    <span className="sm:hidden">{t("Pts", "Pkt.")}</span>
                    <span className="hidden sm:inline">{t("Final pts", "Pkt. Ende")}</span>
                  </>
                }
                hint={t(
                  "Expected points at the end of the season, averaged over all simulations.",
                  "Erwartete Punkte am Saisonende, gemittelt über alle Simulationen.",
                )}
              />
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <HeaderHint
                align="right"
                label={t("Title", "Meister")}
                hint={t(
                  "Share of simulations in which the club finishes first.",
                  "Anteil der Simulationen, in denen der Verein Erster wird.",
                )}
              />
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <HeaderHint
                align="right"
                label="Top 4"
                hint={t(
                  "Share of simulations in which the club finishes in the top four.",
                  "Anteil der Simulationen, in denen der Verein unter den ersten vier landet.",
                )}
              />
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7 lg:pr-3">
              <HeaderHint
                align="right"
                label={
                  <>
                    <span className="whitespace-nowrap sm:hidden">{t("Btm 3", "Ltz. 3")}</span>
                    <span className="hidden sm:inline">{t("Bottom 3", "Letzte 3")}</span>
                  </>
                }
                hint={t(
                  "Share of simulations in which the club finishes in the bottom three. How many places mean relegation depends on the league.",
                  "Anteil der Simulationen, in denen der Verein unter den letzten drei landet. Wie viele Plätze den Abstieg bedeuten, hängt von der Liga ab.",
                )}
              />
            </th>
            <th scope="col" className="hidden py-4 pr-7 pl-4 text-left font-medium lg:table-cell">
              <HeaderHint
                align="right"
                label={t(`Final position 1 to ${n}`, `Endplatz 1 bis ${n}`)}
                hint={t(
                  "Each box is one final position, 1 on the left. The darker the box, the more likely that position.",
                  "Jedes Kästchen ist ein Endplatz, links Platz 1. Je dunkler das Kästchen, desto wahrscheinlicher der Platz.",
                )}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.slug} className="border-t border-line/80">
              <td className="tabular py-3 pl-5 font-display font-bold text-muted sm:pl-7">
                {i + 1}
              </td>
              <th
                scope="row"
                className="max-w-[7.5rem] py-3 pr-2 text-left font-normal sm:max-w-none"
              >
                <Link
                  href={paths(locale).team(r.team.slug)}
                  className="flex items-center gap-3 font-semibold hover:underline hover:underline-offset-4"
                >
                  <Crest src={r.team.crest} name={r.team.name} size={24} />
                  <span className="truncate">{r.team.name}</span>
                </Link>
              </th>
              <td className={`${num} hidden text-muted md:table-cell`}>
                {ordinal(locale, r.currentPosition)}, {r.points} {t("pts", "Pkt.")}
              </td>
              <td className={num}>
                <PositionChange from={r.currentPosition} to={i + 1} locale={locale} />
              </td>
              <td className={`${num} font-display text-lg font-extrabold`}>
                {Math.round(r.expectedPoints)}
              </td>
              <td className={`${num} font-semibold`}>{chance(r.title, locale)}</td>
              <td className={`${num} hidden sm:table-cell`}>{chance(r.top4, locale)}</td>
              <td
                className={`tabular py-3 pr-5 pl-2 text-right sm:pr-7 lg:pr-3 ${r.bottom3 >= 0.25 ? "font-semibold text-negative" : ""}`}
              >
                {chance(r.bottom3, locale)}
              </td>
              <td className="hidden py-3 pr-7 pl-4 lg:table-cell">
                <span
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 0.75rem))` }}
                  aria-label={`${t("Most likely final position", "Wahrscheinlichster Endplatz")}: ${
                    r.positionProbabilities.indexOf(Math.max(...r.positionProbabilities)) + 1
                  }`}
                >
                  {r.positionProbabilities.map((p, pos) => (
                    <Heat key={pos} p={p} locale={locale} />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
