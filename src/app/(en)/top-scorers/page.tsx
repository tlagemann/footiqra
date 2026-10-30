import { scorersIndexMetadata, ScorersIndexView } from "@/views/scorers";

export const metadata = scorersIndexMetadata("en");

export default function Page() {
  return <ScorersIndexView locale="en" />;
}
