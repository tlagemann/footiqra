import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import { matchDetail, seasonStats } from "./match-detail";
import { computePowerRanking } from "./power-ranking";
import { archivedMatchIds, matchSlugs, type Snapshot } from "./repository";

// Fictional teams, not real data.
const match = (
  id: number,
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
  day: number,
  status = "FINISHED",
): StoredMatch => ({
  id,
  utcDate: `2026-09-${String(day).padStart(2, "0")}T14:00:00.000Z`,
  status,
  matchday: day,
  stage: "REGULAR_SEASON",
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  duration: "REGULAR",
  winner: null,
  lastUpdated: "2026-09-30T00:00:00.000Z",
});
const team = (id: number, slug: string) => ({
  id,
  name: slug,
  shortName: null,
  tla: null,
  crest: null,
  slug,
});

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-09-20T00:00:00.000Z",
    competitions: {},
  },
  teams: {
    schemaVersion: 1,
    teams: { "1": team(1, "a"), "2": team(2, "b"), "3": team(3, "c"), "9": team(9, "outsider") },
  },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [
        match(1, 1, 2, 3, 1, 1),
        match(2, 3, 1, 0, 0, 5),
        match(3, 2, 3, 2, 2, 9),
        match(4, 2, 1, null, null, 25, "TIMED"),
      ],
    },
    {
      schemaVersion: 1,
      competition: "CL",
      season: 2026,
      matches: [match(10, 1, 9, 1, 0, 12), match(11, 1, 2, 0, 1, 15)],
    },
  ],
};

describe("matchSlugs", () => {
  it("gives league and European matches between covered clubs a stable slug", () => {
    const slugs = matchSlugs(snapshot);
    expect(slugs.get(1)).toBe("a-vs-b-2026-27");
    expect(slugs.get(4)).toBe("b-vs-a-2026-27");
    expect(slugs.get(11)).toBe("a-vs-b-2026-27-champions-league");
    expect(slugs.has(10)).toBe(false); // outsider has no league
  });

  it("keeps finished matches as archive pages and drops unplayed old ones", () => {
    const later = {
      ...snapshot,
      meta: { ...snapshot.meta, lastSuccessfulRunUtc: "2026-10-30T00:00:00.000Z" },
    };
    const slugs = matchSlugs(later);
    expect(slugs.get(1)).toBe("a-vs-b-2026-27"); // 1 Sep, finished: archive page
    expect(slugs.has(4)).toBe(false); // 25 Sep, never played: no page
    expect(archivedMatchIds(later).has(1)).toBe(true);
    const recent = archivedMatchIds(snapshot);
    expect(recent.has(1)).toBe(false); // within 30 days of 20 Sep
  });

  it("does not publish matches more than 14 days ahead", () => {
    const early = {
      ...snapshot,
      meta: { ...snapshot.meta, lastSuccessfulRunUtc: "2026-09-05T00:00:00.000Z" },
    };
    expect(matchSlugs(early).has(4)).toBe(false); // 25 Sep: 20 days ahead
  });
});

describe("seasonStats", () => {
  it("counts league matches only", () => {
    const s = seasonStats(snapshot, 1);
    expect(s).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 1 });
    expect(s.home).toEqual({ played: 1, won: 1, drawn: 0, lost: 0 });
    expect(s.away).toEqual({ played: 1, won: 0, drawn: 1, lost: 0 });
    expect(s.cleanSheets).toBe(1);
    expect(s.bothScored).toBe(1);
    expect(s.over25).toBe(1);
  });
});

describe("matchDetail", () => {
  const ranking = computePowerRanking(snapshot);
  const asOf = new Date("2026-09-20T00:00:00.000Z");

  it("points older matches to the next meeting of the same clubs", () => {
    const m = matchDetail(snapshot, ranking, "a-vs-b-2026-27", asOf)!;
    expect(m.currentMeeting).toMatchObject({ slug: "b-vs-a-2026-27", upcoming: true });
  });

  it("uses the pre-match forecast for finished matches", () => {
    const m = matchDetail(snapshot, ranking, "a-vs-b-2026-27", asOf)!;
    expect(m.homeGoals).toBe(3);
    expect(m.forecast?.basis).toBe("pre-match");
    // First match of the season: both clubs still on equal ratings.
    expect(m.forecast?.percentages.home).toBeGreaterThan(m.forecast!.percentages.away);
    expect(m.headToHead.map((x) => x.id)).toEqual([11]);
  });

  it("uses current ratings for upcoming matches and lists previous meetings", () => {
    const m = matchDetail(snapshot, ranking, "b-vs-a-2026-27", asOf)!;
    expect(m.forecast?.basis).toBe("current");
    const p = m.forecast!.percentages;
    expect(p.home + p.draw + p.away).toBe(100);
    expect(m.headToHead.map((x) => x.id)).toEqual([11, 1]);
    expect(m.home.recent.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown slugs", () => {
    expect(matchDetail(snapshot, ranking, "nope", asOf)).toBeUndefined();
  });
});
