import { blogPostMetadata, blogStaticParams, BlogPostView } from "@/views/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogStaticParams("de");
}

export async function generateMetadata({ params }: Props) {
  return blogPostMetadata("de", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <BlogPostView locale="de" slug={(await params).slug} />;
}
