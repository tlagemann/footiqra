import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MatchFile } from "@/store/types";
import { loadUefaRanking } from ".";

/**
 * Checks the hand-maintained files in content/uefa on every push: a typo in a
 * club name or score fails CI with the file and line, before anything is deployed.
 */
describe("content/uefa", () => {
  it("parses and computes without problems", () => {
    const teams = JSON.parse(readFileSync("data/teams.json", "utf8")).teams as Record<
      string,
      { name: string }
    >;
    const ranking = loadUefaRanking(
      (season) => {
        try {
          return JSON.parse(readFileSync(`data/matches/CL/${season}.json`, "utf8")) as MatchFile;
        } catch {
          return undefined;
        }
      },
      (id) => teams[String(id)]?.name ?? `team ${id}`,
    );
    expect(ranking?.rows).toHaveLength(55);
  });
});
