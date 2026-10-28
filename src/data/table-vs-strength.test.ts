import { describe, expect, it } from "vitest";
import type { PowerRankingRow } from "./power-ranking";
import type { LeagueTable, TableRow } from "./repository";
import { highlights, tableVsStrength, topAcrossLeagues } from "./table-vs-strength";

// Fictional teams, not real data.
const tableRow = (position: number, slug: string | null, points: number): TableRow => ({
  position,
  team: { slug, name: slug ?? "Unknown", crest: null },
  playedGames: 9,
  won: 0,
  draw: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points,
  form: [],
});

const rankingRow = (
  slug: string,
  rating: number,
  leagueSlug = "premier-league",
): PowerRankingRow => ({
  rank: 0,
  rating,
  matchesPlayed: 9,
  form: [],
  team: { id: 0, slug, name: slug, shortName: null, crest: null, leagueSlug },
});

const table: LeagueTable = {
  season: 2026,
  fetchedUtc: "2026-10-01T00:00:00.000Z",
  rows: [
    tableRow(1, "a", 25),
    tableRow(2, "b", 22),
    tableRow(3, null, 20), // not resolvable, ignored
    tableRow(4, "c", 18),
    tableRow(5, "d", 15),
    tableRow(6, "e", 10),
  ],
};

const ranking = [
  rankingRow("d", 1600),
  rankingRow("b", 1580),
  rankingRow("e", 1560),
  rankingRow("c", 1520),
  rankingRow("a", 1500),
  rankingRow("x", 1700, "bundesliga"), // other league
];

describe("tableVsStrength", () => {
  it("compares table and strength positions among clubs present in both", () => {
    const gaps = tableVsStrength("premier-league", table, ranking);
    expect(gaps.map((g) => [g.team.slug, g.tablePosition, g.strengthPosition, g.gap])).toEqual([
      ["a", 1, 5, 4],
      ["b", 2, 2, 0],
      ["c", 3, 4, 1],
      ["d", 4, 1, -3],
      ["e", 5, 3, -2],
    ]);
  });

  it("highlights only clear gaps, biggest first", () => {
    const { over, under } = highlights(tableVsStrength("premier-league", table, ranking));
    expect(over.map((g) => g.team.slug)).toEqual(["a"]);
    expect(under.map((g) => g.team.slug)).toEqual(["d", "e"]);
  });

  it("returns nothing for a league without rated clubs", () => {
    expect(tableVsStrength("serie-a", table, ranking)).toEqual([]);
  });
});

describe("topAcrossLeagues", () => {
  it("merges leagues and keeps the biggest gaps", () => {
    const gaps = highlights(tableVsStrength("premier-league", table, ranking));
    const merged = topAcrossLeagues([gaps, { over: [], under: [] }], 1);
    expect(merged.over.map((g) => g.team.slug)).toEqual(["a"]);
    expect(merged.under.map((g) => g.team.slug)).toEqual(["d"]);
  });
});
