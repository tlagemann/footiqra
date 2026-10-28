import type { Metadata } from "next";
import {
  leagueStartingOffsets,
  RATING_POINTS_PER_COEFFICIENT_POINT,
  UEFA_COEFFICIENTS,
} from "@/config/league-strength";
import { getLeagueBySlug, type LeagueSlug } from "@/config/leagues";
import { ELO_V1_MODEL_ID, ELO_V1_OPTIONS } from "@/ranking";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Methodology: how the power ranking is calculated",
  description:
    "How Footiqra rates team strength across the Premier League, La Liga, Serie A, Bundesliga and Ligue 1: an Elo rating with a league strength component calibrated by European matches.",
  path: "/methodology/",
});

// All numbers on this page come from the same constants the calculation uses.
const opts = ELO_V1_OPTIONS;

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}` : String(r);
}

export default function MethodologyPage() {
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
    <article className="max-w-2xl space-y-8 leading-relaxed">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-muted">
          The Footiqra power ranking estimates how strong every team in Europe&apos;s top leagues is
          right now, on one common scale. It is based only on match results. This page documents
          exactly how it is calculated (model <code>{ELO_V1_MODEL_ID}</code>).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Team ratings</h2>
        <p>
          Every team has a rating. Before each match the model estimates each side&apos;s chance
          from the rating difference, using the standard Elo formula: a 100-point advantage
          corresponds to an expected score of about 64%. After the match, both teams move towards
          the result: the more surprising the result, the bigger the change. Whatever one team
          gains, the other loses.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Starting rating: {opts.baseRating} (plus the league offset, see below)</li>
          <li>Update step (K-factor): {opts.kFactor} rating points</li>
          <li>Home advantage: {opts.homeAdvantage} rating points</li>
          <li>
            Margin of victory: the step is multiplied by 1 for a draw or one-goal win, 1.5 for a
            two-goal win and (11 + n) / 8 for a win by n ≥ 3 goals
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Comparing leagues</h2>
        <p>
          Within a league, every team plays every other team, so ratings inside a league are well
          connected. Between leagues they are not: Bayern and Arsenal only meet in European
          competition. Domestic results alone cannot tell whether 80 points in one league are worth
          more than 80 points in another.
        </p>
        <p>
          Footiqra therefore adds a <strong>league strength</strong> value to every team&apos;s
          rating. It starts from the official UEFA association coefficients, which summarise five
          seasons of European results: each league starts {RATING_POINTS_PER_COEFFICIENT_POINT}{" "}
          rating points above or below average for every coefficient point it is above or below the
          average of all covered leagues.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Starting league strength</caption>
            <thead className="text-left text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  League
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  UEFA coefficient
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Starting strength
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.slug}>
                  <th scope="row" className="py-2 text-left font-normal">
                    {r.name}
                  </th>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {r.coefficient.toFixed(3)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{signed(r.offset)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Source:{" "}
          <a href={UEFA_COEFFICIENTS.sourceUrl} className="underline underline-offset-4">
            UEFA association club coefficients
          </a>
          , season {UEFA_COEFFICIENTS.season} (read {UEFA_COEFFICIENTS.retrieved}).
        </p>
        <p>
          The starting values are only a prior. Every match between clubs from two different leagues
          covered by Footiqra also moves the two league strengths, by {opts.leagueKFactor} points
          times the same surprise factor used for teams. Domestic matches never change league
          strength, because both teams share it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Which matches count</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>All finished league matches of the current season</li>
          <li>
            Champions League matches in which both clubs play in one of the covered leagues. Matches
            against clubs from other countries are not used, because their league strength is not
            modelled
          </li>
          <li>
            Matches decided in extra time or on penalties are not used yet; neither are cancelled or
            postponed matches
          </li>
        </ul>
        <p>
          Results come from football-data.org and are updated several times a day. The calculation
          is deterministic: the same results always produce the same ranking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Limitations</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Ratings restart at the beginning of each season. Early in a season, after only a few
            matches, they are still close to the starting values and less reliable.
          </li>
          <li>
            Only a small number of matches per season connect the leagues, so league strength moves
            slowly and relies on the UEFA starting values for a long time.
          </li>
          <li>
            The model only sees scores. Injuries, transfers, expected goals or squad rotation are
            not taken into account.
          </li>
        </ul>
      </section>
    </article>
  );
}
