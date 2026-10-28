import Link from "next/link";
import type { ProjectionRow } from "@/data";
import { Crest } from "./ui";

export function chance(p: number): string {
  if (p <= 0) return "·";
  if (p < 0.005) return "<1%";
  if (p > 0.995 && p < 1) return ">99%";
  return `${Math.round(p * 100)}%`;
}

/** One cell of the position strip: full colour from a 35% chance upwards. */
function Heat({ p }: { p: number }) {
  return (
    <span
      className={`block h-5 w-full rounded-[3px] ${p > 0 ? "bg-brand" : "bg-line"}`}
      style={{ opacity: p > 0 ? 0.1 + 0.9 * Math.min(1, p / 0.35) : 0.5 }}
      title={chance(p)}
    />
  );
}

/** Simulated final table with key probabilities and the full position spread. */
export function ProjectionTable({ rows, caption }: { rows: ProjectionRow[]; caption: string }) {
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
              Team
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium md:table-cell">
              Now
            </th>
            <th
              scope="col"
              className="px-2 py-4 text-right font-medium sm:px-3"
              title="Expected final points"
            >
              Pts
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              Title
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              Top 4
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7 lg:pr-3">
              <span className="sm:hidden">Btm 3</span>
              <span className="hidden sm:inline">Bottom 3</span>
            </th>
            <th scope="col" className="hidden py-4 pr-7 pl-4 text-left font-medium lg:table-cell">
              Final position 1 to {n}
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
                className="max-w-[10rem] py-3 pr-2 text-left font-normal sm:max-w-none"
              >
                <Link
                  href={`/teams/${r.team.slug}/`}
                  className="flex items-center gap-3 font-semibold hover:underline hover:underline-offset-4"
                >
                  <Crest src={r.team.crest} name={r.team.name} size={24} />
                  <span className="truncate">{r.team.name}</span>
                </Link>
              </th>
              <td className={`${num} hidden text-muted md:table-cell`}>
                {r.currentPosition}. · {r.points}
              </td>
              <td className={`${num} font-display text-lg font-extrabold`}>
                {Math.round(r.expectedPoints)}
              </td>
              <td className={`${num} font-semibold`}>{chance(r.title)}</td>
              <td className={`${num} hidden sm:table-cell`}>{chance(r.top4)}</td>
              <td
                className={`tabular py-3 pr-5 pl-2 text-right sm:pr-7 lg:pr-3 ${r.bottom3 >= 0.25 ? "font-semibold text-negative" : ""}`}
              >
                {chance(r.bottom3)}
              </td>
              <td className="hidden py-3 pr-7 pl-4 lg:table-cell">
                <span
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 0.75rem))` }}
                  aria-label={`Most likely final position: ${
                    r.positionProbabilities.indexOf(Math.max(...r.positionProbabilities)) + 1
                  }`}
                >
                  {r.positionProbabilities.map((p, pos) => (
                    <Heat key={pos} p={p} />
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
