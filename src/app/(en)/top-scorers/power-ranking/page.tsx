import { scorerIndexMetadata, ScorerIndexView } from "@/views/scorer-index";

export const metadata = scorerIndexMetadata("en");

export default function Page() {
  return <ScorerIndexView locale="en" />;
}
