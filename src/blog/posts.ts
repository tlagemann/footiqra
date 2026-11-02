import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Locale } from "@/i18n";
import { parsePost, type ParsedPost } from "./parse";

export type { FaqItem } from "./parse";

export interface BlogPost extends ParsedPost {
  slug: string;
  locale: Locale;
}

const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|de)\.md$/;

/** Folder with the Markdown files. Outside /src, so new posts do not change the build id. */
export function blogDir(root: string = process.cwd()): string {
  return path.join(root, "content", "blog");
}

/** Drafts show in `npm run dev` only, never in the production build. */
function includeDrafts(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Reads and validates every post. Invalid files fail the build with the file name. */
export function readAllPosts(dir: string = blogDir()): BlogPost[] {
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const posts: BlogPost[] = [];
  for (const file of files.sort()) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const match = FILE.exec(file);
    if (!match) {
      throw new Error(`Blog file "${file}": name must be <slug>.en.md or <slug>.de.md`);
    }
    try {
      const parsed = parsePost(readFileSync(path.join(dir, file), "utf8"));
      posts.push({ ...parsed, slug: match[1]!, locale: match[2] as Locale });
    } catch (error) {
      throw new Error(`Blog file "${file}": ${(error as Error).message}`);
    }
  }
  return posts;
}

/**
 * With `output: "export"` a dynamic route must produce at least one page. While a
 * language has no posts, the route renders this placeholder (a 404 page), and
 * scripts/blog-placeholder.ts deletes it from out/ after the build.
 */
export const BLOG_PLACEHOLDER_SLUG = "_none";

let cache: BlogPost[] | null = null;

function visiblePosts(): BlogPost[] {
  // No cache in development, so edits show up on reload.
  if (includeDrafts()) return readAllPosts();
  cache ??= readAllPosts().filter((post) => !post.draft);
  return cache;
}

/** Posts of one language, newest first. */
export function getBlogPosts(locale: Locale): BlogPost[] {
  return visiblePosts()
    .filter((post) => post.locale === locale)
    .sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
}

export function getBlogPost(locale: Locale, slug: string): BlogPost | null {
  return visiblePosts().find((post) => post.locale === locale && post.slug === slug) ?? null;
}

/** Slugs that exist in both languages (these get hreflang and a direct language switch). */
export function translatedBlogSlugs(): string[] {
  const posts = visiblePosts();
  return posts
    .filter((post) => post.locale === "en")
    .map((post) => post.slug)
    .filter((slug) => posts.some((post) => post.locale === "de" && post.slug === slug));
}

/** Whether the blog has at least one published post (in any language). */
export function hasBlogPosts(): boolean {
  return visiblePosts().length > 0;
}
