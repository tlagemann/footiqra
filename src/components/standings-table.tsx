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
}: {
  rows: TableRow[];
  caption: string;
  powerRanks: ReadonlyMap<string, number>;
}) {
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
              Team
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <abbr title="Played" className="no-underline">
                P
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title="Won" className="no-underline">
                W
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title="Drawn" className="no-underline">
                D
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              <abbr title="Lost" className="no-underline">
                L
              </abbr>
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium md:table-cell">
              Goals
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              <abbr title="Goal difference" className="no-underline">
                GD
              </abbr>
            </th>
            <th scope="col" className="hidden py-4 pl-4 text-left font-medium lg:table-cell">
              Form
            </th>
            <th
              scope="col"
              className="hidden px-3 py-4 text-right font-medium md:table-cell"
              title="Position in the Footiqra power ranking across all leagues"
            >
              Power #
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7">
              Pts
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
                <td className="tabular py-3 pl-5 font-display font-bold text-muted sm:pl-7">
                  {row.position}
                </td>
                <th
                  scope="row"
                  className="max-w-[11rem] py-3 pr-2 text-left font-normal sm:max-w-none"
                >
                  {row.team.slug ? (
                    <Link
                      href={`/teams/${row.team.slug}/`}
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
                  <FormGuide form={row.form} />
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
