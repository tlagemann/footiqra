import "server-only";
import { z } from "zod";

/**
 * Server-side environment variables, validated once and lazily.
 *
 * - `import "server-only"` makes the build fail if a Client Component imports this file,
 *   so secrets cannot end up in browser bundles.
 * - Nothing here may be prefixed with NEXT_PUBLIC_ (those are inlined into client code).
 * - Variables are optional in Phase 1; the ingestion job calls `requireEnv()` for the
 *   ones it actually needs, so a missing secret fails the job with a clear message
 *   instead of breaking the website build.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url().optional(),
  FOOTBALL_DATA_API_TOKEN: z.string().min(10).optional(),
  FOOTBALL_DATA_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(8),
  REVALIDATE_SECRET: z.string().min(32).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached && source === process.env) return cached;
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names only, never values.
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment variables: ${names}`);
  }
  if (source === process.env) cached = result.data;
  return result.data;
}

export function requireEnv<K extends keyof ServerEnv>(
  key: K,
  env: ServerEnv = getServerEnv(),
): NonNullable<ServerEnv[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}
