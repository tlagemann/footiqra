import { mkdtemp, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREST_DIR, crestSourceUrl, downloadMissingCrests, isPng } from "./crests";
import { RateLimiter } from "./http";
import type { TeamRegistry } from "@/store/types";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const noWait = new RateLimiter(
  60,
  () => 0,
  async () => {},
);

// Fictional teams.
function registry(entries: Array<[number, string | null]>): TeamRegistry {
  return {
    schemaVersion: 1,
    teams: Object.fromEntries(
      entries.map(([id, crest]) => [
        String(id),
        { id, name: `Team ${id}`, shortName: null, tla: null, crest, slug: `team-${id}` },
      ]),
    ),
  };
}

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "footiqra-crests-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("crestSourceUrl", () => {
  it("only accepts https PNG URLs from the provider's crest host", () => {
    expect(crestSourceUrl("https://crests.football-data.org/5.png")?.toString()).toBe(
      "https://crests.football-data.org/5.png",
    );
    expect(crestSourceUrl("http://crests.football-data.org/5.png")).toBeNull();
    expect(crestSourceUrl("https://evil.example/5.png")).toBeNull();
    expect(crestSourceUrl("https://crests.football-data.org/5.svg")).toBeNull();
    expect(crestSourceUrl(null)).toBeNull();
  });
});

describe("isPng", () => {
  it("checks the PNG signature", () => {
    expect(isPng(PNG)).toBe(true);
    expect(isPng(new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(false);
  });
});

describe("downloadMissingCrests", () => {
  it("downloads missing crests, keeps existing ones and rejects non-PNG data", async () => {
    await mkdir(path.join(root, CREST_DIR), { recursive: true });
    await writeFile(path.join(root, CREST_DIR, "1.png"), PNG);

    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("/3.png") ? new Response("<html>not an image</html>") : new Response(PNG),
    );
    const result = await downloadMissingCrests({
      teams: registry([
        [1, "https://crests.football-data.org/1.png"],
        [2, "https://crests.football-data.org/2.png"],
        [3, "https://crests.football-data.org/3.png"],
        [4, null],
      ]),
      rootDir: root,
      fetchImpl,
      limiter: noWait,
    });

    expect(result).toMatchObject({ downloaded: 1, skippedExisting: 1, skippedNoSource: 1 });
    expect(result.failed).toEqual([{ teamId: 3, reason: "not a PNG file" }]);
    expect((await readdir(path.join(root, CREST_DIR))).sort()).toEqual(["1.png", "2.png"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
