import { leagueCountryList, LEAGUES } from "@/config/leagues";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra: the leagues covered";

export default async function Image() {
  return genericOg({
    eyebrow: `${LEAGUES.length} leagues`,
    title: "Europe's top leagues on one scale",
    subtitle: `Tables, power ranking and predicted final tables for ${leagueCountryList()}.`,
  });
}
