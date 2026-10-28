import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import type { PerformanceGap } from "@/data";
import { Crest } from "./ui";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function GapRow({ gap, showLeague }: { gap: PerformanceGap; showLeague: boolean }) {
  const positive = gap.gap > 0;
  return (
    <li>
      <Link
        href={`/teams/${gap.team.slug}/`}
        className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 transition hover:shadow-sm"
      >
        <Crest src={gap.team.crest} name={gap.team.name} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold tracking-[-0.01em]">
            {gap.team.name}
          </span>
          <span className="block truncate text-sm text-muted">
            {ordinal(gap.tablePosition)} in table · {ordinal(gap.strengthPosition)} by strength
            {showLeague && ` · ${getLeagueBySlug(gap.leagueSlug)?.name ?? ""}`}
          </span>
        </span>
        <span
          className={`tabular shrink-0 rounded-full px-3 py-1 font-display text-sm font-extrabold ${
            positive ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative"
          }`}
          title={`${Math.abs(gap.gap)} places ${positive ? "higher" : "lower"} in the table than by strength`}
        >
          {positive ? `+${gap.gap}` : gap.gap}
        </span>
      </Link>
    </li>
  );
}

function Column({
  title,
  subtitle,
  gaps,
  showLeague,
  empty,
}: {
  title: string;
  subtitle: string;
  gaps: PerformanceGap[];
  showLeague: boolean;
  empty: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl bg-surface p-3 sm:p-4">
      <div className="px-2 pt-2 pb-4">
        <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {gaps.length > 0 ? (
        <ol className="space-y-2">
          {gaps.map((g) => (
            <GapRow key={g.team.slug} gap={g} showLeague={showLeague} />
          ))}
        </ol>
      ) : (
        <p className="px-2 pb-3 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

/** Two cards: clubs above and below their strength. */
export function PerformanceCards({
  over,
  under,
  showLeague = false,
}: {
  over: PerformanceGap[];
  under: PerformanceGap[];
  showLeague?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Column
        title="Overperformers"
        subtitle="Higher in the table than their rating suggests"
        gaps={over}
        showLeague={showLeague}
        empty="No club is clearly above its strength right now."
      />
      <Column
        title="Underperformers"
        subtitle="Lower in the table than their rating suggests"
        gaps={under}
        showLeague={showLeague}
        empty="No club is clearly below its strength right now."
      />
    </div>
  );
}
