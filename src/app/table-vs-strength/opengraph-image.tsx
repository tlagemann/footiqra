import { getAllTableVsStrength, topAcrossLeagues } from "@/data";
import { getLeagueBySlug } from "@/config/leagues";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra: clubs punching above their weight";

export default async function Image() {
  const { over } = topAcrossLeagues(await getAllTableVsStrength(10), 3);
  return genericOg({
    eyebrow: "Table vs. strength",
    title: "Who is punching above their weight?",
    teams: over.map((g) => ({
      name: g.team.name,
      crest: g.team.crest,
      value: `+${g.gap}`,
      sub: `${getLeagueBySlug(g.leagueSlug)?.name ?? ""}`,
    })),
  });
}
