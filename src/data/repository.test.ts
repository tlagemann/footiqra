import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import {
  allLeagueTeams,
  findTeamBySlug,
  recentForm,
  teamMatches,
  teamsOfLeague,
  type Snapshot,
} from "./repository";

// In-memory fixture with fictional teams. Not real data.
function match(
  partial: Partial<StoredMatch> & Pick<StoredMatch, "id" | "homeTeamId" | "awayTeamId">,
): StoredMatch {
  return {
    utcDate: "2026-09-12T14:00:00.000Z",
    status: "FINISHED",
    matchday: 1,
    stage: "REGULAR_SEASON",
    homeGoals: 1,
    awayGoals: 0,
    duration: "REGULAR",
    winner: "HOME_TEAM",
    lastUpdated: "2026-09-12T16:00:00.000Z",
    ...partial,
  };
}

const team = (id: number, name: string, slug: string) => ({
  id,
  name,
  shortName: null,
  tla: null,
  crest: null,
  slug,
});

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-10-01T00:00:00.000Z",
    competitions: {},
  },
  teams: {
    schemaVersion: 1,
    teams: {
      "1": team(1, "Alpha FC", "alpha-fc"),
      "2": team(2, "Beta United", "beta-united"),
      "3": team(3, "Gamma SC", "gamma-sc"),
      "9": team(9, "Outsider CL Only", "outsider-cl-only"),
    },
  },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2025,
      matches: [
        match({ id: 50, homeTeamId: 3, awayTeamId: 1, utcDate: "2025-09-12T14:00:00.000Z" }),
      ],
    },
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [
        match({ id: 100, homeTeamId: 1, awayTeamId: 2, utcDate: "2026-09-01T14:00:00.000Z" }),
        match({ id: 101, homeTeamId: 2, awayTeamId: 1, utcDate: "2026-09-20T14:00:00.000Z" }),
        match({
          id: 102,
          homeTeamId: 1,
          awayTeamId: 2,
          utcDate: "2026-11-01T14:00:00.000Z",
          status: "TIMED",
          homeGoals: null,
          awayGoals: null,
        }),
      ],
    },
    {
      schemaVersion: 1,
      competition: "BL1",
      season: 2026,
      matches: [
        match({
          id: 200,
          homeTeamId: 3,
          awayTeamId: 4 /* team 4 missing from registry on purpose */,
        }),
      ],
    },
    {
      schemaVersion: 1,
      competition: "CL",
      season: 2026,
      matches: [
        match({ id: 300, homeTeamId: 1, awayTeamId: 9, utcDate: "2026-09-25T19:00:00.000Z" }),
      ],
    },
  ],
};

describe("repository", () => {
  it("assigns teams to the league of their latest season and excludes CL-only teams", () => {
    expect(allLeagueTeams(snapshot).map((t) => [t.slug, t.leagueSlug])).toEqual([
      ["alpha-fc", "premier-league"],
      ["beta-united", "premier-league"],
      ["gamma-sc", "bundesliga"],
    ]);
  });

  it("filters teams by league and finds by slug", () => {
    expect(teamsOfLeague(snapshot, "premier-league").map((t) => t.slug)).toEqual([
      "alpha-fc",
      "beta-united",
    ]);
    expect(findTeamBySlug(snapshot, "gamma-sc")?.leagueSlug).toBe("bundesliga");
    expect(findTeamBySlug(snapshot, "outsider-cl-only")).toBeUndefined();
  });

  it("lists results newest first across competitions and upcoming fixtures", () => {
    const { results, fixtures } = teamMatches(
      snapshot,
      "alpha-fc",
      new Date("2026-10-01T00:00:00Z"),
    );
    expect(results.map((m) => [m.id, m.competition])).toEqual([
      [300, "CL"],
      [101, "PL"],
      [100, "PL"],
      [50, "PL"], // previous season is part of the history too
    ]);
    expect(fixtures.map((m) => m.id)).toEqual([102]);
    expect(results[0].away).toEqual({
      slug: "outsider-cl-only",
      name: "Outsider CL Only",
      crest: null,
    });
  });
});

describe("crests and form", () => {
  it("uses local crest paths only for downloaded crests", () => {
    const withCrests = { ...snapshot, crestIds: new Set([1]) };
    const teams = allLeagueTeams(withCrests);
    expect(teams.find((t) => t.slug === "alpha-fc")?.crest).toBe("/crests/1.png");
    expect(teams.find((t) => t.slug === "beta-united")?.crest).toBeNull();
  });

  it("returns the last results per team, oldest first", () => {
    const form = recentForm(snapshot, 3);
    // Alpha: 50 (away loss 1:0 at Gamma), 100 (home win), 101 (away loss), 300 (home win) -> last 3
    expect(form.get(1)).toEqual(["W", "L", "W"]);
    expect(form.get(2)).toEqual(["L", "W"]);
  });
});
