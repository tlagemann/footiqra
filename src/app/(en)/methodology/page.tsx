import { methodologyMetadata, MethodologyView } from "@/views/methodology";

export const metadata = methodologyMetadata("en");

export default function Page() {
  return <MethodologyView locale="en" />;
}
