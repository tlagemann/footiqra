import { privacyMetadata, PrivacyView } from "@/views/privacy";

export const metadata = privacyMetadata("de");

export default function Page() {
  return <PrivacyView locale="de" />;
}
