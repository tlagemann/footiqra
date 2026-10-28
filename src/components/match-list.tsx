import Link from "next/link";
import { LEAGUES } from "@/config/leagues";
import type { MatchView } from "@/data";
import { Crest } from "./ui";

const COMPETITION_LABEL: Record<string, string> = {
  ...Object.fromEntries(LEAGUES.map((l) => [l.providerCodes.footballData, l.name])),
  CL: "Champions League",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function TeamCell({ team, align }: { team: MatchView["home"]; align: "left" | "right" }) {
  const content = (
    <span
      className={`flex items-center gap-2.5 font-semibold ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <Crest src={team.crest} name={team.name} size={24} />
      <span className="truncate">{team.name}</span>
    </span>
  );
  return team.slug ? (
    <Link href={`/teams/${team.slug}/`} className="block hover:underline hover:underline-offset-4">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Results or fixtures as a semantic table (readable without JavaScript, indexable). */
export function MatchList({ matches, caption }: { matches: MatchView[]; caption: string }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface">
      <table className="w-full table-fixed text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Date and competition</th>
            <th scope="col">Home</th>
            <th scope="col">Score</th>
            <th scope="col">Away</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={m.id} className={i > 0 ? "border-t border-line/80" : ""}>
              <td className="w-24 py-3.5 pl-5 align-middle sm:w-40 sm:pl-7">
                <time dateTime={m.utcDate} className="tabular block text-sm font-semibold">
                  {dateFormat.format(new Date(m.utcDate))}
                </time>
                <span className="block truncate text-xs text-muted">
                  {COMPETITION_LABEL[m.competition] ?? m.competition}
                </span>
              </td>
              <td className="py-3.5">
                <TeamCell team={m.home} align="right" />
              </td>
              <td className="w-20 py-3.5 text-center sm:w-24">
                {(() => {
                  const label =
                    m.homeGoals !== null && m.awayGoals !== null ? (
                      <span className="tabular inline-block rounded-xl bg-background px-3 py-1 font-display text-lg font-bold">
                        {m.homeGoals}:{m.awayGoals}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted">vs</span>
                    );
                  return m.slug ? (
                    <Link
                      href={`/matches/${m.slug}/`}
                      className="inline-block rounded-xl transition hover:ring-2 hover:ring-line"
                      aria-label={`${m.home.name} vs ${m.away.name}: match page`}
                    >
                      {label}
                    </Link>
                  ) : (
                    label
                  );
                })()}
              </td>
              <td className="py-3.5 pr-5 sm:pr-7">
                <TeamCell team={m.away} align="left" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LastUpdated({ utc }: { utc: string }) {
  return (
    <p className="mt-3 text-xs text-muted">
      Updated{" "}
      <time dateTime={utc}>
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(utc))}{" "}
        UTC
      </time>{" "}
      · Data: football-data.org
    </p>
  );
}
