import {
  leaguePredictionsMetadata,
  leaguePredictionsStaticParams,
  LeaguePredictionsView,
} from "@/views/league-predictions";

type Props = { params: Promise<{ league: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return leaguePredictionsStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return leaguePredictionsMetadata("de", (await params).league);
}

export default async function Page({ params }: Props) {
  return <LeaguePredictionsView locale="de" slug={(await params).league} />;
}
