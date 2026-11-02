import { blogPostMetadata, blogStaticParams, BlogPostView } from "@/views/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogStaticParams("en");
}

export async function generateMetadata({ params }: Props) {
  return blogPostMetadata("en", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <BlogPostView locale="en" slug={(await params).slug} />;
}
