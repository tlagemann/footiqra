/**
 * Brings data/title-race/{season}.json up to date: title chances of every club
 * at every past checkpoint of the season (see src/data/title-race.ts). Stored
 * checkpoints are kept, only missing ones are computed. Runs after ingestion.
 *
 *   npm run title-race
 */
import { loadSnapshotFromDisk } from "@/data/load";
import { currentLeagueMatches, updateTitleRace, type TitleRaceFile } from "@/data/title-race";
import { dataDir, readTitleRaceFile, writeTitleRaceFile } from "@/store/fs";

async function main(): Promise<void> {
  const snapshot = await loadSnapshotFromDisk(dataDir(), process.cwd());
  const season = Math.max(...currentLeagueMatches(snapshot).map((l) => l.season), 0);
  if (!season) {
    console.info("No league data yet, nothing to do.");
    return;
  }
  const existing = await readTitleRaceFile<TitleRaceFile>(dataDir(), season);
  const started = Date.now();
  const now = Date.parse(snapshot.meta.lastSuccessfulRunUtc ?? "") || Date.now();
  const { file, added } = updateTitleRace(snapshot, existing, now);
  if (!file || added === 0) {
    console.info("Title race is up to date.");
    return;
  }
  await writeTitleRaceFile(dataDir(), file);
  console.info(
    `Added ${added} title race points in ${Math.round((Date.now() - started) / 1000)} s.`,
  );
}

main().catch((error) => {
  console.error("Title race failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
