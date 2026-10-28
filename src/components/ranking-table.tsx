import { paths, tr, type Locale } from "@/i18n";
import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import type { PowerRankingRow } from "@/data";
import { Crest, FormGuide } from "./ui";

/**
 * Power ranking as a semantic table, server-rendered so every row is in the HTML.
 * Optional `ratingScale` draws a bar per row relative to the shown range.
 */
export function RankingTable({
  rows,
  caption,
  showLeague = true,
  rankLabel = "#",
  locale = "en",
}: {
  rows: PowerRankingRow[];
  caption: string;
  showLeague?: boolean;
  rankLabel?: string;
  locale?: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const ratings = rows.map((r) => r.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const width = (rating: number) => (max === min ? 100 : 12 + ((rating - min) / (max - min)) * 88);

  return (
    <div className="overflow-hidden rounded-3xl bg-surface">
      <table className="w-full text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-left text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th
              scope="col"
              className={`${rankLabel.length > 2 ? "w-24 sm:w-28" : "w-12 sm:w-16"} py-4 pl-5 font-medium sm:pl-7`}
            >
              {rankLabel}
            </th>
            <th scope="col" className="py-4 font-medium">
              {t("Team", "Verein")}
            </th>
            {showLeague && (
              <th scope="col" className="hidden py-4 font-medium md:table-cell">
                {t("League", "Liga")}
              </th>
            )}
            <th scope="col" className="hidden py-4 font-medium lg:table-cell">
              Form
            </th>
            <th scope="col" className="py-4 pr-5 text-right font-medium sm:w-56 sm:pr-7">
              Rating
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team.slug}
              className="border-t border-line/80 transition hover:bg-surface-strong/60"
            >
              <td className="tabular py-3 pl-5 font-display text-lg font-bold text-muted sm:pl-7">
                {row.rank}
              </td>
              <th scope="row" className="py-3 pr-3 text-left font-normal">
                <Link
                  href={p.team(row.team.slug)}
                  className="flex items-center gap-3 font-semibold hover:underline hover:underline-offset-4"
                >
                  <Crest src={row.team.crest} name={row.team.name} size={28} />
                  <span className="truncate">{row.team.shortName || row.team.name}</span>
                </Link>
              </th>
              {showLeague && (
                <td className="hidden py-3 text-muted md:table-cell">
                  <Link href={p.league(row.team.leagueSlug)} className="hover:text-foreground">
                    {getLeagueBySlug(row.team.leagueSlug)?.name}
                  </Link>
                </td>
              )}
              <td className="hidden py-3 lg:table-cell">
                <FormGuide form={row.form} locale={locale} />
              </td>
              <td className="py-3 pr-5 sm:pr-7">
                <div className="flex items-center justify-end gap-3">
                  <span
                    aria-hidden="true"
                    className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-strong sm:block"
                  >
                    <span
                      className="block h-full rounded-full bg-foreground"
                      style={{ width: `${width(row.rating)}%` }}
                    />
                  </span>
                  <span className="tabular w-12 text-right font-display text-lg font-bold">
                    {Math.round(row.rating)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
