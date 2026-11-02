import { describe, expect, it } from "vitest";
import { extractFaq, headingId, parsePost, readingMinutes, splitFrontMatter } from "./parse";

const front = (extra = "") => `---
title: How the Footiqra Power Ranking Works
description: How Footiqra rates every club in Europe's top seven leagues on one common scale.
published: 2026-11-09
${extra}---
`;

describe("splitFrontMatter", () => {
  it("reads key: value lines and keeps colons inside values", () => {
    const { data, body } = splitFrontMatter(
      `---\ntitle: "Ranking: explained"\npublished: 2026-11-09\n---\nBody`,
    );
    expect(data).toEqual({ title: "Ranking: explained", published: "2026-11-09" });
    expect(body).toBe("Body");
  });

  it("rejects files without front matter", () => {
    expect(() => splitFrontMatter("## Just a heading")).toThrow(/front matter/);
  });
});

describe("headingId", () => {
  it("builds readable fragments", () => {
    expect(headingId("What the model can't see")).toBe("what-the-model-cant-see");
    expect(headingId("Häufige Fragen zur Ligastärke")).toBe("haufige-fragen-zur-ligastarke");
  });
});

describe("parsePost", () => {
  it("renders Markdown with heading ids, safe external links and scrollable tables", () => {
    const post = parsePost(
      `${front()}## Every club has a rating\n\nSee [the ranking](/) or [UEFA](https://www.uefa.com).\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n`,
    );
    expect(post.html).toContain('<h2 id="every-club-has-a-rating">');
    expect(post.html).toContain('<a href="/">the ranking</a>');
    expect(post.html).toContain('<a href="https://www.uefa.com" rel="noopener" target="_blank">');
    expect(post.html).toContain('<div class="blog-table"><table>');
    expect(post.updated).toBe("2026-11-09");
    expect(post.draft).toBe(false);
  });

  it("reads draft and updated", () => {
    const post = parsePost(`${front("updated: 2026-11-12\ndraft: true\n")}Text`);
    expect(post.draft).toBe(true);
    expect(post.updated).toBe("2026-11-12");
  });

  it("rejects unknown keys, bad dates and a level-1 heading in the body", () => {
    expect(() => parsePost(`${front("author: Tim\n")}Text`)).toThrow();
    expect(() => parsePost(`${front("updated: 9.11.2026\n")}Text`)).toThrow();
    expect(() => parsePost(`${front("updated: 2026-11-01\n")}Text`)).toThrow(/before published/);
    expect(() => parsePost(`${front()}# Title again\n`)).toThrow(/level-1 heading/);
  });
});

describe("extractFaq", () => {
  it("collects ### questions until the next ## section", () => {
    const faq = extractFaq(
      "## Intro\n\nText\n\n## FAQ\n\n### Which leagues are covered?\n\nSeven, see **the list**.\n\n### Is it betting advice?\n\nNo.\n\n## More\n\n### Not a question\n\nIgnored.",
    );
    expect(faq).toEqual([
      { question: "Which leagues are covered?", answer: "Seven, see the list." },
      { question: "Is it betting advice?", answer: "No." },
    ]);
  });

  it("returns nothing without an FAQ section", () => {
    expect(extractFaq("## Intro\n\n### Question?\n\nAnswer")).toEqual([]);
  });
});

describe("readingMinutes", () => {
  it("counts words at 220 per minute, at least one minute", () => {
    expect(readingMinutes("Short.")).toBe(1);
    expect(readingMinutes(Array(660).fill("word").join(" "))).toBe(3);
  });
});
