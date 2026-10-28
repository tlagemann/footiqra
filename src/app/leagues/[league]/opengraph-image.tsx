import { getLeagueBySlug, LEAGUES } from "@/config/leagues";
import { getLeagueTable, getPowerRanking } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra league card: table leaders and strongest clubs";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ league: l.slug }));
}

export default async function Image({ params }: { params: Promise<{ league: string }> }) {
  const league = getLeagueBySlug((await params).league)!;
  const [ranking, table] = await Promise.all([getPowerRanking(), getLeagueTable(league.slug)]);
  const rows =
    ranking.status === "ok"
      ? ranking.data.rows.filter((r) => r.team.leagueSlug === league.slug)
      : [];
  return genericOg({
    eyebrow: league.country,
    title: league.name,
    subtitle: table
      ? `Table, power ranking and predictions. Leader: ${table.rows[0]?.team.name} with ${table.rows[0]?.points} points.`
      : "Table, power ranking and predictions.",
    teams: rows.slice(0, 3).map((r, i) => ({
      name: r.team.shortName || r.team.name,
      crest: r.team.crest,
      value: String(Math.round(r.rating)),
      sub: `#${i + 1} by strength`,
    })),
  });
}
