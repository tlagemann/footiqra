import Link from "next/link";
import type { ProjectionRow } from "@/data";
import { fmtChance, ordinal, paths, tr, type Locale } from "@/i18n";
import { Crest } from "./ui";

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
    <div className="overflow-x-auto rounded-3xl bg-surface">
      <table className="w-full text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-10 py-4 pl-5 text-left font-medium sm:w-14 sm:pl-7">
              #
            </th>
            <th scope="col" className="py-4 text-left font-medium">
              {t("Team", "Verein")}
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium md:table-cell">
              {t("Today", "Heute")}
            </th>
            <th
              scope="col"
              className="px-2 py-4 text-right font-medium sm:px-3"
              title={t(
                "Change from today's table position to the predicted final position",
                "Veränderung vom heutigen Tabellenplatz zum prognostizierten Endplatz",
              )}
            >
              <span className="sm:hidden">+/-</span>
              <span className="hidden sm:inline">{t("Change", "Trend")}</span>
            </th>
            <th
              scope="col"
              className="px-2 py-4 text-right font-medium sm:px-3"
              title={t(
                "Expected points at the end of the season",
                "Erwartete Punkte am Saisonende",
              )}
            >
              <span className="sm:hidden">{t("Pts", "Pkt.")}</span>
              <span className="hidden sm:inline">{t("Final pts", "Pkt. Ende")}</span>
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              {t("Title", "Meister")}
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              Top 4
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7 lg:pr-3">
              <span className="whitespace-nowrap sm:hidden">{t("Btm 3", "Ltz. 3")}</span>
              <span className="hidden sm:inline">{t("Bottom 3", "Letzte 3")}</span>
            </th>
            <th scope="col" className="hidden py-4 pr-7 pl-4 text-left font-medium lg:table-cell">
              {t(`Final position 1 to ${n}`, `Endplatz 1 bis ${n}`)}
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
