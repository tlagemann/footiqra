import { OG_CONTENT_TYPE, OG_SIZE } from "@/og/frame";
import { genericOg } from "@/og/templates";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Footiqra Datenschutz";

export default async function Image() {
  return genericOg({
    eyebrow: "Privacy policy",
    title: "Datenschutz",
    subtitle: "No cookies, no tracking, no third-party content.",
  });
}
