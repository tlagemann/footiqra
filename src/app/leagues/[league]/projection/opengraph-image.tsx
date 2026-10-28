import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLeagueProjection } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra predicted final table: title chances";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ league: l.slug }));
}

const pct = (p: number) => (p < 0.005 ? "<1%" : `${Math.round(p * 100)}%`);

export default async function Image({ params }: { params: Promise<{ league: string }> }) {
  const league = getLeagueBySlug((await params).league)!;
  const projection = await getLeagueProjection(league.slug);
  const contenders = [...(projection?.rows ?? [])].sort((a, b) => b.title - a.title).slice(0, 3);
  return genericOg({
    eyebrow: `${league.name} · predicted table`,
    title: `Who wins the ${league.name}?`,
    subtitle: projection
      ? `Title chances from ${projection.runs.toLocaleString("en-GB")} simulated seasons`
      : undefined,
    teams: contenders.map((r) => ({
      name: r.team.name,
      crest: r.team.crest,
      value: pct(r.title),
      sub: `${Math.round(r.expectedPoints)} expected points`,
    })),
  });
}
