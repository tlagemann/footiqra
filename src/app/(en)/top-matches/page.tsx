import { topMatchesMetadata, TopMatchesView } from "@/views/top-matches";

export const metadata = topMatchesMetadata("en");

export default function Page() {
  return <TopMatchesView locale="en" />;
}
