import { legalMetadata, LegalView } from "@/views/legal";

export const metadata = legalMetadata("en");

export default function Page() {
  return <LegalView locale="en" />;
}
