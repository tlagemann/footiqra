import Link from "next/link";
import { getLeagueBySlug } from "@/config/leagues";
import { MIN_HIGHLIGHT_GAP, type HistoryReference, type PerformanceGap } from "@/data";
import { Crest } from "./ui";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** How the club's gap compares with the reference day, if known. */
function change(gap: PerformanceGap, previous?: HistoryReference): "new" | number | null {
  const prev = previous?.teams.get(gap.team.slug);
  if (!prev) return null;
  if (
    prev.gap === null ||
    Math.abs(prev.gap) < MIN_HIGHLIGHT_GAP ||
    Math.sign(prev.gap) !== Math.sign(gap.gap)
  ) {
    return "new";
  }
  return prev.gap === gap.gap ? null : prev.gap;
}

function GapRow({
  gap,
  showLeague,
  previous,
}: {
  gap: PerformanceGap;
  showLeague: boolean;
  previous?: HistoryReference;
}) {
  const positive = gap.gap > 0;
  const delta = change(gap, previous);
  return (
    <li>
      <Link
        href={`/teams/${gap.team.slug}/`}
        className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 transition hover:shadow-sm"
      >
        <Crest src={gap.team.crest} name={gap.team.name} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display font-bold tracking-[-0.01em]">
              {gap.team.name}
            </span>
            {delta === "new" && (
              <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand-ink uppercase">
                New
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-muted">
            {ordinal(gap.tablePosition)} in table · {ordinal(gap.strengthPosition)} by strength
            {showLeague && ` · ${getLeagueBySlug(gap.leagueSlug)?.name ?? ""}`}
            {typeof delta === "number" && ` · was ${signed(delta)}`}
          </span>
        </span>
        <span
          className={`tabular shrink-0 rounded-full px-3 py-1 font-display text-sm font-extrabold ${
            positive ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative"
          }`}
          title={`${Math.abs(gap.gap)} places ${positive ? "higher" : "lower"} in the table than by strength`}
        >
          {signed(gap.gap)}
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
  previous,
}: {
  title: string;
  subtitle: string;
  gaps: PerformanceGap[];
  showLeague: boolean;
  empty: string;
  previous?: HistoryReference;
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
            <GapRow key={g.team.slug} gap={g} showLeague={showLeague} previous={previous} />
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
  previous,
}: {
  over: PerformanceGap[];
  under: PerformanceGap[];
  showLeague?: boolean;
  /** Reference day for "New" and "was" hints; omitted until a week of history exists. */
  previous?: HistoryReference;
}) {
  const dateLabel = previous
    ? new Date(`${previous.date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : null;
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column
          title="Overperformers"
          subtitle="Higher in the table than their rating suggests"
          gaps={over}
          showLeague={showLeague}
          empty="No club is clearly above its strength right now."
          previous={previous}
        />
        <Column
          title="Underperformers"
          subtitle="Lower in the table than their rating suggests"
          gaps={under}
          showLeague={showLeague}
          empty="No club is clearly below its strength right now."
          previous={previous}
        />
      </div>
      {dateLabel && (
        <p className="mt-3 text-sm text-muted">
          &ldquo;New&rdquo; and &ldquo;was&rdquo; compare with {dateLabel}.
        </p>
      )}
    </div>
  );
}
