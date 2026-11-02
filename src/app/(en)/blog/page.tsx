import { blogIndexMetadata, BlogIndexView } from "@/views/blog";

export const metadata = blogIndexMetadata("en");

export default function Page() {
  return <BlogIndexView locale="en" />;
}
