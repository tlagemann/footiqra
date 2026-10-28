import { biggestMatches, getUpcomingForecasts, nextWindow } from "@/data";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra predictions: win probabilities for the next matches";

export default async function Image() {
  const big = biggestMatches(nextWindow(await getUpcomingForecasts(), 7), 1)[0];
  return genericOg({
    eyebrow: "Match forecasts",
    title: "This week's predictions",
    subtitle: big
      ? `Big game: ${big.home.name} vs ${big.away.name}. ${big.home.name} ${big.percentages.home}%, draw ${big.percentages.draw}%, ${big.away.name} ${big.percentages.away}%.`
      : "Win, draw and loss probabilities from the Footiqra rating model.",
  });
}
