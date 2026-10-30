import {
  leagueScorersMetadata,
  leagueScorersStaticParams,
  LeagueScorersView,
} from "@/views/scorers";

type Props = { params: Promise<{ league: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return leagueScorersStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return leagueScorersMetadata("en", (await params).league);
}

export default async function Page({ params }: Props) {
  return <LeagueScorersView locale="en" slug={(await params).league} />;
}
