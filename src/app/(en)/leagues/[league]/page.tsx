import { leagueMetadata, leagueStaticParams, LeagueView } from "@/views/league";

type Props = { params: Promise<{ league: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return leagueStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return leagueMetadata("en", (await params).league);
}

export default async function Page({ params }: Props) {
  return <LeagueView locale="en" slug={(await params).league} />;
}
