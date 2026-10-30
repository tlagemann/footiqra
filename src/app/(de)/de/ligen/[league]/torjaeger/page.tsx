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
  return leagueScorersMetadata("de", (await params).league);
}

export default async function Page({ params }: Props) {
  return <LeagueScorersView locale="de" slug={(await params).league} />;
}
