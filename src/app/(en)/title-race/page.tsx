import { titleRaceMetadata, TitleRaceView } from "@/views/title-race";

export const metadata = titleRaceMetadata("en");

export default function Page() {
  return <TitleRaceView locale="en" />;
}
