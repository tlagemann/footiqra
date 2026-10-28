import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { chance } from "@/components/projection-table";
import { Crest, Eyebrow } from "@/components/ui";
import { leagueCountryList, LEAGUES } from "@/config/leagues";
import { getLeagueProjection, getPowerRanking } from "@/data";
import { country, paths, signed, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function leaguesMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Football leagues in the power ranking", "Fußballligen im Power-Ranking"),
    description: tr(
      locale,
      "The seven European football leagues in the Footiqra power ranking: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie.",
      "Die sieben europäischen Fußballligen im Footiqra Power-Ranking: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga und Eredivisie.",
    ),
    paths: { en: paths("en").leagues, de: paths("de").leagues },
    image: ogImage.leagues,
  });
}

export async function LeaguesView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const ranking = await getPowerRanking();
  const strengthBySlug = new Map(
    ranking.status === "ok" ? ranking.data.leagues.map((l) => [l.leagueSlug, l]) : [],
  );
  const leaderBySlug = new Map(
    ranking.status === "ok"
      ? LEAGUES.map((l) => [l.slug, ranking.data.rows.find((r) => r.team.leagueSlug === l.slug)])
      : [],
  );
  const projections = new Map(
    await Promise.all(
      LEAGUES.map(async (l) => [l.slug, await getLeagueProjection(l.slug)] as const),
    ),
  );
  const leagues = [...LEAGUES].sort(
    (a, b) =>
      (strengthBySlug.get(b.slug)?.currentAdjustment ?? 0) -
      (strengthBySlug.get(a.slug)?.currentAdjustment ?? 0),
  );

  return (
    <div className="space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Leagues", "Ligen"), path: p.leagues },
        ])}
      />
      <header>
        <Eyebrow>
          {LEAGUES.length} {t("leagues", "Ligen")}
        </Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Leagues", "Ligen")}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          {locale === "de"
            ? `Footiqra deckt die höchsten Spielklassen in ${leagueCountryList(locale)} ab, sortiert nach aktueller Ligastärke.`
            : `Footiqra covers the top divisions of ${leagueCountryList(locale)}, sorted by current league strength.`}
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => {
          const strength = strengthBySlug.get(league.slug);
          const leader = leaderBySlug.get(league.slug);
          const favourite = projections
            .get(league.slug)
            ?.rows.reduce((a, b) => (b.title > a.title ? b : a));
          return (
            <li
              key={league.slug}
              className="relative flex h-full flex-col justify-between gap-8 rounded-3xl bg-surface p-6 transition hover:bg-surface-strong"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">
                    {country(locale, league.country)}
                  </p>
                  <Link
                    href={p.league(league.slug)}
                    className="mt-1 block font-display text-2xl font-extrabold tracking-[-0.03em] after:absolute after:inset-0 after:rounded-3xl"
                  >
                    {league.name}
                  </Link>
                </div>
                {strength && (
                  <span className="tabular rounded-full bg-background px-3 py-1 font-display text-sm font-bold">
                    {signed(strength.currentAdjustment)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {leader && (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Crest src={leader.team.crest} name={leader.team.name} size={28} />
                    <div className="min-w-0 text-sm">
                      <p className="text-muted">{t("Strongest", "Stärkster")}</p>
                      <p className="truncate font-semibold">
                        {leader.team.shortName || leader.team.name}
                      </p>
                    </div>
                  </div>
                )}
                {favourite && (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Crest src={favourite.team.crest} name={favourite.team.name} size={28} />
                    <div className="min-w-0 text-sm">
                      <p className="text-muted">{t("Title favourite", "Titelfavorit")}</p>
                      <p className="truncate font-semibold">
                        {favourite.team.name}{" "}
                        <span className="tabular text-brand-ink">
                          {chance(favourite.title, locale)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {favourite && (
                <Link
                  href={p.projection(league.slug)}
                  className="relative z-10 self-start rounded-full bg-background px-4 py-2 text-sm font-semibold transition hover:bg-foreground hover:text-inverse"
                >
                  {t("Predicted final table", "Prognose Abschlusstabelle")}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <section aria-labelledby="europe">
        <h2 id="europe" className="mb-4 font-display text-3xl font-extrabold tracking-[-0.035em]">
          {t("European competition", "Europapokal")}
        </h2>
        <Link
          href={p.championsLeague}
          className="flex flex-col justify-between gap-6 rounded-3xl bg-foreground p-6 text-inverse transition hover:opacity-90 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-sm font-medium opacity-70">{t("Europe", "Europa")}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-[-0.03em]">
              Champions League
            </p>
          </div>
          <p className="max-w-sm text-sm opacity-70">
            {t(
              "League phase table, forecasts for matches between covered clubs and the strongest teams in the competition.",
              "Tabelle der Ligaphase, Prognosen für Spiele zwischen abgedeckten Vereinen und die stärksten Teams im Wettbewerb.",
            )}
          </p>
        </Link>
      </section>
    </div>
  );
}
