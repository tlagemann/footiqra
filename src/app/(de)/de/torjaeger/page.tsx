import { scorersIndexMetadata, ScorersIndexView } from "@/views/scorers";

export const metadata = scorersIndexMetadata("de");

export default function Page() {
  return <ScorersIndexView locale="de" />;
}
