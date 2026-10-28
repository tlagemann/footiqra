import { championsLeagueMetadata, ChampionsLeagueView } from "@/views/champions-league";

export const metadata = championsLeagueMetadata("de");

export default function Page() {
  return <ChampionsLeagueView locale="de" />;
}
