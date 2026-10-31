import { describe, expect, it } from "vitest";
import { tipFor } from "./table-calculator";

const rates = { home: 1.6, away: 1.3 };

describe("tipFor", () => {
  it("lets a clear favourite win", () => {
    const { tip } = tipFor(300, rates);
    expect(tip.home).toBeGreaterThan(tip.away);
    const away = tipFor(-300, rates).tip;
    expect(away.away).toBeGreaterThan(away.home);
  });

  it("returns probabilities that add up to one", () => {
    const { probabilities: p } = tipFor(40, rates);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
  });
});
