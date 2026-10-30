import { topMatchesMetadata, TopMatchesView } from "@/views/top-matches";

export const metadata = topMatchesMetadata("de");

export default function Page() {
  return <TopMatchesView locale="de" />;
}
