/**
 * Fetches current-season matches from football-data.org into /data.
 *
 *   FOOTBALL_DATA_API_TOKEN=... npm run ingest
 *
 * Exit codes: 0 all competitions ok, 1 configuration error, 2 at least one competition failed.
 */
import { parseIngestEnv } from "@/ingestion/env";
import { FootballDataClient } from "@/ingestion/providers/football-data/client";
import { runIngest } from "@/ingestion/run";
import { dataDir } from "@/store/fs";
import { currentSeasonStartYear } from "@/store/merge";

async function main(): Promise<number> {
  let env;
  try {
    env = parseIngestEnv(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }

  const season = env.FOOTIQRA_SEASON ?? currentSeasonStartYear(new Date());
  const client = new FootballDataClient({
    token: env.FOOTBALL_DATA_API_TOKEN,
    requestsPerMinute: env.FOOTBALL_DATA_REQUESTS_PER_MINUTE,
  });

  console.info(`Ingesting season ${season} into ${dataDir()}`);
  const result = await runIngest({ client, dataDir: dataDir(), season, log: console.info });
  const failed = result.results.filter((r) => !r.ok);
  console.info(
    `Done: ${result.requestsMade} API requests, ${failed.length} failed competition(s).`,
  );
  return failed.length > 0 ? 2 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error("Unexpected error:", error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
