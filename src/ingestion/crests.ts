import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchWithRetry, RateLimiter, type FetchLike } from "./http";
import type { TeamRegistry } from "@/store/types";

/**
 * Club crests are downloaded once and served from our own domain:
 * - visitors' browsers never contact a third-party host (privacy, GDPR),
 * - pages keep working if the provider's image host is down,
 * - only validated PNG files are stored (no SVG, so no script content).
 *
 * Files: public/crests/{providerTeamId}.png
 */
export const CREST_DIR = path.join("public", "crests");
const ALLOWED_HOST = "crests.football-data.org";
const MAX_BYTES = 512 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

export function crestSourceUrl(crest: string | null): URL | null {
  if (!crest) return null;
  try {
    const url = new URL(crest);
    if (url.protocol !== "https:" || url.host !== ALLOWED_HOST) return null;
    if (!/^\/\d+\.png$/.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

export interface CrestResult {
  downloaded: number;
  skippedExisting: number;
  skippedNoSource: number;
  failed: Array<{ teamId: number; reason: string }>;
}

/** Downloads missing crests. Existing files are kept (crests rarely change). */
export async function downloadMissingCrests(options: {
  teams: TeamRegistry;
  rootDir: string;
  fetchImpl?: FetchLike;
  limiter?: RateLimiter;
  log?: (line: string) => void;
}): Promise<CrestResult> {
  const dir = path.join(options.rootDir, CREST_DIR);
  await mkdir(dir, { recursive: true });
  const existing = new Set(await readdir(dir));
  const limiter = options.limiter ?? new RateLimiter(30);
  const log = options.log ?? (() => {});
  const result: CrestResult = { downloaded: 0, skippedExisting: 0, skippedNoSource: 0, failed: [] };

  for (const team of Object.values(options.teams.teams)) {
    const file = `${team.id}.png`;
    if (existing.has(file)) {
      result.skippedExisting++;
      continue;
    }
    const url = crestSourceUrl(team.crest);
    if (!url) {
      result.skippedNoSource++;
      continue;
    }
    try {
      await limiter.acquire();
      const response = await fetchWithRetry(url.toString(), {}, options.fetchImpl, {
        maxAttempts: 3,
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error(`size ${bytes.length}`);
      if (!isPng(bytes)) throw new Error("not a PNG file");
      await writeFile(path.join(dir, file), bytes);
      result.downloaded++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result.failed.push({ teamId: team.id, reason });
      log(`crest ${team.id} (${team.name}): ${reason}`);
    }
  }
  return result;
}
