import { tableCalculatorIndexMetadata, TableCalculatorIndexView } from "@/views/table-calculator";

export const metadata = tableCalculatorIndexMetadata("en");

export default function Page() {
  return <TableCalculatorIndexView locale="en" />;
}
