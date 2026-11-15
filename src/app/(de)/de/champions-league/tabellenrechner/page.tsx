import {
  championsLeagueCalculatorMetadata,
  ChampionsLeagueCalculatorView,
} from "@/views/table-calculator";

export async function generateMetadata() {
  return championsLeagueCalculatorMetadata("de");
}

export default function Page() {
  return <ChampionsLeagueCalculatorView locale="de" />;
}
