import { predictionsMetadata, PredictionsView } from "@/views/predictions";

export const metadata = predictionsMetadata("en");

export default function Page() {
  return <PredictionsView locale="en" />;
}
