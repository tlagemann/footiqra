import { homeMetadata, HomeView } from "@/views/home";

export const metadata = homeMetadata("de");

export default function Page() {
  return <HomeView locale="de" />;
}
