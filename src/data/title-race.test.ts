import { describe, expect, it } from "vitest";
import type { StoredMatch } from "@/store/types";
import {
  buildTitleRace,
  checkpoints,
  contenders,
  snapshotAt,
  tableAt,
  titleRaceModelId,
  trimPreseason,
  type TitleRaceFile,
} from "./title-race";
import type { Snapshot } from "./repository";

const match = (
  id: number,
  utcDate: string,
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
): StoredMatch => ({
  id,
  utcDate,
  status: hg === null ? "SCHEDULED" : "FINISHED",
  matchday: 1,
  stage: "REGULAR_SEASON",
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  duration: "REGULAR",
  winner: null,
  lastUpdated: utcDate,
});

const t = (iso: string) => Date.parse(iso);

describe("checkpoints", () => {
  it("starts at the first kickoff, then every Monday 06:00 UTC before the end", () => {
    // Friday 7 Aug 2026, 19:00 UTC
    const list = checkpoints(t("2026-08-07T19:00:00Z"), t("2026-08-25T00:00:00Z"));
    expect(list.map((x) => new Date(x).toISOString())).toEqual([
      "2026-08-07T19:00:00.000Z",
      "2026-08-10T06:00:00.000Z",
      "2026-08-17T06:00:00.000Z",
      "2026-08-24T06:00:00.000Z",
    ]);
  });

  it("skips the Monday of a season that starts later that Monday", () => {
    const list = checkpoints(t("2026-08-10T18:00:00Z"), t("2026-08-18T00:00:00Z"));
    expect(list.map((x) => new Date(x).toISOString().slice(0, 10))).toEqual([
      "2026-08-10",
      "2026-08-17",
    ]);
  });
});

describe("tableAt", () => {
  it("counts only results before the checkpoint and lists every club", () => {
    const matches = [
      match(1, "2026-08-08T15:00:00Z", 1, 2, 2, 0),
      match(2, "2026-08-08T15:00:00Z", 3, 4, 1, 1),
      match(3, "2026-08-15T15:00:00Z", 2, 3, 0, 3),
    ];
    const table = tableAt(matches, t("2026-08-10T06:00:00Z"));
    expect(table.get(1)).toEqual({ points: 3, goalDifference: 2, played: 1 });
    expect(table.get(2)).toEqual({ points: 0, goalDifference: -2, played: 1 });
    expect(table.get(3)).toEqual({ points: 1, goalDifference: 0, played: 1 });
    expect(table.size).toBe(4);
  });
});

describe("snapshotAt", () => {
  it("turns later results into scheduled matches", () => {
    const snapshot = {
      matchFiles: [
        {
          schemaVersion: 1,
          competition: "BL1",
          season: 2026,
          matches: [
            match(1, "2026-08-08T15:00:00Z", 1, 2, 2, 0),
            match(2, "2026-08-20T15:00:00Z", 2, 1, 1, 0),
          ],
        },
      ],
    } as unknown as Snapshot;
    const past = snapshotAt(snapshot, t("2026-08-10T06:00:00Z")).matchFiles[0]!.matches;
    expect(past[0]!.status).toBe("FINISHED");
    expect(past[1]).toMatchObject({ status: "SCHEDULED", homeGoals: null, awayGoals: null });
  });
});

describe("trimPreseason", () => {
  it("keeps only the last point before the league's first match", () => {
    const points = [0, 0, 0, 9, 18].map((played) => ({ played }));
    expect(trimPreseason(points).map((p) => p.played)).toEqual([0, 9, 18]);
    expect(trimPreseason([{ played: 0 }, { played: 0 }])).toEqual([{ played: 0 }]);
  });
});

describe("contenders", () => {
  const point = (entries: [number, number][]) => ({ chances: new Map(entries) });
  it("keeps clubs that reached the threshold, best today first", () => {
    const points = [
      point([
        [1, 0.4],
        [2, 0.3],
        [3, 0.12],
        [4, 0.05],
      ]),
      point([
        [1, 0.2],
        [2, 0.7],
        [3, 0.02],
        [4, 0.08],
      ]),
    ];
    expect(contenders(points)).toEqual([2, 1, 3]);
  });
});

describe("buildTitleRace", () => {
  const file: TitleRaceFile = {
    schemaVersion: 1,
    season: 2026,
    model: titleRaceModelId(),
    runs: 100,
    leagues: {
      bundesliga: [
        { at: "2026-08-17T06:00:00.000Z", played: 0, chances: { "1": 0.5, "2": 0.2 } },
        { at: "2026-08-24T06:00:00.000Z", played: 0, chances: { "1": 0.5, "2": 0.2 } },
        { at: "2026-08-31T06:00:00.000Z", played: 9, chances: { "1": 0.55, "2": 0.25 } },
      ],
    },
  };
  const team = (id: number) => ({ slug: `team-${id}`, name: `Team ${id}`, crest: null });

  it("adds today as the last point and drops repeated pre-season points", () => {
    const race = buildTitleRace(
      "bundesliga",
      file,
      {
        at: t("2026-09-03T10:00:00Z"),
        played: 18,
        chances: new Map([
          [1, 0.6],
          [2, 0.3],
        ]),
      },
      team,
    )!;
    expect(race.played).toEqual([0, 9, 18]);
    expect(race.series.map((s) => s.teamId)).toEqual([1, 2]);
    expect(race.series[0]!.chances).toEqual([0.5, 0.55, 0.6]);
  });

  it("lets today replace a stored point from the same day", () => {
    const race = buildTitleRace(
      "bundesliga",
      file,
      {
        at: t("2026-08-31T09:00:00Z"),
        played: 9,
        chances: new Map([
          [1, 0.56],
          [2, 0.24],
        ]),
      },
      team,
    )!;
    expect(race.played).toEqual([0, 9]);
    expect(race.series[0]!.chances).toEqual([0.5, 0.56]);
  });

  it("returns null without enough points", () => {
    expect(buildTitleRace("serie-a", file, null, team)).toBeNull();
  });
});
