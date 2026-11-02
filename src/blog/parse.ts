import { Marked, type Tokens } from "marked";
import { z } from "zod";

/**
 * Blog posts are Markdown files in /content/blog, one file per language:
 *
 *   content/blog/how-the-power-ranking-works.en.md
 *   content/blog/how-the-power-ranking-works.de.md   (optional translation)
 *
 * Each file starts with a front matter block of simple `key: value` lines:
 *
 *   ---
 *   title: How the Footiqra Power Ranking Works
 *   description: One or two sentences for search results and social previews.
 *   published: 2026-11-09
 *   updated: 2026-11-12        (optional)
 *   draft: true                (optional; drafts only show in `npm run dev`)
 *   ---
 *
 * The body is Markdown and starts with level-2 headings (the title is the h1).
 * A section "## FAQ" (or "## Häufige Fragen") with "### Question" headings
 * becomes FAQPage structured data.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const frontMatterSchema = z
  .object({
    title: z.string().min(1).max(90),
    description: z.string().min(50).max(180),
    published: z.string().regex(DATE, "published must be YYYY-MM-DD"),
    updated: z.string().regex(DATE, "updated must be YYYY-MM-DD").optional(),
    draft: z.enum(["true", "false"]).optional(),
  })
  .strict();

export type FrontMatter = z.infer<typeof frontMatterSchema>;

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ParsedPost {
  title: string;
  description: string;
  published: string;
  /** Last change; equals `published` when the post was never updated. */
  updated: string;
  draft: boolean;
  html: string;
  faq: FaqItem[];
  readingMinutes: number;
}

/** Splits `---` front matter from the body and reads its `key: value` lines. */
export function splitFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) throw new Error("missing front matter (--- block at the top)");
  const data: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 1) throw new Error(`invalid front matter line: "${line}"`);
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    data[key] = value;
  }
  return { data, body: text.slice(match[0].length) };
}

/** URL fragment for a heading: "What the model can't see" -> "what-the-model-cant-see". */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Markdown inline syntax removed, for plain-text uses such as structured data. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function createMarked(): Marked {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token) {
        const { depth, tokens, text } = token as Tokens.Heading;
        const level = Math.max(2, depth);
        return `<h${level} id="${headingId(plainText(text))}">${this.parser.parseInline(tokens)}</h${level}>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token) {
        const { href, title, tokens } = token as Tokens.Link;
        const inner = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
        const rel = isExternal(href) ? ' rel="noopener" target="_blank"' : "";
        return `<a href="${href}"${titleAttr}${rel}>${inner}</a>`;
      },
    },
  });
  return marked;
}

const markdown = createMarked();

export function renderMarkdown(body: string): string {
  // Wide tables scroll inside their wrapper instead of breaking the layout.
  return markdown
    .parse(body, { async: false })
    .replace(/<table>/g, '<div class="blog-table"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

const FAQ_HEADING = /^##\s+(FAQ|Häufige Fragen|Frequently asked questions)\s*$/i;

/** Question and answer pairs from the FAQ section ("### Question" + answer text). */
export function extractFaq(body: string): FaqItem[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => FAQ_HEADING.test(line.trim()));
  if (start === -1) return [];
  const items: FaqItem[] = [];
  let current: { question: string; answer: string[] } | null = null;
  const flush = () => {
    if (current && current.answer.join(" ").trim()) {
      items.push({
        question: plainText(current.question),
        answer: plainText(current.answer.join(" ")),
      });
    }
  };
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    const question = /^###\s+(.+)$/.exec(line);
    if (question) {
      flush();
      current = { question: question[1]!, answer: [] };
    } else if (current) {
      current.answer.push(line);
    }
  }
  flush();
  return items;
}

/** Minutes at 220 words per minute, at least 1. */
export function readingMinutes(body: string): number {
  const words = plainText(body.replace(/^#+\s.*$/gm, ""))
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function parsePost(raw: string): ParsedPost {
  const { data, body } = splitFrontMatter(raw);
  const front = frontMatterSchema.parse(data);
  if (/^#\s/m.test(body)) {
    throw new Error("the body must not contain a level-1 heading (# ...); the title is the h1");
  }
  if (front.updated && front.updated < front.published) {
    throw new Error("updated must not be before published");
  }
  return {
    title: front.title,
    description: front.description,
    published: front.published,
    updated: front.updated ?? front.published,
    draft: front.draft === "true",
    html: renderMarkdown(body),
    faq: extractFaq(body),
    readingMinutes: readingMinutes(body),
  };
}
