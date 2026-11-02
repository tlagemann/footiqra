import { blogIndexMetadata, BlogIndexView } from "@/views/blog";

export const metadata = blogIndexMetadata("de");

export default function Page() {
  return <BlogIndexView locale="de" />;
}
