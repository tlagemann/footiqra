import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MatchFile } from "@/store/types";
import { computeRanking, computeSeason, type ClubSeason, type RankingRow } from "./compute";
import {
  clubKey,
  parseAssociations,
  parseClubs,
  parseHistory,
  parseLeaguePhase,
  parseMatches,
  UefaDataError,
  type Club,
  type UefaMatch,
} from "./parse";
import type { Round } from "./rules";

export type { ClubSeason, RankingRow };

/**
 * UEFA association ranking, computed from the files in content/uefa/:
 *
 *   associations.csv        the 55 member associations
 *   history.csv             season coefficients of earlier seasons (entered by hand)
 *   2026-27/clubs.csv       clubs of the season with their country
 *   2026-27/matches.csv     results entered by hand (all except Champions League main stage)
 *   2026-27/league-phase.csv  final league phase positions (optional)
 *
 * Champions League matches from the league phase on come from the football-data
 * match files, so they never have to be entered.
 */

export interface UefaRanking {
  /** "2026-27" */
  season: string;
  /** Five seasons shown, oldest first. */
  seasons: string[];
  rows: RankingRow[];
  clubs: ClubSeason[];
  /** Latest played match date (YYYY-MM-DD) or null. */
  lastMatch: string | null;
  matchesEntered: number;
  matchesImported: number;
  /** True when earlier seasons are missing for some associations. */
  historyIncomplete: boolean;
}

const FD_STAGE: Record<string, Round> = {
  LEAGUE_STAGE: "LP",
  PLAYOFFS: "KPO",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "F",
};

export const uefaDir = (root: string = process.cwd()) => path.join(root, "content", "uefa");

/** "2026-27" from 2026 and back. */
export const seasonLabel = (start: number) => `${start}-${String(start + 1).slice(2)}`;
const seasonStart = (label: string) => Number(label.slice(0, 4));

/** Champions League matches from the league phase on, from the football-data file of the season. */
export function importChampionsLeague(
  file: MatchFile | undefined,
  clubs: readonly Club[],
  teamName: (id: number) => string,
): UefaMatch[] {
  if (!file) return [];
  const byFd = new Map(clubs.filter((c) => c.fdId !== null).map((c) => [c.fdId!, c.name]));
  const missing = new Map<number, string>();
  const out: UefaMatch[] = [];
  for (const m of file.matches) {
    const round = FD_STAGE[m.stage];
    if (!round) continue;
    const home = byFd.get(m.homeTeamId);
    const away = byFd.get(m.awayTeamId);
    if (!home) missing.set(m.homeTeamId, teamName(m.homeTeamId));
    if (!away) missing.set(m.awayTeamId, teamName(m.awayTeamId));
    if (!home || !away) continue;
    const played = m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null;
    // A penalty shoot-out means the match was drawn after extra time.
    const shootout = played && m.duration === "PENALTY_SHOOTOUT";
    out.push({
      source: "football-data",
      date: m.utcDate.slice(0, 10),
      competition: "UCL",
      round,
      home,
      away,
      homeGoals: played ? (shootout ? 0 : m.homeGoals) : null,
      awayGoals: played ? (shootout ? 0 : m.awayGoals) : null,
    });
  }
  if (missing.size) {
    throw new UefaDataError(
      [...missing].map(
        ([id, name]) =>
          `clubs.csv: Champions League club "${name}" (fd_id ${id}) is missing; add a row with its country and fd_id ${id}`,
      ),
    );
  }
  return out;
}

const read = (file: string) => readFileSync(file, "utf8");

/** Reads and computes everything. Throws UefaDataError listing every mistake in the files. */
export function loadUefaRanking(
  championsLeagueFile: (season: number) => MatchFile | undefined,
  teamName: (id: number) => string,
  root: string = process.cwd(),
): UefaRanking | null {
  const dir = uefaDir(root);
  if (!existsSync(path.join(dir, "associations.csv"))) return null;
  const associations = parseAssociations(
    "associations.csv",
    read(path.join(dir, "associations.csv")),
  );
  const codes = new Set(associations.map((a) => a.code));
  const history = existsSync(path.join(dir, "history.csv"))
    ? parseHistory("history.csv", read(path.join(dir, "history.csv")), codes)
    : new Map<string, Map<string, number>>();

  const season = readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}$/.test(n))
    .sort()
    .at(-1);
  if (!season) return null;
  const sdir = path.join(dir, season);
  const clubsFile = `${season}/clubs.csv`;
  const clubs = existsSync(path.join(sdir, "clubs.csv"))
    ? parseClubs(clubsFile, read(path.join(sdir, "clubs.csv")), codes)
    : [];
  const byKey = new Map(clubs.map((c) => [clubKey(c.name), c]));
  const manual = existsSync(path.join(sdir, "matches.csv"))
    ? parseMatches(`${season}/matches.csv`, read(path.join(sdir, "matches.csv")), byKey)
    : [];
  const leaguePhase = existsSync(path.join(sdir, "league-phase.csv"))
    ? parseLeaguePhase(
        `${season}/league-phase.csv`,
        read(path.join(sdir, "league-phase.csv")),
        byKey,
      )
    : [];
  const imported = importChampionsLeague(championsLeagueFile(seasonStart(season)), clubs, teamName);
  const matches = [...manual, ...imported];

  const current = computeSeason(clubs, matches, leaguePhase);
  const start = seasonStart(season);
  const seasons = [4, 3, 2, 1, 0].map((k) => seasonLabel(start - k));
  const rows = computeRanking(
    associations,
    history,
    seasons,
    current.associations,
    seasonLabel(start - 5),
  );
  const played = matches.filter((m) => m.homeGoals !== null).map((m) => m.date);
  return {
    season,
    seasons,
    rows,
    clubs: current.clubs,
    lastMatch: played.length ? played.sort().at(-1)! : null,
    matchesEntered: manual.filter((m) => m.homeGoals !== null).length,
    matchesImported: imported.filter((m) => m.homeGoals !== null).length,
    historyIncomplete: associations.some((a) =>
      seasons.slice(0, -1).some((s) => !history.get(a.code)?.has(s)),
    ),
  };
}
