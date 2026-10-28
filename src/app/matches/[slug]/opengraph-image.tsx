import { getAllMatchSlugs, getMatch } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg, matchOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra match card: forecast or result";

export async function generateStaticParams() {
  const slugs = await getAllMatchSlugs();
  return (slugs.length > 0 ? slugs : ["no-matches-yet"]).map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const m = await getMatch((await params).slug);
  if (!m) return genericOg({ eyebrow: "Matches", title: "Footiqra" });
  const finished = m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;
  return matchOg({
    competition: m.competitionName,
    dateLabel: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(m.utcDate)),
    home: { name: m.home.shortName, crest: m.home.crest },
    away: { name: m.away.shortName, crest: m.away.crest },
    score: finished ? `${m.homeGoals}:${m.awayGoals}` : null,
    percentages: m.forecast?.percentages ?? null,
    forecastLabel:
      m.forecast?.basis === "pre-match"
        ? "Pre-match forecast by the Footiqra model"
        : "Forecast by the Footiqra model, not betting advice",
  });
}
