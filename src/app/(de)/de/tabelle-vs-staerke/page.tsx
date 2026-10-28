import { tableVsStrengthMetadata, TableVsStrengthView } from "@/views/table-vs-strength";

export const metadata = tableVsStrengthMetadata("de");

export default function Page() {
  return <TableVsStrengthView locale="de" />;
}
