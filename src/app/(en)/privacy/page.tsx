import { privacyMetadata, PrivacyView } from "@/views/privacy";

export const metadata = privacyMetadata("en");

export default function Page() {
  return <PrivacyView locale="en" />;
}
