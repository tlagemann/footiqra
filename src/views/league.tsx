import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { ForecastList } from "@/components/forecast-list";
import { PerformanceCards } from "@/components/performance";
import { chance } from "@/components/projection-table";
import { RankingTable } from "@/components/ranking-table";
import { StandingsTable } from "@/components/standings-table";
import { Crest, Eyebrow, SectionHeading } from "@/components/ui";
import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import {
  getLeagueScorers,
  getLeagueProjection,
  getLeagueTable,
  getLeagueTeams,
  getPowerRanking,
  getTableVsStrength,
  getUpcomingForecasts,
  getWeekAgo,
  nextWindow,
} from "@/data";
import { country, paths, seasonLabel, signed, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function leagueStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export function leagueMetadata(locale: Locale, slug: string): Metadata {
  const league = getLeagueBySlug(slug);
  if (!league) return {};
  return pageMetadata({
    locale,
    title: tr(
      locale,
      `${league.name} power ranking, table and form`,
      `${league.name}: Power-Ranking, Tabelle und Form`,
    ),
    description: tr(
      locale,
      `${league.name} power ranking: every club rated by strength, plus the table, form, next matches and the predicted final standings. Updated several times a day.`,
      `${league.name} im Power-Ranking: alle Vereine nach Stärke, dazu Tabelle, Form, nächste Spiele und die Prognose der Abschlusstabelle. Mehrmals täglich aktuell.`,
    ),
    paths: { en: paths("en").league(league.slug), de: paths("de").league(league.slug) },
    image: ogImage.league(league.slug),
  });
}

export async function LeagueView({ locale, slug }: { locale: Locale; slug: string }) {
  const league = getLeagueBySlug(slug);
  if (!league) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);

  const [teams, ranking, table] = await Promise.all([
    getLeagueTeams(league.slug),
    getPowerRanking(),
    getLeagueTable(league.slug),
  ]);
  const [performance, weekAgo, allForecasts, projection] = await Promise.all([
    getTableVsStrength(league.slug),
    getWeekAgo(),
    getUpcomingForecasts(),
    getLeagueProjection(league.slug),
  ]);
  const scorers = (await getLeagueScorers(league.slug))?.scorers.slice(0, 5) ?? [];
  const titleRace = projection?.rows.slice(0, 3) ?? [];
  const dropZone = [...(projection?.rows ?? [])].sort((a, b) => b.bottom3 - a.bottom3).slice(0, 3);
  const forecasts = nextWindow(
    allForecasts.filter((f) => f.leagueSlug === league.slug),
    6,
  );
  const powerRanks = new Map(
    ranking.status === "ok" ? ranking.data.rows.map((r) => [r.team.slug, r.rank]) : [],
  );
  const rows =
    ranking.status === "ok"
      ? ranking.data.rows.filter((r) => r.team.leagueSlug === league.slug)
      : [];
  const strength =
    ranking.status === "ok"
      ? ranking.data.leagues.find((l) => l.leagueSlug === league.slug)
      : undefined;
  const strengthRank =
    ranking.status === "ok" && strength ? ranking.data.leagues.indexOf(strength) + 1 : undefined;

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Leagues", "Ligen"), path: p.leagues },
          { name: league.name, path: p.league(league.slug) },
        ])}
      />
      <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow>{country(locale, league.country)}</Eyebrow>
          <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
            {league.name}
          </h1>
        </div>
        {strength && (
          <dl className="grid grid-cols-3 gap-3">
            {[
              {
                label: t("League strength", "Ligastärke"),
                value: signed(strength.currentAdjustment),
              },
              {
                label: t("Strength rank", "Stärke-Rang"),
                value: `${strengthRank} / ${LEAGUES.length}`,
              },
              { label: t("Teams", "Vereine"), value: String(rows.length) },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl bg-surface px-5 py-4">
                <dt className="text-xs font-medium text-muted">{s.label}</dt>
                <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {rows.length > 0 && (
        <section aria-labelledby="podium">
          <h2 id="podium" className="sr-only">
            {t("Strongest teams", "Stärkste Vereine")}
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {rows.slice(0, 3).map((row, i) => (
              <li key={row.team.slug}>
                <Link
                  href={p.team(row.team.slug)}
                  className="flex h-full flex-col justify-between gap-6 rounded-3xl bg-surface p-6 transition hover:bg-surface-strong"
                >
                  <div className="flex items-start justify-between">
                    <Crest src={row.team.crest} name={row.team.name} size={56} />
                    <span className="font-display text-sm font-bold text-muted">
                      {locale === "de"
                        ? `#${i + 1} der Liga · #${row.rank} gesamt`
                        : `#${i + 1} in league · #${row.rank} overall`}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold tracking-[-0.02em]">
                      {row.team.shortName || row.team.name}
                    </p>
                    <p className="tabular font-display text-4xl font-extrabold tracking-[-0.04em]">
                      {Math.round(row.rating)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {scorers.length > 0 && (
        <section aria-labelledby="scorers-teaser">
          <SectionHeading
            id="scorers-teaser"
            title={t("Top scorers", "Torjäger")}
            aside={
              <Link
                href={p.leagueScorers(league.slug)}
                className="text-sm text-muted hover:text-foreground"
              >
                {t("Top 100", "Top 100")} <span aria-hidden>→</span>
              </Link>
            }
          />
          <ol className="rounded-3xl bg-surface px-5 py-2 sm:px-6">
            {scorers.map((s, j) => (
              <li
                key={s.playerId}
                className="flex items-center gap-3 border-t border-line/80 py-3 first:border-t-0"
              >
                <span className="tabular w-6 font-display font-bold text-muted">
                  {j > 0 && scorers[j - 1]!.rank === s.rank ? "" : `${s.rank}.`}
                </span>
                <Crest src={s.team.crest} name={s.team.name} size={22} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{s.name}</span>{" "}
                  <span className="text-sm text-muted">{s.team.name}</span>
                </span>
                <span className="tabular font-display text-xl font-extrabold">{s.goals}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {projection && (
        <section aria-labelledby="projection-teaser">
          <SectionHeading
            id="projection-teaser"
            title={t("Predicted final table", "Prognose Abschlusstabelle")}
            aside={
              <Link
                href={p.projection(league.slug)}
                className="text-sm text-muted hover:text-foreground"
              >
                {t("Full simulation", "Ganze Simulation")}
              </Link>
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                title: t("Title race", "Titelrennen"),
                rows: titleRace,
                value: (r: (typeof titleRace)[number]) => r.title,
              },
              {
                title: t("Bottom 3 risk", "Risiko letzte 3"),
                rows: dropZone,
                value: (r: (typeof titleRace)[number]) => r.bottom3,
              },
            ].map((card) => (
              <div key={card.title} className="min-w-0 rounded-3xl bg-surface p-3 sm:p-4">
                <h3 className="px-2 pt-2 pb-3 font-display text-xl font-extrabold tracking-[-0.02em]">
                  {card.title}
                </h3>
                <ol className="space-y-2">
                  {card.rows.map((r) => (
                    <li key={r.team.slug}>
                      <Link
                        href={p.team(r.team.slug)}
                        className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 transition hover:shadow-sm"
                      >
                        <Crest src={r.team.crest} name={r.team.name} size={32} />
                        <span className="min-w-0 flex-1 truncate font-display font-bold">
                          {r.team.name}
                        </span>
                        <span className="tabular font-display text-lg font-extrabold">
                          {chance(card.value(r), locale)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {forecasts.length > 0 && (
        <section aria-labelledby="forecasts-heading">
          <SectionHeading
            id="forecasts-heading"
            title={t("Next matches", "Nächste Spiele")}
            aside={
              <Link href={p.predictions} className="text-sm text-muted hover:text-foreground">
                {t("All predictions", "Alle Prognosen")}
              </Link>
            }
          />
          <ForecastList forecasts={forecasts} grouped={false} locale={locale} />
        </section>
      )}

      <section aria-labelledby="table-heading">
        <SectionHeading
          id="table-heading"
          title={t("Table", "Tabelle")}
          aside={
            table && (
              <span className="text-sm text-muted">
                {t("Season", "Saison")} {seasonLabel(table.season)}
              </span>
            )
          }
        />
        {table ? (
          <>
            <StandingsTable
              rows={table.rows}
              caption={`${league.name} ${t("table", "Tabelle")}`}
              powerRanks={powerRanks}
              locale={locale}
            />
            <p className="mt-4 text-sm text-muted">
              {locale === "de"
                ? `Tabelle von football-data.org. Power # ist der Platz des Vereins im Footiqra Ranking über alle ${LEAGUES.length} Ligen.`
                : `League standings from football-data.org. Power # is the club's position in the Footiqra ranking across all ${LEAGUES.length} leagues.`}
            </p>
          </>
        ) : (
          <DataNotice
            reason={t(
              "The league table will appear after the next data update.",
              "Die Tabelle erscheint nach dem nächsten Datenupdate.",
            )}
            locale={locale}
          />
        )}
      </section>

      {performance && (
        <section aria-labelledby="performance-heading">
          <SectionHeading
            id="performance-heading"
            title={t("Table vs. strength", "Tabelle vs. Stärke")}
            aside={
              <Link href={p.tableVsStrength} className="text-sm text-muted hover:text-foreground">
                {t("All leagues", "Alle Ligen")}
              </Link>
            }
          />
          <PerformanceCards
            over={performance.over}
            under={performance.under}
            previous={weekAgo}
            locale={locale}
          />
        </section>
      )}

      <section aria-labelledby="teams-heading">
        <SectionHeading
          id="teams-heading"
          title={t("Teams by power rating", "Vereine nach Power-Rating")}
          aside={
            <Link href={p.methodology} className="text-sm text-muted hover:text-foreground">
              {t("What the numbers mean", "Was die Zahlen bedeuten")}
            </Link>
          }
        />
        {rows.length > 0 ? (
          <RankingTable
            rows={rows}
            caption={t(
              `${league.name} teams ordered by Footiqra power rating`,
              `${league.name}: Vereine nach Footiqra Power-Rating`,
            )}
            showLeague={false}
            rankLabel={t("Overall", "Gesamt")}
            locale={locale}
          />
        ) : (
          <DataNotice
            reason={
              teams.status === "ok"
                ? t("The ranking is being calculated.", "Das Ranking wird berechnet.")
                : t(teams.reason, "Es wurden noch keine Spieldaten importiert.")
            }
            locale={locale}
          />
        )}
        {teams.status === "ok" && <LastUpdated utc={teams.lastUpdatedUtc} locale={locale} />}
      </section>
    </div>
  );
}
