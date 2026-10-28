import { teamMetadata, teamStaticParams, TeamView } from "@/views/team";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return teamStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return teamMetadata("en", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <TeamView locale="en" slug={(await params).slug} />;
}
