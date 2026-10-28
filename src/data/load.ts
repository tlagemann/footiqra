import { readdir } from "node:fs/promises";
import path from "node:path";
import { readAllMatchFiles, readLatestStandings, readMeta, readTeams } from "@/store/fs";
import type { Snapshot } from "./repository";

/** Team ids that have a downloaded crest in public/crests. */
export async function readCrestIds(rootDir: string): Promise<Set<number>> {
  try {
    const files = await readdir(path.join(rootDir, "public", "crests"));
    return new Set(files.filter((f) => /^\d+\.png$/.test(f)).map((f) => Number(f.slice(0, -4))));
  } catch {
    return new Set();
  }
}

/** Reads everything the site and the scripts need from the data store. */
export async function loadSnapshotFromDisk(dataDir: string, rootDir: string): Promise<Snapshot> {
  const [meta, teams, matchFiles, crestIds, standings] = await Promise.all([
    readMeta(dataDir),
    readTeams(dataDir),
    readAllMatchFiles(dataDir),
    readCrestIds(rootDir),
    readLatestStandings(dataDir),
  ]);
  return { meta, teams, matchFiles, crestIds, standings };
}
