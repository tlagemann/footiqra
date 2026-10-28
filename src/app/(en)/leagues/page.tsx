import { leaguesMetadata, LeaguesView } from "@/views/leagues";

export const metadata = leaguesMetadata("en");

export default function Page() {
  return <LeaguesView locale="en" />;
}
