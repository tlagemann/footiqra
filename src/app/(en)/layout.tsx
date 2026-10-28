import { RootShell, rootMetadata, rootViewport } from "@/views/root-layout";

export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
