import { matchMetadata, matchStaticParams, MatchView } from "@/views/match";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return matchStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return matchMetadata("de", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <MatchView locale="de" slug={(await params).slug} />;
}
