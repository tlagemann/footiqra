import {
  tableCalculatorMetadata,
  tableCalculatorStaticParams,
  TableCalculatorView,
} from "@/views/table-calculator";

type Props = { params: Promise<{ league: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tableCalculatorStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return tableCalculatorMetadata("en", (await params).league);
}

export default async function Page({ params }: Props) {
  return <TableCalculatorView locale="en" slug={(await params).league} />;
}
