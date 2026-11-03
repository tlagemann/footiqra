import { titleRaceMetadata, TitleRaceView } from "@/views/title-race";

export const metadata = titleRaceMetadata("de");

export default function Page() {
  return <TitleRaceView locale="de" />;
}
