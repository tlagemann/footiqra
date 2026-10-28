import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataNotice } from "@/components/data-notice";
import { getAllTeamSlugs, getTeam } from "@/data";
import { pageMetadata } from "@/lib/seo";

/**
 * Team profiles: /teams/{slug}/
 * Slugs come from the database. Unknown slugs return 404 so search engines
 * never see empty profile pages.
 */
export const dynamicParams = false;

/**
 * A static export (`output: "export"`) refuses dynamic routes with zero params.
 * While no teams exist yet (Phase 1), this single noindex placeholder keeps the
 * static build working. It is excluded from the sitemap and disappears as soon
 * as real teams are available.
 */
const NO_TEAMS_PLACEHOLDER = "no-teams-yet";

export async function generateStaticParams() {
  const slugs = await getAllTeamSlugs();
  return (slugs.length > 0 ? slugs : [NO_TEAMS_PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/teams/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return pageMetadata({
      title: "Teams",
      description: "Team profiles are not available yet.",
      path: `/teams/${slug}/`,
      noIndex: true,
    });
  }
  const result = await getTeam(slug);
  if (result.status !== "ok") return {};
  const team = result.data;
  return pageMetadata({
    title: `${team.name}: power rating, form and results`,
    description: `How strong is ${team.name}? Rating, ranking history and recent results on Footiqra.`,
    path: `/teams/${team.slug}/`,
  });
}

export default async function TeamPage({ params }: PageProps<"/teams/[slug]">) {
  const { slug } = await params;
  if (slug === NO_TEAMS_PLACEHOLDER) {
    return <DataNotice title="No team profiles yet" reason="Team data has not been imported." />;
  }

  const result = await getTeam(slug);
  if (result.status !== "ok") notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{result.data.name}</h1>
      {/* Phase 2: rating, rank history, form curve, recent results */}
    </div>
  );
}
