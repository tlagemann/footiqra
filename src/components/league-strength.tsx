import { paths, tr, type Locale } from "@/i18n";
import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import type { PowerRanking } from "@/data";

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

/** League strength as diverging horizontal bars around zero. */
export function LeagueStrength({
  leagues,
  locale = "en",
}: {
  leagues: PowerRanking["leagues"];
  locale?: Locale;
}) {
  const maxAbs = Math.max(1, ...leagues.map((l) => Math.abs(l.currentAdjustment)));
  return (
    <ul className="space-y-1 rounded-3xl bg-surface p-3 sm:p-4">
      {leagues.map((l) => {
        const league = getLeagueBySlug(l.leagueSlug);
        const share = (Math.abs(l.currentAdjustment) / maxAbs) * 50;
        const positive = l.currentAdjustment >= 0;
        const change = l.currentAdjustment - l.startingOffset;
        return (
          <li key={l.leagueSlug}>
            <Link
              href={paths(locale).league(l.leagueSlug)}
              className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-strong sm:grid-cols-[10rem_1fr_7rem]"
            >
              <span className="truncate font-semibold">{league?.name}</span>
              <span aria-hidden="true" className="relative h-2.5 rounded-full bg-surface-strong">
                <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                <span
                  className={`absolute inset-y-0 rounded-full ${positive ? "bg-foreground" : "bg-neutral"}`}
                  style={
                    positive
                      ? { left: "50%", width: `${share}%` }
                      : { right: "50%", width: `${share}%` }
                  }
                />
              </span>
              <span className="text-right">
                <span className="tabular font-display text-lg font-bold">
                  {signed(l.currentAdjustment)}
                </span>
                <span
                  className={`tabular ml-2 hidden text-xs font-semibold sm:inline ${
                    change > 0.5 ? "text-positive" : change < -0.5 ? "text-negative" : "text-muted"
                  }`}
                  title={tr(locale, "Change since season start", "Veränderung seit Saisonbeginn")}
                >
                  {signed(change)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
