import { predictionsMetadata, PredictionsView } from "@/views/predictions";

export const metadata = predictionsMetadata("de");

export default function Page() {
  return <PredictionsView locale="de" />;
}
