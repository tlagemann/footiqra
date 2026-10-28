import Link from "next/link";
import { LEAGUES } from "@/config/leagues";
import type { MatchForecast } from "@/data";
import { LocalTime } from "./local-time";
import { Crest } from "./ui";

const COMPETITION_LABEL: Record<string, string> = {
  ...Object.fromEntries(LEAGUES.map((l) => [l.providerCodes.footballData, l.name])),
  CL: "Champions League",
};

function TeamName({ team, align }: { team: MatchForecast["home"]; align: "left" | "right" }) {
  return (
    <Link
      href={`/teams/${team.slug}/`}
      className={`flex min-w-0 items-center gap-2.5 font-display font-bold tracking-[-0.01em] hover:underline hover:underline-offset-4 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Crest src={team.crest} name={team.name} size={28} />
      <span className="truncate">{team.name}</span>
    </Link>
  );
}

/** Three-part bar: home win, draw, away win. */
export function ProbabilityBar({
  percentages: p,
  labels = { home: "home", draw: "draw", away: "away" },
  large = false,
}: {
  percentages: MatchForecast["percentages"];
  labels?: { home: string; draw: string; away: string };
  large?: boolean;
}) {
  const favourite =
    p.home >= p.away ? (p.home >= p.draw ? "home" : "draw") : p.away >= p.draw ? "away" : "draw";
  const seg = (key: "home" | "draw" | "away", color: string) => (
    <span
      className={`h-full ${color} ${favourite === key ? "" : "opacity-40"}`}
      style={{ width: `${p[key]}%` }}
    />
  );
  return (
    <div>
      <div
        aria-hidden="true"
        className={`flex gap-0.5 overflow-hidden rounded-full ${large ? "h-3" : "h-2"}`}
      >
        {seg("home", "bg-foreground")}
        {seg("draw", "bg-neutral")}
        {seg("away", "bg-brand")}
      </div>
      <div
        className={`tabular mt-1.5 flex justify-between gap-3 font-semibold ${large ? "text-base" : "text-xs"}`}
      >
        <span>
          {p.home}% <span className="font-medium text-muted">{labels.home}</span>
        </span>
        <span className="text-center">
          {p.draw}% <span className="font-medium text-muted">{labels.draw}</span>
        </span>
        <span className="text-right">
          {p.away}% <span className="font-medium text-muted">{labels.away}</span>
        </span>
      </div>
    </div>
  );
}

function ForecastItem({ forecast }: { forecast: MatchForecast }) {
  const p = forecast.percentages;
  return (
    <li className="rounded-2xl bg-background px-4 py-4 sm:px-5">
      <p className="mb-3 flex flex-wrap gap-x-2 text-xs font-medium text-muted">
        <LocalTime utc={forecast.utcDate} />
        <span aria-hidden="true">·</span>
        <span>{COMPETITION_LABEL[forecast.competition] ?? forecast.competition}</span>
        {forecast.slug && (
          <Link
            href={`/matches/${forecast.slug}/`}
            className="ml-auto font-semibold text-foreground hover:underline hover:underline-offset-4"
          >
            Preview
          </Link>
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_minmax(14rem,18rem)_1fr] md:items-center md:gap-5">
        <div className="flex items-center justify-between gap-3 md:contents">
          <div className="min-w-0 md:order-1 md:justify-self-end">
            <TeamName team={forecast.home} align="left" />
          </div>
          <span className="text-xs font-medium text-muted md:hidden">vs</span>
          <div className="min-w-0 md:order-3">
            <TeamName team={forecast.away} align="left" />
          </div>
        </div>
        <div className="md:order-2">
          <ProbabilityBar percentages={forecast.percentages} />
        </div>
      </div>
      <p className="sr-only">
        Forecast: {forecast.home.name} win {p.home}%, draw {p.draw}%, {forecast.away.name} win{" "}
        {p.away}%.
      </p>
    </li>
  );
}

/** Forecasts grouped by kick-off day (UTC). */
export function ForecastList({
  forecasts,
  grouped = true,
}: {
  forecasts: readonly MatchForecast[];
  grouped?: boolean;
}) {
  if (!grouped) {
    return (
      <ol className="space-y-2 rounded-3xl bg-surface p-3 sm:p-4">
        {forecasts.map((f) => (
          <ForecastItem key={f.id} forecast={f} />
        ))}
      </ol>
    );
  }
  const days = new Map<string, MatchForecast[]>();
  for (const f of forecasts) {
    const day = f.utcDate.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), f]);
  }
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return (
    <div className="space-y-8">
      {[...days].map(([day, list]) => (
        <section key={day} aria-label={dayLabel.format(new Date(`${day}T12:00:00Z`))}>
          <h3 className="mb-3 font-display text-xl font-extrabold tracking-[-0.02em]">
            {dayLabel.format(new Date(`${day}T12:00:00Z`))}
          </h3>
          <ol className="space-y-2 rounded-3xl bg-surface p-3 sm:p-4">
            {list.map((f) => (
              <ForecastItem key={f.id} forecast={f} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
