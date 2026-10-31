import { describe, expect, it } from "vitest";
import { counterpart, fmtChance, fmtInt, ordinal, paths, signed } from "./index";

describe("paths", () => {
  it("builds English paths at the root and German paths under /de/", () => {
    expect(paths("en").projection("bundesliga")).toBe("/leagues/bundesliga/projection/");
    expect(paths("de").projection("bundesliga")).toBe("/de/ligen/bundesliga/prognose/");
    expect(paths("de").team("fc-bayern-munchen")).toBe("/de/vereine/fc-bayern-munchen/");
    expect(paths("de").home).toBe("/de/");
  });
});

describe("counterpart", () => {
  const cases: [string, string][] = [
    ["/", "/de/"],
    ["/leagues/", "/de/ligen/"],
    ["/leagues/serie-a/", "/de/ligen/serie-a/"],
    ["/leagues/serie-a/projection/", "/de/ligen/serie-a/prognose/"],
    ["/teams/arsenal-fc/", "/de/vereine/arsenal-fc/"],
    ["/matches/a-vs-b-2026-27/", "/de/spiele/a-vs-b-2026-27/"],
    ["/leagues/serie-a/top-scorers/", "/de/ligen/serie-a/torjaeger/"],
    ["/top-scorers/", "/de/torjaeger/"],
    ["/table-calculator/", "/de/tabellenrechner/"],
    ["/leagues/serie-a/table-calculator/", "/de/ligen/serie-a/tabellenrechner/"],
    ["/top-scorers/power-ranking/", "/de/torjaeger/power-ranking/"],
    ["/top-matches/", "/de/topspiele/"],
    ["/predictions/", "/de/prognosen/"],
    ["/table-vs-strength/", "/de/tabelle-vs-staerke/"],
    ["/methodology/", "/de/methodik/"],
    ["/champions-league/", "/de/champions-league/"],
    ["/legal-notice/", "/de/impressum/"],
    ["/privacy/", "/de/datenschutz/"],
  ];
  it.each(cases)("%s <-> %s", (en, de) => {
    expect(counterpart(en, "de")).toBe(de);
    expect(counterpart(de, "en")).toBe(en);
  });
  it("falls back to the home page for unknown paths", () => {
    expect(counterpart("/nope/", "de")).toBe("/de/");
  });
});

describe("formatting", () => {
  it("formats numbers per language", () => {
    expect(fmtInt("en", 10000)).toBe("10,000");
    expect(fmtInt("de", 10000)).toBe("10.000");
    expect(ordinal("en", 2)).toBe("2nd");
    expect(ordinal("en", 13)).toBe("13th");
    expect(ordinal("de", 2)).toBe("2.");
    expect(fmtChance("en", 0.356)).toBe("36%");
    expect(fmtChance("de", 0.356)).toBe("36 %");
    expect(fmtChance("en", 0.001)).toBe("<1%");
    expect(signed(4.4)).toBe("+4");
    expect(signed(-2.6)).toBe("−3");
    expect(signed(16.94, 1, "de")).toBe("+16,9");
  });
});
