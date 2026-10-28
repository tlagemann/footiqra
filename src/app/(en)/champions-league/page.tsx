import { championsLeagueMetadata, ChampionsLeagueView } from "@/views/champions-league";

export const metadata = championsLeagueMetadata("en");

export default function Page() {
  return <ChampionsLeagueView locale="en" />;
}
