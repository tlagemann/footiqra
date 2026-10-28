import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyTeamRegistry } from "./merge";
import { STORE_SCHEMA_VERSION } from "./types";
import type { MatchFile, StoreMeta, TeamRegistry } from "./types";

/** Root of the data store. Overridable for tests. */
export function dataDir(root: string = process.cwd()): string {
  return path.join(root, "data");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Atomic write: write to a temp file, then rename, so a crash never leaves half a file. */
async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, file);
}

function assertSchema(file: string, version: unknown): void {
  if (version !== STORE_SCHEMA_VERSION) {
    throw new Error(`${file}: unsupported schemaVersion ${String(version)}`);
  }
}

export const matchFilePath = (dir: string, competition: string, season: number) =>
  path.join(dir, "matches", competition, `${season}.json`);

export async function readMatchFile(
  dir: string,
  competition: string,
  season: number,
): Promise<MatchFile | null> {
  const file = matchFilePath(dir, competition, season);
  const data = await readJson<MatchFile>(file);
  if (data) assertSchema(file, data.schemaVersion);
  return data;
}

export const writeMatchFile = (dir: string, data: MatchFile) =>
  writeJson(matchFilePath(dir, data.competition, data.season), data);

/** All stored match files, optionally limited to some competitions. */
export async function readAllMatchFiles(
  dir: string,
  competitions?: readonly string[],
): Promise<MatchFile[]> {
  const base = path.join(dir, "matches");
  let codes: string[];
  try {
    codes = await readdir(base);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files: MatchFile[] = [];
  for (const code of codes.sort()) {
    if (competitions && !competitions.includes(code)) continue;
    for (const name of (await readdir(path.join(base, code))).sort()) {
      if (!/^\d{4}\.json$/.test(name)) continue;
      const data = await readMatchFile(dir, code, Number(name.slice(0, 4)));
      if (data) files.push(data);
    }
  }
  return files;
}

export async function readTeams(dir: string): Promise<TeamRegistry> {
  const file = path.join(dir, "teams.json");
  const data = await readJson<TeamRegistry>(file);
  if (!data) return emptyTeamRegistry();
  assertSchema(file, data.schemaVersion);
  return data;
}

export const writeTeams = (dir: string, data: TeamRegistry) =>
  writeJson(path.join(dir, "teams.json"), data);

export async function readMeta(dir: string): Promise<StoreMeta> {
  const file = path.join(dir, "meta.json");
  const data = await readJson<StoreMeta>(file);
  if (!data) {
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      provider: "football-data",
      lastSuccessfulRunUtc: null,
      competitions: {},
    };
  }
  assertSchema(file, data.schemaVersion);
  return data;
}

export const writeMeta = (dir: string, data: StoreMeta) =>
  writeJson(path.join(dir, "meta.json"), data);
