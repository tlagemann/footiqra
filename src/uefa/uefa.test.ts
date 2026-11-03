import { describe, expect, it } from "vitest";
import { computeRanking, computeSeason } from "./compute";
import type { UefaDataError } from "./parse";
import {
  clubKey,
  parseAssociations,
  parseClubs,
  parseCsv,
  parseHistory,
  parseLeaguePhase,
  parseMatches,
} from "./parse";
import { leaguePhaseBonus, matchPoints, truncate3 } from "./rules";

describe("rules", () => {
  it("halves match points in qualifying", () => {
    expect(matchPoints("LP", 2, 1)).toBe(2);
    expect(matchPoints("KPO", 1, 1)).toBe(1);
    expect(matchPoints("Q2", 3, 0)).toBe(1);
    expect(matchPoints("PO", 0, 0)).toBe(0.5);
    expect(matchPoints("F", 0, 1)).toBe(0);
  });

  it("gives league phase position bonuses like the published table", () => {
    // Champions League totals including the 6 participation points: 12, 10.25, 10, 6.25, 6.
    expect([1, 8, 9, 24, 25].map((p) => 6 + leaguePhaseBonus("UCL", p))).toEqual([
      12, 10.25, 10, 6.25, 6,
    ]);
    expect([1, 8, 9, 24, 36].map((p) => leaguePhaseBonus("UEL", p))).toEqual([6, 4.25, 4, 0.25, 0]);
    expect([1, 8, 9, 10, 24, 25].map((p) => leaguePhaseBonus("UECL", p))).toEqual([
      4, 2.25, 2, 1.875, 0.125, 0,
    ]);
  });

  it("truncates to the thousandth", () => {
    expect(truncate3(152.5 / 7)).toBe(21.785);
    expect(truncate3(8 / 3)).toBe(2.666);
    expect(truncate3(10.5)).toBe(10.5);
  });
});

const ASSOCIATIONS =
  "code,name_en,name_de\nGER,Germany,Deutschland\nENG,England,England\nNOR,Norway,Norwegen\n";
const codes = new Set(["GER", "ENG", "NOR"]);
const CLUBS =
  "club,country,fd_id\nBayern,GER,5\nArsenal,ENG,57\nBodø/Glimt,NOR,\nFreiburg,GER,\nMolde,NOR,\n";

describe("parsing", () => {
  it("reads semicolon files with comment lines and decimal commas", () => {
    const history = parseHistory(
      "history.csv",
      "# note\ncode;2024-25;2025-26\nGER;19,357;21,785\n",
      codes,
    );
    expect(history.get("GER")).toEqual(
      new Map([
        ["2024-25", 19.357],
        ["2025-26", 21.785],
      ]),
    );
    expect(parseCsv('a,b\n"x, y",2\n').rows[0]!.values).toEqual({ a: "x, y", b: "2" });
  });

  it("lists every problem with file and line", () => {
    const clubs = new Map(parseClubs("clubs.csv", CLUBS, codes).map((c) => [clubKey(c.name), c]));
    const bad =
      "date,competition,round,home,away,score\n" +
      "2026-07-08,UECL,Q1,Freiburg,Nobody,2-0\n" +
      "8.7.2026,UEL,Q9,Molde,Freiburg,2:1\n" +
      "2026-09-16,UCL,LP,Bayern,Arsenal,1-0\n" +
      "2026-08-01,UEL,Q3,Molde,Freiburg,2-1 pen\n";
    try {
      parseMatches("matches.csv", bad, clubs);
      expect.unreachable();
    } catch (error) {
      const problems = (error as UefaDataError).problems;
      expect(problems).toHaveLength(5);
      expect(problems[0]).toMatch(/^matches\.csv:2: club "Nobody"/);
      expect(problems.join("\n")).toMatch(/matches\.csv:3: date/);
      expect(problems.join("\n")).toMatch(/imported automatically/);
      expect(problems.join("\n")).toMatch(/not a draw/);
    }
  });

  it("accepts scores after extra time, penalty draws and open fixtures; club names ignore case", () => {
    const clubs = new Map(parseClubs("clubs.csv", CLUBS, codes).map((c) => [clubKey(c.name), c]));
    const matches = parseMatches(
      "matches.csv",
      "date,competition,round,home,away,score\n2026-08-20,UEL,PO,molde,FREIBURG,1-1 pen\n2026-08-27,UEL,PO,Freiburg,Molde,\n",
      clubs,
    );
    expect(matches.map((m) => [m.home, m.homeGoals, m.awayGoals])).toEqual([
      ["Molde", 1, 1],
      ["Freiburg", null, null],
    ]);
  });
});

describe("season and ranking", () => {
  const associations = parseAssociations("associations.csv", ASSOCIATIONS);
  const clubList = parseClubs("clubs.csv", CLUBS, codes);
  const clubs = new Map(clubList.map((c) => [clubKey(c.name), c]));
  const matches = parseMatches(
    "matches.csv",
    "date,competition,round,home,away,score\n" +
      "2026-07-15,UCL,Q2,Molde,Bodø/Glimt,0-1\n" +
      "2026-07-22,UCL,Q2,Bodø/Glimt,Molde,2-2\n" +
      "2026-10-01,UEL,LP,Freiburg,Molde,3-0\n" +
      "2027-03-05,UEL,R16,Freiburg,Molde,\n",
    clubs,
  );
  const auto = [
    {
      source: "football-data",
      date: "2026-09-16",
      competition: "UCL" as const,
      round: "LP" as const,
      home: "Bayern",
      away: "Arsenal",
      homeGoals: 1,
      awayGoals: 1,
    },
    {
      source: "football-data",
      date: "2026-09-30",
      competition: "UCL" as const,
      round: "LP" as const,
      home: "Bodø/Glimt",
      away: "Bayern",
      homeGoals: 0,
      awayGoals: 2,
    },
  ];
  const leaguePhase = parseLeaguePhase(
    "league-phase.csv",
    "competition,position,club\nUEL,2,Freiburg\n",
    clubs,
  );
  const season = computeSeason(clubList, [...matches, ...auto], leaguePhase);

  it("adds match points and bonuses per club", () => {
    const by = new Map(season.clubs.map((c) => [c.club, c]));
    // Bayern: draw 1 + win 2, CL participation 6.
    expect(by.get("Bayern")).toMatchObject({ matchPoints: 3, bonus: 6 });
    // Bodø/Glimt: Q2 win 1 + draw 0.5, CL loss 0, participation 6.
    expect(by.get("Bodø/Glimt")).toMatchObject({ matchPoints: 1.5, bonus: 6 });
    // Freiburg: LP win 2, R16 reached 1, 2nd in the league phase 5.75.
    expect(by.get("Freiburg")).toMatchObject({ matchPoints: 2, bonus: 6.75 });
  });

  it("divides by the number of clubs and truncates", () => {
    // Germany: (3 + 6 + 2 + 6.75) / 2 = 8.875
    expect(season.associations.get("GER")).toMatchObject({ clubs: 2, coefficient: 8.875 });
    // Norway: Bodø 7.5, Molde (0 + 0.5 + 0 + R16 1) = 1.5 -> 9 / 2 = 4.5
    expect(season.associations.get("NOR")).toMatchObject({ clubs: 2, coefficient: 4.5 });
    // England: Arsenal draw 1 + 6 = 7
    expect(season.associations.get("ENG")).toMatchObject({ clubs: 1, coefficient: 7 });
  });

  it("ranks by five-season total, ties by the most recent season, with last year's rank", () => {
    const history = parseHistory(
      "history.csv",
      "code,2021-22,2022-23,2023-24,2024-25,2025-26\nGER,10,10,10,10,10\nENG,20,10,10,10,11.875\nNOR,1,1,1,1,1\n",
      codes,
    );
    const rows = computeRanking(
      associations,
      history,
      ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"],
      season.associations,
      "2021-22",
    );
    // GER 40 + 8.875 = 48.875, ENG 41.875 + 7 = 48.875 -> tie, GER has more in 2026-27.
    expect(rows.map((r) => [r.association.code, r.total, r.rank, r.previousRank, r.gap])).toEqual([
      ["GER", 48.875, 1, 2, null],
      ["ENG", 48.875, 2, 1, 0],
      ["NOR", 8.5, 3, 3, 40.375],
    ]);
  });
});
