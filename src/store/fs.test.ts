import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readAllMatchFiles,
  readMatchFile,
  readMeta,
  readTeams,
  writeMatchFile,
  writeTeams,
} from "./fs";
import { emptyMatchFile, emptyTeamRegistry } from "./merge";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "footiqra-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("file store", () => {
  it("returns empty defaults when nothing is stored yet", async () => {
    expect(await readMatchFile(dir, "PL", 2026)).toBeNull();
    expect(await readAllMatchFiles(dir)).toEqual([]);
    expect((await readTeams(dir)).teams).toEqual({});
    expect((await readMeta(dir)).lastSuccessfulRunUtc).toBeNull();
  });

  it("round-trips match files and filters by competition", async () => {
    await writeMatchFile(dir, emptyMatchFile("PL", 2026));
    await writeMatchFile(dir, emptyMatchFile("BL1", 2026));
    expect(await readMatchFile(dir, "PL", 2026)).toMatchObject({ competition: "PL", season: 2026 });
    expect((await readAllMatchFiles(dir)).map((f) => f.competition)).toEqual(["BL1", "PL"]);
    expect((await readAllMatchFiles(dir, ["PL"])).map((f) => f.competition)).toEqual(["PL"]);
  });

  it("writes pretty JSON with a trailing newline", async () => {
    await writeTeams(dir, emptyTeamRegistry());
    const raw = await readFile(path.join(dir, "teams.json"), "utf8");
    expect(raw.endsWith("}\n")).toBe(true);
    expect(raw).toContain('\n  "schemaVersion": 1');
  });

  it("rejects files with an unknown schema version", async () => {
    await writeMatchFile(dir, { ...emptyMatchFile("PL", 2026), schemaVersion: 99 });
    await expect(readMatchFile(dir, "PL", 2026)).rejects.toThrow(/schemaVersion/);
  });
});
