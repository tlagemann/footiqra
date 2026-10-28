/**
 * Downloads missing club crests into public/crests (run after `npm run ingest`).
 * Exit code 0 even if single crests fail: pages fall back to a neutral badge.
 */
import { downloadMissingCrests } from "@/ingestion/crests";
import { dataDir, readTeams } from "@/store/fs";

async function main() {
  const teams = await readTeams(dataDir());
  const result = await downloadMissingCrests({
    teams,
    rootDir: process.cwd(),
    log: console.warn,
  });
  console.info(
    `Crests: ${result.downloaded} downloaded, ${result.skippedExisting} already present, ` +
      `${result.skippedNoSource} without source, ${result.failed.length} failed.`,
  );
}

main().catch((error) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
