import { scorerIndexMetadata, ScorerIndexView } from "@/views/scorer-index";

export const metadata = scorerIndexMetadata("de");

export default function Page() {
  return <ScorerIndexView locale="de" />;
}
