import { z } from "zod";

/**
 * Environment for the ingestion job (GitHub Actions or local `npm run ingest`).
 * The website itself needs no secrets: it only reads the committed JSON files.
 *
 * Error messages name variables, never their values.
 */
const ingestEnvSchema = z.object({
  FOOTBALL_DATA_API_TOKEN: z.string().min(10, "missing or too short"),
  /** Client-side budget; the free tier allows 10 requests per minute. */
  FOOTBALL_DATA_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(8),
  /** Season start year override, e.g. 2026. Defaults to the current season. */
  FOOTIQRA_SEASON: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type IngestEnv = z.infer<typeof ingestEnvSchema>;

export function parseIngestEnv(source: Record<string, string | undefined>): IngestEnv {
  const result = ingestEnvSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Invalid or missing environment variables: ${names}`);
  }
  return result.data;
}
