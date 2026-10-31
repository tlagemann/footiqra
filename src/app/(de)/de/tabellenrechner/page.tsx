import { tableCalculatorIndexMetadata, TableCalculatorIndexView } from "@/views/table-calculator";

export const metadata = tableCalculatorIndexMetadata("de");

export default function Page() {
  return <TableCalculatorIndexView locale="de" />;
}
