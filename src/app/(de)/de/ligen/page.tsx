import { leaguesMetadata, LeaguesView } from "@/views/leagues";

export const metadata = leaguesMetadata("de");

export default function Page() {
  return <LeaguesView locale="de" />;
}
