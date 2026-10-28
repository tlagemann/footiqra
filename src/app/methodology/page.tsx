import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Methodology: how the power ranking is calculated",
  description:
    "How Footiqra rates team strength across the Premier League, La Liga, Serie A, Bundesliga and Ligue 1.",
  path: "/methodology/",
});

export default function MethodologyPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="text-muted">
        This page will explain how the Footiqra power ranking is calculated, which data it uses and
        how often it is updated. The methodology is being finalised; details will be published here
        before the first ranking goes live.
      </p>
    </article>
  );
}
