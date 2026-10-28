import { describe, expect, it } from "vitest";
import { toRankableMatch } from "./mapper";
import { fdMatchListSchema, fdMatchSchema } from "./schemas";

/**
 * Hand-written fixture in the documented v4 shape.
 * Fictional teams and numbers: this is NOT real data from the API.
 */
const fixture = {
  id: 1001,
  utcDate: "2026-09-12T14:00:00Z",
  status: "FINISHED",
  matchday: 3,
  stage: "REGULAR_SEASON",
  group: null,
  lastUpdated: "2026-09-12T16:05:00Z",
  homeTeam: { id: 1, name: "Example United", shortName: "Example", tla: "EXU", crest: null },
  awayTeam: { id: 2, name: "Sample City", shortName: "Sample", tla: "SMC", crest: null },
  score: {
    winner: "HOME_TEAM",
    duration: "REGULAR",
    fullTime: { home: 2, away: 1 },
    halfTime: { home: 1, away: 0 },
  },
  someFutureField: { ignored: true },
};

describe("football-data schemas", () => {
  it("accepts the documented match shape and strips unknown fields", () => {
    const parsed = fdMatchSchema.parse(fixture);
    expect(parsed.id).toBe(1001);
    expect("someFutureField" in parsed).toBe(false);
  });

  it("rejects malformed data", () => {
    expect(() => fdMatchSchema.parse({ ...fixture, status: "FINISH" })).toThrow();
    expect(() => fdMatchSchema.parse({ ...fixture, utcDate: "yesterday" })).toThrow();
    expect(() =>
      fdMatchSchema.parse({
        ...fixture,
        score: { ...fixture.score, fullTime: { home: -1, away: 0 } },
      }),
    ).toThrow();
  });

  it("parses a match list wrapper", () => {
    expect(fdMatchListSchema.parse({ matches: [fixture] }).matches).toHaveLength(1);
  });
});

describe("toRankableMatch", () => {
  it("maps a finished regular-time match", () => {
    expect(toRankableMatch(fdMatchSchema.parse(fixture))).toEqual({
      id: "football-data:match:1001",
      kickoffUtc: "2026-09-12T14:00:00.000Z",
      homeTeamId: "football-data:team:1",
      awayTeamId: "football-data:team:2",
      homeGoals: 2,
      awayGoals: 1,
    });
  });

  it("skips unfinished, incomplete and extra-time matches", () => {
    const base = fdMatchSchema.parse(fixture);
    expect(toRankableMatch({ ...base, status: "TIMED" })).toEqual({ skipped: "not-finished" });
    expect(
      toRankableMatch({ ...base, score: { ...base.score, fullTime: { home: null, away: null } } }),
    ).toEqual({ skipped: "missing-score" });
    expect(
      toRankableMatch({ ...base, score: { ...base.score, duration: "PENALTY_SHOOTOUT" } }),
    ).toEqual({ skipped: "non-regular-duration" });
  });
});
