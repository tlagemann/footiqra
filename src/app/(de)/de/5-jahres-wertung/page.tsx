import { uefaRankingMetadata, UefaRankingView } from "@/views/uefa-ranking";

export function generateMetadata() {
  return uefaRankingMetadata("de");
}

export default function Page() {
  return <UefaRankingView locale="de" />;
}
