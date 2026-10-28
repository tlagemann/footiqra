import { RootShell, rootMetadata, rootViewport } from "@/views/root-layout";

export const metadata = rootMetadata("de");
export const viewport = rootViewport;

export default function GermanLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="de">{children}</RootShell>;
}
