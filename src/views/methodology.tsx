import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";
import {
  leagueStartingOffsets,
  RATING_POINTS_PER_COEFFICIENT_POINT,
  UEFA_COEFFICIENTS,
} from "@/config/league-strength";
import { getLeagueBySlug, type LeagueSlug } from "@/config/leagues";
import { fmtDecimal, fmtInt, fmtPercent, paths, tr, type Locale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";
import { ELO_V1_MODEL_ID, ELO_V1_OPTIONS, FORECAST_V1, SIM_V1 } from "@/ranking";

export function methodologyMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(
      locale,
      "Methodology: how the power ranking is calculated",
      "Methodik: So wird das Power-Ranking berechnet",
    ),
    description: tr(
      locale,
      "How Footiqra rates team strength across Europe's top leagues: an Elo rating with a league strength component calibrated by European matches, match forecasts and season simulations.",
      "Wie Footiqra die Stärke der Vereine in Europas Top-Ligen bewertet: ein Elo-Rating mit Ligastärke, kalibriert durch Europapokalspiele, dazu Spielprognosen und Saisonsimulationen.",
    ),
    paths: { en: paths("en").methodology, de: paths("de").methodology },
    image: ogImage.methodology,
  });
}

// All numbers on this page come from the same constants the calculation uses.
const opts = ELO_V1_OPTIONS;
const h2 = "font-display text-3xl font-extrabold tracking-[-0.03em]";

export function MethodologyView({ locale }: { locale: Locale }) {
  const de = locale === "de";
  const t = (en: string, deText: string) => tr(locale, en, deText);
  const signed = (n: number) => {
    const r = Math.round(n * 10) / 10;
    const s = fmtDecimal(locale, Math.abs(r), Number.isInteger(r) ? 0 : 1);
    return r > 0 ? `+${s}` : r < 0 ? `−${s}` : "0";
  };
  const offsets = leagueStartingOffsets();
  const rows = (Object.keys(UEFA_COEFFICIENTS.values) as LeagueSlug[])
    .map((slug) => ({
      slug,
      name: getLeagueBySlug(slug)?.name ?? slug,
      coefficient: UEFA_COEFFICIENTS.values[slug],
      offset: offsets[slug],
    }))
    .sort((a, b) => b.coefficient - a.coefficient);

  return (
    <article className="max-w-3xl space-y-12 text-lg leading-relaxed">
      <header className="space-y-5">
        <Eyebrow>
          {t("Model", "Modell")} {ELO_V1_MODEL_ID}
        </Eyebrow>
        <h1 className="font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Methodology", "Methodik")}
        </h1>
        <p className="text-xl text-muted">
          {de ? (
            <>
              Das Footiqra Power-Ranking schätzt, wie stark jeder Verein der Top-Ligen Europas
              gerade ist, und zwar auf einer gemeinsamen Skala. Es basiert ausschließlich auf
              Spielergebnissen. Diese Seite dokumentiert genau, wie es berechnet wird (Modell{" "}
              <code>{ELO_V1_MODEL_ID}</code>).
            </>
          ) : (
            <>
              The Footiqra power ranking estimates how strong every team in Europe&apos;s top
              leagues is right now, on one common scale. It is based only on match results. This
              page documents exactly how it is calculated (model <code>{ELO_V1_MODEL_ID}</code>).
            </>
          )}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className={h2}>{t("1. Team ratings", "1. Ratings der Vereine")}</h2>
        <p>
          {t(
            "Every team has a rating. Before each match the model estimates each side's chance from the rating difference, using the standard Elo formula: a 100-point advantage corresponds to an expected score of about 64%. After the match, both teams move towards the result: the more surprising the result, the bigger the change. Whatever one team gains, the other loses.",
            "Jeder Verein hat ein Rating. Vor jedem Spiel schätzt das Modell aus der Rating-Differenz die Chancen beider Seiten, mit der üblichen Elo-Formel: 100 Punkte Vorsprung entsprechen einem Erwartungswert von etwa 64 %. Nach dem Spiel bewegen sich beide Ratings in Richtung des Ergebnisses: Je überraschender das Ergebnis, desto größer die Veränderung. Was ein Team gewinnt, verliert das andere.",
          )}
        </p>
        <ul className="space-y-2 rounded-3xl bg-surface p-6 text-base">
          <li>
            {t("Starting rating", "Startwert")}: {opts.baseRating}{" "}
            {t("(plus the league offset, see below)", "(plus Ligastärke, siehe unten)")}
          </li>
          <li>
            {t("Update step (K-factor)", "Schrittweite (K-Faktor)")}: {opts.kFactor}{" "}
            {t("rating points", "Ratingpunkte")}
          </li>
          <li>
            {t("Home advantage", "Heimvorteil")}: {opts.homeAdvantage}{" "}
            {t("rating points", "Ratingpunkte")}
          </li>
          <li>
            {t(
              "Margin of victory: the step is multiplied by 1 for a draw or one-goal win, 1.5 for a two-goal win and (11 + n) / 8 for a win by n ≥ 3 goals",
              "Höhe des Sieges: Die Schrittweite wird mit 1 multipliziert bei einem Remis oder einem Sieg mit einem Tor, mit 1,5 bei zwei Toren und mit (11 + n) / 8 bei einem Sieg mit n ≥ 3 Toren",
            )}
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>{t("2. Comparing leagues", "2. Ligen vergleichen")}</h2>
        <p>
          {t(
            "Within a league, every team plays every other team, so ratings inside a league are well connected. Between leagues they are not: Bayern and Arsenal only meet in European competition. Domestic results alone cannot tell whether 80 points in one league are worth more than 80 points in another.",
            "Innerhalb einer Liga spielt jeder gegen jeden, die Ratings einer Liga sind also gut miteinander verbunden. Zwischen den Ligen nicht: Bayern und Arsenal treffen sich nur im Europapokal. Aus Ligaspielen allein lässt sich nicht ablesen, ob 80 Punkte in einer Liga mehr wert sind als 80 Punkte in einer anderen.",
          )}
        </p>
        <p>
          {de ? (
            <>
              Footiqra addiert deshalb zu jedem Rating eine <strong>Ligastärke</strong>. Sie startet
              bei den offiziellen UEFA-Verbandskoeffizienten, die fünf Saisons Europapokal
              zusammenfassen: Jede Liga startet {RATING_POINTS_PER_COEFFICIENT_POINT} Ratingpunkte
              über oder unter dem Durchschnitt für jeden Koeffizientenpunkt, den sie über oder unter
              dem Durchschnitt aller abgedeckten Ligen liegt.
            </>
          ) : (
            <>
              Footiqra therefore adds a <strong>league strength</strong> value to every team&apos;s
              rating. It starts from the official UEFA association coefficients, which summarise
              five seasons of European results: each league starts{" "}
              {RATING_POINTS_PER_COEFFICIENT_POINT} rating points above or below average for every
              coefficient point it is above or below the average of all covered leagues.
            </>
          )}
        </p>
        <div className="overflow-x-auto rounded-3xl bg-surface p-3 sm:p-4">
          <table className="w-full text-base">
            <caption className="sr-only">
              {t("Starting league strength", "Ligastärke zum Saisonstart")}
            </caption>
            <thead className="text-left text-sm text-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">
                  {t("League", "Liga")}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  {t("UEFA coefficient", "UEFA-Koeffizient")}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  {t("Starting strength", "Startwert Ligastärke")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 text-left font-semibold">
                    {r.name}
                  </th>
                  <td className="tabular px-3 py-3 text-right font-display font-bold">
                    {fmtDecimal(locale, r.coefficient, 3)}
                  </td>
                  <td className="tabular px-3 py-3 text-right font-display font-bold">
                    {signed(r.offset)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          {t("Source", "Quelle")}:{" "}
          <a href={UEFA_COEFFICIENTS.sourceUrl} className="underline underline-offset-4">
            {t("UEFA association club coefficients", "UEFA-Verbandskoeffizienten")}
          </a>
          , {t("season", "Saison")} {UEFA_COEFFICIENTS.season} ({t("read", "abgerufen")}{" "}
          {UEFA_COEFFICIENTS.retrieved}).
        </p>
        <p>
          {de
            ? `Die Startwerte sind nur eine Ausgangsannahme. Jedes Spiel zwischen Vereinen zweier verschiedener abgedeckter Ligen verschiebt auch die beiden Ligastärken, um ${opts.leagueKFactor} Punkte mal denselben Überraschungsfaktor wie bei den Vereinen. Ligaspiele verändern die Ligastärke nie, weil beide Teams sie teilen.`
            : `The starting values are only a prior. Every match between clubs from two different leagues covered by Footiqra also moves the two league strengths, by ${opts.leagueKFactor} points times the same surprise factor used for teams. Domestic matches never change league strength, because both teams share it.`}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>{t("3. Which matches count", "3. Welche Spiele zählen")}</h2>
        <ul className="list-disc space-y-2 pl-6 marker:text-brand">
          <li>
            {t(
              "All finished league matches of the current season",
              "Alle beendeten Ligaspiele der laufenden Saison",
            )}
          </li>
          <li>
            {t(
              "Champions League matches in which both clubs play in one of the covered leagues. Matches against clubs from other countries are not used, because their league strength is not modelled",
              "Champions-League-Spiele, in denen beide Vereine aus einer der abgedeckten Ligen kommen. Spiele gegen Vereine aus anderen Ländern fließen nicht ein, weil deren Ligastärke nicht modelliert ist",
            )}
          </li>
          <li>
            {t(
              "Matches decided in extra time or on penalties are not used yet; neither are cancelled or postponed matches",
              "Spiele mit Verlängerung oder Elfmeterschießen werden bisher nicht gewertet, ebenso wenig abgesagte oder verlegte Spiele",
            )}
          </li>
        </ul>
        <p>
          {t(
            "Results come from football-data.org and are updated several times a day. The calculation is deterministic: the same results always produce the same ranking.",
            "Die Ergebnisse stammen von football-data.org und werden mehrmals täglich aktualisiert. Die Berechnung ist deterministisch: Dieselben Ergebnisse ergeben immer dasselbe Ranking.",
          )}
        </p>
      </section>

      <section id="forecasts" className="scroll-mt-24 space-y-4">
        <h2 className={h2}>{t("4. Match forecasts", "4. Spielprognosen")}</h2>
        <p>
          {de ? (
            <>
              Die Prognosen nutzen dieselben Ratings (Modell <code>{FORECAST_V1.id}</code>). Aus der
              Rating-Differenz d zwischen Heim- und Gastteam, Heimvorteil inklusive, ergibt die
              Elo-Formel für das Heimteam den Erwartungswert E = 1 / (1 + 10<sup>-d/400</sup>). Ein
              Remis zählt in E als halber Sieg, die drei Wahrscheinlichkeiten sind also:
            </>
          ) : (
            <>
              Forecasts use the same ratings (model <code>{FORECAST_V1.id}</code>). From the rating
              difference d between home and away side, home advantage included, the Elo formula
              gives the home side an expected score E = 1 / (1 + 10<sup>-d/400</sup>). A draw counts
              as half a win in E, so the three probabilities are:
            </>
          )}
        </p>
        <ul className="space-y-2 rounded-3xl bg-surface p-6 text-base">
          <li>
            {t("Draw", "Remis")}: {fmtPercent(locale, FORECAST_V1.drawMax * 100)} × (1 − |2E − 1|
            <sup>{FORECAST_V1.drawShape}</sup>),{" "}
            {t("highest for evenly matched sides", "am höchsten bei gleich starken Teams")}
          </li>
          <li>{t("Home win: E − draw / 2", "Heimsieg: E − Remis / 2")}</li>
          <li>{t("Away win: 1 − E − draw / 2", "Auswärtssieg: 1 − E − Remis / 2")}</li>
          <li>
            {t("No outcome is shown below", "Kein Ausgang wird unter")}{" "}
            {fmtPercent(locale, FORECAST_V1.floor * 100)}
            {t("", " angezeigt")}
          </li>
        </ul>
        <p>
          {t(
            "The two draw parameters were fitted to this season's league and Champions League results, using the ratings each club had before kick-off. On those matches the forecasts score clearly better than always predicting the average share of home wins, draws and away wins. The forecasts are estimates for information, not betting advice.",
            "Die beiden Remis-Parameter wurden an den Liga- und Champions-League-Ergebnissen dieser Saison geeicht, jeweils mit den Ratings von vor dem Anpfiff. Auf diesen Spielen schneiden die Prognosen deutlich besser ab, als immer nur die durchschnittlichen Anteile von Heimsiegen, Remis und Auswärtssiegen vorherzusagen. Die Prognosen sind Schätzungen zur Information, keine Wettberatung.",
          )}
        </p>
      </section>

      <section id="simulation" className="scroll-mt-24 space-y-4">
        <h2 className={h2}>
          {t("5. Predicted final tables", "5. Prognose der Abschlusstabellen")}
        </h2>
        <p>
          {de ? (
            <>
              Die Tabellenprognosen (Modell <code>{SIM_V1.id}</code>) spielen den Rest jeder
              Ligasaison {fmtInt(locale, SIM_V1.runs)}-mal durch. Jede Simulation startet bei der
              offiziellen Tabelle und entscheidet jedes verbleibende Spiel zufällig mit den obigen
              Prognosewahrscheinlichkeiten. Die Tordifferenzen folgen den Ergebnissen, die in dieser
              Liga in der laufenden Saison gefallen sind.
            </>
          ) : (
            <>
              The predicted tables (model <code>{SIM_V1.id}</code>) play the rest of each league
              season {fmtInt(locale, SIM_V1.runs)} times. Every simulation starts from the official
              table and decides each remaining match at random with the forecast probabilities
              above. Winning margins follow the margins seen in that league this season.
            </>
          )}
        </p>
        <p>
          {t(
            "After each simulated match the two ratings are updated exactly like after a real result. A club that starts a simulated run well therefore also gets stronger in that run, which keeps the uncertainty about true team strength in the results. Ties on points are split by goal difference, then at random; head-to-head and other league specific tie-breakers are not modelled. The simulation uses a fixed random seed, so the same data always gives the same table.",
            "Nach jedem simulierten Spiel werden beide Ratings genau wie nach einem echten Ergebnis angepasst. Ein Verein, der in einem Durchlauf gut startet, wird in diesem Durchlauf also auch stärker; so bleibt die Unsicherheit über die wahre Stärke im Ergebnis erhalten. Bei Punktgleichheit entscheidet die Tordifferenz, danach der Zufall; direkter Vergleich und andere ligaspezifische Regeln werden nicht abgebildet. Die Simulation nutzt einen festen Zufallsstartwert, gleiche Daten ergeben also immer dieselbe Tabelle.",
          )}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>{t("6. Limitations", "6. Grenzen")}</h2>
        <ul className="list-disc space-y-2 pl-6 marker:text-brand">
          <li>
            {t(
              "Ratings restart at the beginning of each season. Early in a season, after only a few matches, they are still close to the starting values and less reliable.",
              "Die Ratings starten mit jeder Saison neu. Früh in der Saison, nach wenigen Spielen, liegen sie noch nah an den Startwerten und sind weniger verlässlich.",
            )}
          </li>
          <li>
            {t(
              "Only a small number of matches per season connect the leagues, so league strength moves slowly and relies on the UEFA starting values for a long time.",
              "Nur wenige Spiele pro Saison verbinden die Ligen. Die Ligastärke bewegt sich daher langsam und stützt sich lange auf die UEFA-Startwerte.",
            )}
          </li>
          <li>
            {t(
              "The model only sees scores. Injuries, transfers, expected goals or squad rotation are not taken into account.",
              "Das Modell sieht nur Ergebnisse. Verletzungen, Transfers, Expected Goals oder Rotation fließen nicht ein.",
            )}
          </li>
        </ul>
      </section>
    </article>
  );
}
