import { tableVsStrengthMetadata, TableVsStrengthView } from "@/views/table-vs-strength";

export const metadata = tableVsStrengthMetadata("en");

export default function Page() {
  return <TableVsStrengthView locale="en" />;
}
