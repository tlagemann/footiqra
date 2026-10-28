/**
 * Records today's ranking and table-vs-strength positions in data/history,
 * so the site can show changes over time. Runs after ingestion.
 *
 *   npm run snapshot
 */
import { buildHistoryEntry } from "@/data/history";
import { loadSnapshotFromDisk } from "@/data/load";
import { computePowerRanking } from "@/data/power-ranking";
import { dataDir, writeHistoryFile } from "@/store/fs";

async function main(): Promise<void> {
  const snapshot = await loadSnapshotFromDisk(dataDir(), process.cwd());
  const entry = buildHistoryEntry(snapshot, computePowerRanking(snapshot));
  if (!entry) {
    console.info("No data yet, nothing recorded.");
    return;
  }
  await writeHistoryFile(dataDir(), entry);
  console.info(`Recorded history for ${entry.date} (${entry.teams.length} teams).`);
}

main().catch((error) => {
  console.error("Snapshot failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
