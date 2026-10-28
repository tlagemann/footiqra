import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "How the Footiqra power ranking works";

export default async function Image() {
  return genericOg({
    eyebrow: "Methodology",
    title: "How the ranking works",
    subtitle:
      "Elo ratings with home advantage and margin of victory, league strength from UEFA coefficients and European results, match forecasts and season simulations.",
  });
}
