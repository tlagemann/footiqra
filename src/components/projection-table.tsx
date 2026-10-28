import Link from "next/link";
import type { ProjectionRow } from "@/data";
import { Crest } from "./ui";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Places gained (green, up) or lost (red, down) between today and the predicted end. */
function PositionChange({ from, to }: { from: number; to: number }) {
  const diff = from - to;
  if (diff === 0) {
    return (
      <span className="text-muted" title="No change expected">
        =
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`font-semibold whitespace-nowrap ${up ? "text-positive" : "text-negative"}`}
      title={`${Math.abs(diff)} place${Math.abs(diff) === 1 ? "" : "s"} ${up ? "higher" : "lower"} than today`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"} </span>
      {Math.abs(diff)}
    </span>
  );
}

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
              Today
            </th>
            <th
              scope="col"
              className="px-2 py-4 text-right font-medium sm:px-3"
              title="Change from today's table position to the predicted final position"
            >
              <span className="sm:hidden">+/-</span>
              <span className="hidden sm:inline">Change</span>
            </th>
            <th
              scope="col"
              className="px-2 py-4 text-right font-medium sm:px-3"
              title="Expected points at the end of the season"
            >
              <span className="sm:hidden">Pts</span>
              <span className="hidden sm:inline">Final pts</span>
            </th>
            <th scope="col" className="px-2 py-4 text-right font-medium sm:px-3">
              Title
            </th>
            <th scope="col" className="hidden px-3 py-4 text-right font-medium sm:table-cell">
              Top 4
            </th>
            <th scope="col" className="py-4 pr-5 pl-2 text-right font-medium sm:pr-7 lg:pr-3">
              <span className="whitespace-nowrap sm:hidden">Btm 3</span>
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
                className="max-w-[7.5rem] py-3 pr-2 text-left font-normal sm:max-w-none"
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
                {ordinal(r.currentPosition)}, {r.points} pts
              </td>
              <td className={num}>
                <PositionChange from={r.currentPosition} to={i + 1} />
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
