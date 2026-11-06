import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { TitleRacePanel, titleRaceSummary } from "@/components/title-race";
import { DataNotice } from "@/components/data-notice";
import { Eyebrow } from "@/components/ui";
import { LEAGUES } from "@/config/leagues";
import { getTitleRace, type TitleRace } from "@/data";
import { fmtInt, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/** Title race of all seven leagues: /title-race/ and /de/titelrennen/ */

export function titleRaceMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Title race: how title chances changed",
      "Titelrennen: Meisterchancen im Verlauf",
    ),
    description: tr(
      locale,
      "How the title chances in Europe's seven top leagues developed this season, week by week, from 10,000 simulations of every remaining match.",
      "Wie sich die Meisterchancen in Europas sieben Topligen in dieser Saison Woche für Woche entwickelt haben, aus 10.000 Simulationen aller restlichen Spiele.",
    ),
    paths: { en: paths("en").titleRace, de: paths("de").titleRace },
    image: ogImage.titleRace,
  });
}

/** Leagues with a race, closest race (lowest leader chance) first. */
export async function getAllTitleRaces(): Promise<
  { slug: string; name: string; race: TitleRace }[]
> {
  const out: { slug: string; name: string; race: TitleRace }[] = [];
  for (const l of LEAGUES) {
    const race = await getTitleRace(l.slug);
    if (race) out.push({ slug: l.slug, name: l.name, race });
  }
  const leader = (r: TitleRace) => r.series[0]?.chances.at(-1) ?? 1;
  return out.sort((a, b) => leader(a.race) - leader(b.race));
}

export async function TitleRaceView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const races = await getAllTitleRaces();
  const runs = races[0]?.race.runs ?? 10000;

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: t("Title race", "Titelrennen"), path: p.titleRace },
        ])}
      />
      <header>
        <Eyebrow>{t("Predictions", "Prognosen")}</Eyebrow>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Title race", "Titelrennen")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {t(
            `How the title chances in Europe's top leagues developed this season. Every week we replay the season as it stood then and simulate the remaining matches ${fmtInt(locale, runs)} times. The tightest races come first.`,
            `So haben sich die Meisterchancen in Europas Topligen in dieser Saison entwickelt. Für jede Woche spielen wir die Saison so nach, wie sie damals stand, und simulieren die restlichen Spiele ${fmtInt(locale, runs)}-mal. Die engsten Rennen stehen oben.`,
          )}
        </p>
      </header>

      {races.length === 0 && (
        <DataNotice
          reason={t(
            "The title race needs at least one week of results this season.",
            "Das Titelrennen braucht mindestens eine Woche mit Ergebnissen in dieser Saison.",
          )}
          locale={locale}
        />
      )}

      {races.map(({ slug, name, race }) => (
        <section key={slug} aria-labelledby={`race-${slug}`} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id={`race-${slug}`}
              className="font-display text-3xl font-extrabold tracking-[-0.03em]"
            >
              {name}
            </h2>
            <Link href={p.projection(slug)} className="text-sm font-semibold hover:underline">
              {t("Predicted final table", "Tabellenprognose")} <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="max-w-3xl text-muted">{titleRaceSummary(race, name, locale)}</p>
          <TitleRacePanel race={race} leagueName={name} locale={locale} />
        </section>
      ))}

      <section className="max-w-3xl space-y-3 text-sm text-muted">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
          {t("How the chart is made", "So entsteht die Grafik")}
        </h2>
        <p>
          {t(
            "Each point is a full replay: the ratings and the table as they stood on that Monday, every match not yet played at the time, and the same season simulation as the predicted final table. Earlier points are never revised with later results. The first point shows each league's chances before its first matchday; the last one is today's predicted table. Tables are rebuilt from results, so official point deductions are not included in earlier points. Clubs that reached a 10% title chance at any point are shown.",
            "Jeder Punkt ist eine komplette Nachrechnung: Ratings und Tabelle so, wie sie an jenem Montag standen, alle damals noch offenen Spiele und dieselbe Saisonsimulation wie bei der Prognose der Abschlusstabelle. Frühere Punkte werden nie mit späteren Ergebnissen korrigiert. Der erste Punkt zeigt die Chancen vor dem ersten Spieltag der jeweiligen Liga, der letzte die heutige Prognose. Die Tabellen werden aus den Ergebnissen berechnet, offizielle Punktabzüge fehlen in früheren Punkten daher. Angezeigt werden alle Vereine, die irgendwann eine Meisterchance von mindestens 10 % hatten.",
          )}{" "}
          <Link
            href={`${p.methodology}#simulation`}
            className="font-semibold underline underline-offset-4"
          >
            {t("Methodology", "Methodik")}
          </Link>
        </p>
      </section>
    </div>
  );
}
