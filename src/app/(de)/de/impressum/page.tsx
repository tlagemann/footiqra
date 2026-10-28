import { legalMetadata, LegalView } from "@/views/legal";

export const metadata = legalMetadata("de");

export default function Page() {
  return <LegalView locale="de" />;
}
