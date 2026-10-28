import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import type { PowerRankingRow } from "@/data";

/**
 * Power ranking as a semantic table: rank, team, league, rating, matches.
 * Server-rendered, so every row is in the HTML for search engines.
 */
export function RankingTable({
  rows,
  caption,
  showLeague = true,
  rankLabel = "Rank",
}: {
  rows: PowerRankingRow[];
  caption: string;
  showLeague?: boolean;
  rankLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-left text-xs text-muted">
          <tr>
            <th scope="col" className="w-12 py-2 font-medium">
              {rankLabel}
            </th>
            <th scope="col" className="py-2 font-medium">
              Team
            </th>
            {showLeague && (
              <th scope="col" className="hidden py-2 font-medium sm:table-cell">
                League
              </th>
            )}
            <th scope="col" className="py-2 text-right font-medium">
              Rating
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              <abbr title="Matches used for the rating">MP</abbr>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.team.slug}>
              <td className="py-2 font-mono tabular-nums text-muted">{row.rank}</td>
              <th scope="row" className="py-2 text-left font-normal">
                <Link href={`/teams/${row.team.slug}/`} className="hover:text-accent">
                  {row.team.name}
                </Link>
              </th>
              {showLeague && (
                <td className="hidden py-2 text-muted sm:table-cell">
                  <Link href={`/leagues/${row.team.leagueSlug}/`} className="hover:text-accent">
                    {getLeagueBySlug(row.team.leagueSlug)?.name}
                  </Link>
                </td>
              )}
              <td className="py-2 text-right font-mono tabular-nums">{Math.round(row.rating)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-muted">
                {row.matchesPlayed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
