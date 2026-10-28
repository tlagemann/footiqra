import { getPowerRanking } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra: one power ranking for Europe's top football leagues";

export default async function Image() {
  const ranking = await getPowerRanking();
  const top = ranking.status === "ok" ? ranking.data.rows.slice(0, 3) : [];
  return genericOg({
    eyebrow: "Cross-league power ranking",
    title: "Every top club. One ranking.",
    teams: top.map((r) => ({
      name: r.team.shortName || r.team.name,
      crest: r.team.crest,
      value: `#${r.rank}`,
      sub: `Rating ${Math.round(r.rating)}`,
    })),
  });
}
