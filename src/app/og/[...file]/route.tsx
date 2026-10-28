import { ogParams, renderOgImage } from "@/og/images";

/** Social preview images, generated at build time: /og/home.png, /og/team/{slug}.png, ... */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ogParams();
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string[] }> }) {
  const image = await renderOgImage((await params).file);
  return image ?? new Response("Not found", { status: 404 });
}
