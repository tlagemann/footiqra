import { describe, expect, it } from "vitest";
import { documentTitle } from "./seo";

describe("documentTitle", () => {
  it("keeps the brand template when the full title fits", () => {
    expect(documentTitle("Methodology")).toBe("Methodology");
  });

  it("drops the brand suffix for long titles", () => {
    const long = "Premier League 2026/27 predicted table and title chances";
    expect(documentTitle(long)).toEqual({ absolute: long });
  });
});
