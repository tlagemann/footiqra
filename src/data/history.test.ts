import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listHistoryDates, readHistoryFile, writeHistoryFile } from "@/store/fs";
import type { StoredMatch } from "@/store/types";
import { buildHistoryEntry, referenceDate, type HistoryFile } from "./history";
import { computePowerRanking } from "./power-ranking";
import type { Snapshot } from "./repository";

// Fictional teams, not real data.
const match = (id: number, home: number, away: number, hg: number, ag: number): StoredMatch => ({
  id,
  utcDate: `2026-09-${String(id).padStart(2, "0")}T14:00:00.000Z`,
  status: "FINISHED",
  matchday: id,
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
const standing = (position: number, teamId: number, points: number) => ({
  position,
  teamId,
  playedGames: 3,
  won: 0,
  draw: 0,
  lost: 0,
  points,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
});

const snapshot: Snapshot = {
  meta: {
    schemaVersion: 1,
    provider: "football-data",
    lastSuccessfulRunUtc: "2026-10-28T12:48:00.000Z",
    competitions: {},
  },
  teams: { schemaVersion: 1, teams: { "1": team(1, "a"), "2": team(2, "b"), "3": team(3, "c") } },
  matchFiles: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      matches: [match(1, 1, 2, 5, 0), match(2, 2, 3, 1, 0), match(3, 3, 1, 1, 0)],
    },
  ],
  // Official table disagrees with strength on purpose: c is first.
  standings: [
    {
      schemaVersion: 1,
      competition: "PL",
      season: 2026,
      fetchedUtc: "2026-10-28T12:48:00.000Z",
      rows: [standing(1, 3, 3), standing(2, 2, 3), standing(3, 1, 3)],
    },
  ],
};

describe("buildHistoryEntry", () => {
  it("records power rank, rating and table vs. strength per team", () => {
    const entry = buildHistoryEntry(snapshot, computePowerRanking(snapshot))!;
    expect(entry.date).toBe("2026-10-28");
    expect(entry.teams).toHaveLength(3);
    const a = entry.teams.find((t) => t.slug === "a")!;
    expect(a.powerRank).toBe(1);
    expect(a.tablePosition).toBe(3);
    expect(a.strengthPosition).toBe(1);
    expect(a.gap).toBe(-2);
  });

  it("records nothing without data", () => {
    const empty = { ...snapshot, meta: { ...snapshot.meta, lastSuccessfulRunUtc: null } };
    expect(buildHistoryEntry(empty, computePowerRanking(empty))).toBeNull();
  });
});

describe("referenceDate", () => {
  const dates = ["2026-10-18", "2026-10-20", "2026-10-21", "2026-10-27"];
  it("picks the newest day at least a week old", () => {
    expect(referenceDate(dates, "2026-10-28")).toBe("2026-10-21");
    expect(referenceDate(dates, "2026-10-27")).toBe("2026-10-20");
  });
  it("returns undefined without enough history", () => {
    expect(referenceDate(dates, "2026-10-24")).toBeUndefined();
    expect(referenceDate([], "2026-10-28")).toBeUndefined();
  });
});

describe("history files", () => {
  it("round-trips and lists days", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "footiqra-history-"));
    try {
      const entry = buildHistoryEntry(snapshot, computePowerRanking(snapshot))!;
      await writeHistoryFile(dir, entry);
      expect(await listHistoryDates(dir)).toEqual(["2026-10-28"]);
      expect((await readHistoryFile<HistoryFile>(dir, "2026-10-28"))?.teams).toHaveLength(3);
      await expect(readHistoryFile(dir, "../teams")).rejects.toThrow("Invalid history date");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
