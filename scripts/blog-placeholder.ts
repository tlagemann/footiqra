/**
 * Post-build step: removes the placeholder page that the blog post route renders
 * while a language has no posts yet (see BLOG_PLACEHOLDER_SLUG in src/blog/posts.ts).
 */
import { existsSync, rmSync } from "node:fs";

const SLUG = "_none";

for (const dir of [`out/blog/${SLUG}`, `out/de/blog/${SLUG}`]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
    console.info(`Removed blog placeholder ${dir}.`);
  }
}
