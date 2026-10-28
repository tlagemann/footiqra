import { getLeagueBySlug } from "@/config/leagues";
import { getAllTeamSlugs, getLeagueTable, getTeam, getTeamRanking } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg, teamOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra team card: power rank, rating and form";

export async function generateStaticParams() {
  const slugs = await getAllTeamSlugs();
  return (slugs.length > 0 ? slugs : ["no-teams-yet"]).map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getTeam(slug);
  if (result.status !== "ok") return genericOg({ eyebrow: "Teams", title: "Footiqra" });
  const team = result.data.team;
  const [ranking, table] = await Promise.all([
    getTeamRanking(slug),
    getLeagueTable(team.leagueSlug),
  ]);
  return teamOg({
    name: team.name,
    crest: team.crest,
    league: getLeagueBySlug(team.leagueSlug)?.name ?? "Europe",
    rank: ranking?.rank ?? null,
    rating: ranking?.rating ?? null,
    tablePosition: table?.rows.find((r) => r.team.slug === team.slug)?.position ?? null,
    form: ranking?.form ?? [],
  });
}
