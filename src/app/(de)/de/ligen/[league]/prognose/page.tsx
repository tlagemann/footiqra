import { projectionMetadata, projectionStaticParams, ProjectionView } from "@/views/projection";

type Props = { params: Promise<{ league: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projectionStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return projectionMetadata("de", (await params).league);
}

export default async function Page({ params }: Props) {
  return <ProjectionView locale="de" slug={(await params).league} />;
}
