import Link from "next/link";
import type { TitleRace } from "@/data";
import { fmtChance, fmtDate, paths, tr, type Locale } from "@/i18n";
import { TitleRaceChart } from "./title-race-chart";

/** One-sentence summary: today's favourite and how the race changed since the start. */
export function titleRaceSummary(race: TitleRace, leagueName: string, locale: Locale): string {
  const leader = race.series[0];
  if (!leader) return "";
  const pct = (p: number) => fmtChance(locale, p);
  const now = leader.chances.at(-1) ?? 0;
  const start = leader.chances[0] ?? 0;
  const startLeader = [...race.series].sort(
    (a, b) => (b.chances[0] ?? 0) - (a.chances[0] ?? 0),
  )[0]!;
  const first =
    locale === "de"
      ? `${leader.name} ist mit ${pct(now)} Favorit auf den Titel in der ${leagueName}, zum Saisonstart waren es ${pct(start)}.`
      : `${leader.name} are the ${leagueName} title favourites at ${pct(now)}, ${now >= start ? "up" : "down"} from ${pct(start)} at the start of the season.`;
  if (startLeader.teamId === leader.teamId) return first;
  return locale === "de"
    ? `${first} Vor der Saison lag ${startLeader.name} mit ${pct(startLeader.chances[0] ?? 0)} vorn.`
    : `${first} Before the season, ${startLeader.name} led with ${pct(startLeader.chances[0] ?? 0)}.`;
}

/** Chart plus a table view of the same numbers (for screen readers and search engines). */
export function TitleRacePanel({
  race,
  leagueName,
  locale,
}: {
  race: TitleRace;
  leagueName: string;
  locale: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const day = (ms: number) =>
    fmtDate(locale, new Date(ms).toISOString(), { day: "numeric", month: "short" });
  const last = race.times.length - 1;
  const pct = (p: number) => fmtChance(locale, p);
  return (
    <div className="rounded-3xl bg-surface p-4 sm:p-6">
      <TitleRaceChart
        times={race.times}
        played={race.played}
        series={race.series.map((s) => ({ name: s.name, chances: s.chances }))}
        locale={locale}
        ariaLabel={t(
          `${leagueName} title chances over the season: ${race.series.map((s) => `${s.name} ${pct(s.chances.at(-1) ?? 0)}`).join(", ")} today.`,
          `Meisterchancen in der ${leagueName} im Saisonverlauf: heute ${race.series.map((s) => `${s.name} ${pct(s.chances.at(-1) ?? 0)}`).join(", ")}.`,
        )}
      />
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-muted hover:text-foreground">
          {t("Show as table", "Als Tabelle anzeigen")}
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              {t(`${leagueName} title chances by week`, `Meisterchancen ${leagueName} nach Wochen`)}
            </caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t("Date", "Datum")}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t("Played", "Spiele")}
                </th>
                {race.series.map((s) => (
                  <th key={s.slug} scope="col" className="py-2 pr-4 text-right font-medium">
                    <Link href={p.team(s.slug)} className="hover:underline">
                      {s.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {race.times.map((time, i) => (
                <tr key={time} className="border-t border-line">
                  <th scope="row" className="py-2 pr-4 font-medium whitespace-nowrap">
                    {i === last ? t("Today", "Heute") : day(time)}
                  </th>
                  <td className="tabular py-2 pr-4 text-right">{race.played[i]}</td>
                  {race.series.map((s) => (
                    <td key={s.slug} className="tabular py-2 pr-4 text-right">
                      {pct(s.chances[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
