import { getChampionsLeague } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra Champions League: table and predictions";

export default async function Image() {
  const cl = await getChampionsLeague();
  return genericOg({
    eyebrow: "Europe",
    title: "Champions League",
    subtitle: "League phase table, predictions and the strongest clubs",
    teams: (cl.table?.rows.slice(0, 3) ?? []).map((r) => ({
      name: r.team.name,
      crest: r.team.crest,
      value: `${r.points} pts`,
      sub: `${r.position}. in the league phase`,
    })),
  });
}
