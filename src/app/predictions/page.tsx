import type { Metadata } from "next";
import Link from "next/link";
import { DataNotice } from "@/components/data-notice";
import { ForecastList } from "@/components/forecast-list";
import { JsonLd } from "@/components/json-ld";
import { LastUpdated } from "@/components/match-list";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getForecastRecord, getLastUpdated, getUpcomingForecasts, nextWindow } from "@/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Football predictions: win probabilities for the next matches",
  description:
    "Win, draw and loss probabilities for upcoming matches in the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie and Champions League, from the Footiqra rating model.",
  path: "/predictions/",
});

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function PredictionsPage() {
  const [all, record, lastUpdated] = await Promise.all([
    getUpcomingForecasts(),
    getForecastRecord(),
    getLastUpdated(),
  ]);
  const forecasts = nextWindow(all, 7);

  return (
    <div className="space-y-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Predictions", path: "/predictions/" },
        ])}
      />
      <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow>Match forecasts</Eyebrow>
          <h1 className="mt-4 font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-7xl">
            Predictions
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Win, draw and loss probabilities for the coming matches, calculated from the Footiqra
            power ratings of both clubs. Model estimates, not betting advice.
          </p>
        </div>
        {record && (
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-surface px-5 py-4">
              <dt className="text-xs font-medium text-muted">Favourite won</dt>
              <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                {pct(record.hitRate)}
              </dd>
            </div>
            <div className="rounded-3xl bg-surface px-5 py-4">
              <dt className="text-xs font-medium text-muted">Matches checked</dt>
              <dd className="tabular mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                {record.matches}
              </dd>
            </div>
          </dl>
        )}
      </header>

      <section aria-labelledby="upcoming">
        <SectionHeading
          id="upcoming"
          title="Next 7 days"
          aside={<span className="text-sm text-muted">{forecasts.length} matches</span>}
        />
        {forecasts.length > 0 ? (
          <ForecastList forecasts={forecasts} />
        ) : (
          <DataNotice reason="No upcoming matches between rated clubs are stored right now." />
        )}
      </section>

      <section aria-labelledby="how" className="max-w-3xl space-y-3 text-muted">
        <h2
          id="how"
          className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground"
        >
          How the forecasts work
        </h2>
        <p>
          The rating difference between the two clubs, plus home advantage, gives each side an
          expected score. A draw is most likely between evenly matched sides and becomes rarer the
          bigger the gap. The draw curve was fitted to this season&apos;s results.
        </p>
        {record && (
          <p>
            Checked against every rated match this season, with the ratings as they were before
            kick-off: the most likely outcome happened in {pct(record.hitRate)} of {record.matches}{" "}
            matches. Football is low scoring and draws are common, so even a good model is often
            wrong about a single match.
          </p>
        )}
        <p>
          Matches against clubs outside the covered leagues are not forecast, because those clubs
          have no rating.{" "}
          <Link href="/methodology/#forecasts" className="underline underline-offset-4">
            Full methodology
          </Link>
        </p>
      </section>
      {lastUpdated && <LastUpdated utc={lastUpdated} />}
    </div>
  );
}
