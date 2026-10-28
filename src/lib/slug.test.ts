import { describe, expect, it } from "vitest";
import { slugify, uniqueSlugs } from "./slug";

describe("slugify", () => {
  it("strips diacritics and punctuation", () => {
    expect(slugify("Atlético Madrid")).toBe("atletico-madrid");
    expect(slugify("1. FC Köln")).toBe("1-fc-koln");
    expect(slugify("  Brighton & Hove Albion ")).toBe("brighton-and-hove-albion");
  });

  it("handles German sharp s", () => {
    expect(slugify("Straße")).toBe("strasse");
  });
});

describe("uniqueSlugs", () => {
  it("suffixes duplicates deterministically", () => {
    expect(uniqueSlugs(["Test FC", "Test-FC", "Other"])).toEqual(["test-fc", "test-fc-2", "other"]);
  });
});
