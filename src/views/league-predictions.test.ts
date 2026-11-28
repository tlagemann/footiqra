import { describe, expect, it } from "vitest";
import type { MatchForecast } from "@/data/forecasts";
import { nextMatchdays } from "./league-predictions";

let id = 0;
const fc = (matchday: number, utcDate: string) =>
  ({ id: ++id, matchday, utcDate, leagueSlug: "la-liga" }) as unknown as MatchForecast;
const round = (matchday: number, day: string, n = 10) =>
  Array.from({ length: n }, (_, i) => fc(matchday, `${day}T${String(12 + (i % 9)).padStart(2, "0")}:00:00Z`));

describe("nextMatchdays", () => {
  it("does not let matches brought forward pull a later round to the front", () => {
    const data = [
      ...round(14, "2026-11-28"),
      ...round(15, "2026-12-05"),
      ...round(16, "2026-12-12"),
      // Two matches of round 23 brought forward, the rest in February.
      fc(23, "2026-12-02T18:00:00Z"),
      fc(23, "2026-12-02T20:30:00Z"),
      ...round(23, "2027-02-07", 8),
      // Postponed match of round 8.
      fc(8, "2026-12-09T19:00:00Z"),
    ];
    const rounds = nextMatchdays(data, "la-liga");
    expect(rounds.map((r) => r.matchday)).toEqual([14, 15]);
    // The two early round-23 matches are shown with round 15 (2 Dec falls before its end).
    const r15 = rounds[1]!.forecasts;
    expect(r15).toHaveLength(12);
    expect(r15.filter((f) => f.matchday === 23)).toHaveLength(2);
    expect(r15.some((f) => f.matchday === 8)).toBe(false);
    expect(rounds[0]!.forecasts).toHaveLength(10);
  });
});
