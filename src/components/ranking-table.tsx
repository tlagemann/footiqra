import { paths, tr, type Locale } from "@/i18n";
import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import type { PowerRankingRow } from "@/data";
import { Crest, FormGuide } from "./ui";

/**
 * Column header with a short explanation. Pure CSS (hover, keyboard focus and tap on touch
 * devices), so the table stays a server component. The text is also exposed to screen readers.
 */
function HeaderHint({
  label,
  hint,
  align = "left",
}: {
  label: string;
  hint: string;
  align?: "left" | "right";
}) {
  return (
    <span className="group relative inline-block">
      <span
        tabIndex={0}
        className="cursor-help rounded-sm border-b border-dotted border-muted/70 outline-offset-4 focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-20 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-2xl bg-foreground px-4 py-3 text-left text-xs font-normal normal-case tracking-normal text-background opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${align === "right" ? "right-0" : "left-0"}`}
      >
        {hint}
      </span>
    </span>
  );
}

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
              <HeaderHint
                label={rankLabel}
                hint={
                  showLeague
                    ? t(
                        "Position in the power ranking, ordered by rating. Leagues are compared on one scale.",
                        "Platz im Power-Ranking, sortiert nach Rating. Alle Ligen werden auf einer gemeinsamen Skala verglichen.",
                      )
                    : t(
                        "Position within this league, ordered by rating.",
                        "Platz innerhalb dieser Liga, sortiert nach Rating.",
                      )
                }
              />
            </th>
            <th scope="col" className="py-4 font-medium">
              <HeaderHint
                label={t("Team", "Verein")}
                hint={t(
                  "Click a club for its profile with results, fixtures and rating history.",
                  "Ein Klick auf den Verein öffnet das Profil mit Ergebnissen, Spielplan und Rating-Verlauf.",
                )}
              />
            </th>
            {showLeague && (
              <th scope="col" className="hidden py-4 font-medium md:table-cell">
                <HeaderHint
                  label={t("League", "Liga")}
                  hint={t(
                    "Domestic league of the club. Clubs in stronger leagues start with a higher rating.",
                    "Heimatliga des Vereins. Vereine aus stärkeren Ligen starten mit einem höheren Rating.",
                  )}
                />
              </th>
            )}
            <th scope="col" className="hidden py-4 font-medium lg:table-cell">
              <HeaderHint
                label="Form"
                hint={t(
                  "Results of the last 5 matches, oldest on the left, latest on the right. W = win, D = draw, L = loss.",
                  "Ergebnisse der letzten 5 Spiele, links das älteste, rechts das neueste. S = Sieg, U = Unentschieden, N = Niederlage.",
                )}
              />
            </th>
            <th scope="col" className="py-4 pr-5 text-right font-medium sm:w-56 sm:pr-7">
              <HeaderHint
                align="right"
                label="Rating"
                hint={t(
                  "Elo-based strength rating. 1500 is the average, higher is stronger. It rises with wins against strong opponents and drops with losses.",
                  "Elo-basierte Stärke. 1500 ist der Durchschnitt, höher bedeutet stärker. Das Rating steigt mit Siegen gegen starke Gegner und sinkt bei Niederlagen.",
                )}
              />
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
