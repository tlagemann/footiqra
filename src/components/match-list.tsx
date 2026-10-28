import Link from "next/link";
import { LEAGUES } from "@/config/leagues";
import type { MatchView } from "@/data";
import { fmtDate, paths, tr, type Locale } from "@/i18n";
import { Crest } from "./ui";

const COMPETITION_LABEL: Record<string, string> = {
  ...Object.fromEntries(LEAGUES.map((l) => [l.providerCodes.footballData, l.name])),
  CL: "Champions League",
};

function TeamCell({
  team,
  align,
  locale,
}: {
  team: MatchView["home"];
  align: "left" | "right";
  locale: Locale;
}) {
  const content = (
    <span
      className={`flex items-center gap-2.5 font-semibold ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <Crest src={team.crest} name={team.name} size={24} />
      <span className="truncate">{team.name}</span>
    </span>
  );
  return team.slug ? (
    <Link
      href={paths(locale).team(team.slug)}
      className="block hover:underline hover:underline-offset-4"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

/** Results or fixtures as a semantic table (readable without JavaScript, indexable). */
export function MatchList({
  matches,
  caption,
  locale = "en",
}: {
  matches: MatchView[];
  caption: string;
  locale?: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  return (
    <div className="overflow-hidden rounded-3xl bg-surface">
      <table className="w-full table-fixed text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{t("Date and competition", "Datum und Wettbewerb")}</th>
            <th scope="col">{t("Home", "Heim")}</th>
            <th scope="col">{t("Score", "Ergebnis")}</th>
            <th scope="col">{t("Away", "Gast")}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={m.id} className={i > 0 ? "border-t border-line/80" : ""}>
              <td className="w-24 py-3.5 pl-5 align-middle sm:w-40 sm:pl-7">
                <time dateTime={m.utcDate} className="tabular block text-sm font-semibold">
                  {fmtDate(locale, m.utcDate, { day: "numeric", month: "short" })}
                </time>
                <span className="block truncate text-xs text-muted">
                  {COMPETITION_LABEL[m.competition] ?? m.competition}
                </span>
              </td>
              <td className="py-3.5">
                <TeamCell team={m.home} align="right" locale={locale} />
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
                      href={paths(locale).match(m.slug)}
                      className="inline-block rounded-xl transition hover:ring-2 hover:ring-line"
                      aria-label={`${m.home.name} vs ${m.away.name}: ${t("match page", "Spielseite")}`}
                    >
                      {label}
                    </Link>
                  ) : (
                    label
                  );
                })()}
              </td>
              <td className="py-3.5 pr-5 sm:pr-7">
                <TeamCell team={m.away} align="left" locale={locale} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LastUpdated({
  utc,
  locale = "en",
  className = "mt-3 text-xs",
}: {
  utc: string;
  locale?: Locale;
  className?: string;
}) {
  return (
    <p className={`${className} text-muted`}>
      {tr(locale, "Last updated", "Zuletzt aktualisiert")}{" "}
      <time dateTime={utc}>
        {fmtDate(locale, utc, { dateStyle: "medium", timeStyle: "short" })} UTC
      </time>{" "}
      · {tr(locale, "Data", "Daten")}: football-data.org
    </p>
  );
}
