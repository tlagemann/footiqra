import Link from "next/link";
import type { MatchView } from "@/data";

const COMPETITION_LABEL: Record<string, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  CL: "Champions League",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function TeamName({ team }: { team: MatchView["home"] }) {
  return team.slug ? (
    <Link href={`/teams/${team.slug}/`} className="hover:text-accent">
      {team.name}
    </Link>
  ) : (
    <span>{team.name}</span>
  );
}

/** Results or fixtures as a semantic table (readable without JavaScript, indexable). */
export function MatchList({ matches, caption }: { matches: MatchView[]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="text-left text-xs text-muted">
        <tr>
          <th scope="col" className="py-2 font-medium">
            Date
          </th>
          <th scope="col" className="py-2 font-medium">
            Competition
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Home
          </th>
          <th scope="col" className="py-2 text-center font-medium">
            Score
          </th>
          <th scope="col" className="py-2 font-medium">
            Away
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {matches.map((m) => (
          <tr key={m.id}>
            <td className="py-2 whitespace-nowrap text-muted">
              <time dateTime={m.utcDate}>{dateFormat.format(new Date(m.utcDate))}</time>
            </td>
            <td className="py-2 text-muted">{COMPETITION_LABEL[m.competition] ?? m.competition}</td>
            <td className="py-2 text-right">
              <TeamName team={m.home} />
            </td>
            <td className="py-2 text-center font-mono tabular-nums">
              {m.homeGoals !== null && m.awayGoals !== null
                ? `${m.homeGoals}:${m.awayGoals}`
                : "vs"}
            </td>
            <td className="py-2">
              <TeamName team={m.away} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LastUpdated({ utc }: { utc: string }) {
  return (
    <p className="text-xs text-muted">
      Data last updated{" "}
      <time dateTime={utc}>
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(utc))}{" "}
        UTC
      </time>
      . Source: football-data.org
    </p>
  );
}
