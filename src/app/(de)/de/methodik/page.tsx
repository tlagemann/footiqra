import { methodologyMetadata, MethodologyView } from "@/views/methodology";

export const metadata = methodologyMetadata("de");

export default function Page() {
  return <MethodologyView locale="de" />;
}
