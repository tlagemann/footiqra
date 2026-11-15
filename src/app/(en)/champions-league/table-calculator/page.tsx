import {
  championsLeagueCalculatorMetadata,
  ChampionsLeagueCalculatorView,
} from "@/views/table-calculator";

export async function generateMetadata() {
  return championsLeagueCalculatorMetadata("en");
}

export default function Page() {
  return <ChampionsLeagueCalculatorView locale="en" />;
}
