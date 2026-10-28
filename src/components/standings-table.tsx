import { paths, tr, type Locale } from "@/i18n";
import Link from "next/link";
import type { TableRow } from "@/data";
import { Crest, FormGuide } from "./ui";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Official league table. `powerRanks` maps team slug to overall power rank,
 * so the table shows where each club stands across all leagues.
 */
export function StandingsTable({
  rows,
  caption,
  powerRanks,
  zone,
  locale = "en",
}: {
  rows: TableRow[];
  caption: string;
  powerRanks: ReadonlyMap<string, number>;
  /** Optional marker per position, drawn as a coloured bar next to the rank. */
  zone?: (position: number) => "direct" | "playoff" | null;
  locale?: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const num = "tabular px-2 py-3 text-right sm:px-3";
  return (
    <div className="overflow-x-auto rounded-3xl bg-surface">
      <table className="w-full min-w-[22rem] text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-10 py-4 pl-5 text-left font-medium sm:w-14 sm:pl-7">
              #
            </th>
            <th scope="col" className="py-4 text-left font-medium">
              {t("Team", "Verein")}
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <abbr title={t("Played", "Spiele")} className="no-underline">
                {t("P", "Sp.")}
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title={t("Won", "Siege")} className="no-underline">
                {t("W", "S")}
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title={t("Drawn", "Unentschieden")} className="no-underline">
                {t("D", "U")}
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title={t("Lost", "Niederlagen")} className="no-underline">
                {t("L", "N")}
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium md:table-cell">
              {t("Goals", "Tore")}
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <abbr title={t("Goal difference", "Tordifferenz")} className="no-underline">
                {t("GD", "Diff.")}
              </abbr>
            </th>
            <th scope="col" className="hidden py-4 pl-4 text-left font-medium lg:table-cell">
              Form
            </th>
            <th
              scope="col"
              className="hidden px-3 py-4 text-right font-medium md:table-cell"
              title={t(
                "Position in the Footiqra power ranking across all leagues",
                "Platz im Footiqra Power-Ranking über alle Ligen",
              )}
            >
              Power #
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7">
              {t("Pts", "Pkt.")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const powerRank = row.team.slug ? powerRanks.get(row.team.slug) : undefined;
            const name = (
              <>
                <Crest src={row.team.crest} name={row.team.name} size={24} />
                <span className="truncate">{row.team.name}</span>
              </>
            );
            return (
              <tr
                key={`${row.position}-${row.team.name}`}
                className="border-t border-line/80 transition hover:bg-surface-strong/60"
              >
                <td className="tabular relative py-3 pl-5 font-display font-bold text-muted sm:pl-7">
                  {zone && zone(row.position) && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-2.5 bottom-2.5 left-2 w-1 rounded-full sm:left-3 ${
                        zone(row.position) === "direct" ? "bg-brand" : "bg-neutral"
                      }`}
                    />
                  )}
                  {row.position}
                </td>
                <th
                  scope="row"
                  className="max-w-[11rem] py-3 pr-2 text-left font-normal sm:max-w-none"
                >
                  {row.team.slug ? (
                    <Link
                      href={paths(locale).team(row.team.slug)}
                      className="flex items-center gap-3 font-semibold hover:underline hover:underline-offset-4"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3 font-semibold">{name}</span>
                  )}
                </th>
                <td className={num}>{row.playedGames}</td>
                <td className={`${num} hidden sm:table-cell`}>{row.won}</td>
                <td className={`${num} hidden sm:table-cell`}>{row.draw}</td>
                <td className={`${num} hidden sm:table-cell`}>{row.lost}</td>
                <td className={`${num} hidden text-muted md:table-cell`}>
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td className={num}>{signed(row.goalDifference)}</td>
                <td className="hidden py-3 pl-4 lg:table-cell">
                  <FormGuide form={row.form} locale={locale} />
                </td>
                <td className={`${num} hidden text-muted md:table-cell`}>
                  {powerRank ? `#${powerRank}` : "·"}
                </td>
                <td className="tabular py-3 pr-5 pl-2 text-right font-display text-lg font-extrabold sm:pr-7">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
