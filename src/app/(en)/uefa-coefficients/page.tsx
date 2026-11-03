import { uefaRankingMetadata, UefaRankingView } from "@/views/uefa-ranking";

export function generateMetadata() {
  return uefaRankingMetadata("en");
}

export default function Page() {
  return <UefaRankingView locale="en" />;
}
