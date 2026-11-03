import { COMPETITIONS, ROUNDS, type Competition, type Round } from "./rules";

/**
 * Reading the hand-maintained files in content/uefa/ (see the README there).
 * Every problem is collected with file and line, so one failed build lists all
 * mistakes at once instead of one per attempt.
 */

export class UefaDataError extends Error {
  constructor(readonly problems: string[]) {
    super(`UEFA data has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  }
}

export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

/** Comma or semicolon separated (detected from the header), quotes allowed, # starts a comment line. */
export function parseCsv(text: string): { header: string[]; rows: CsvRow[]; delimiter: string } {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const headerIndex = lines.findIndex((l) => l.trim() && !l.trim().startsWith("#"));
  if (headerIndex === -1) return { header: [], rows: [], delimiter: "," };
  const delimiter = lines[headerIndex]!.includes(";") ? ";" : ",";
  const split = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delimiter) {
        cells.push(cell.trim());
        cell = "";
      } else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };
  const header = split(lines[headerIndex]!).map((h) => h.toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const cells = split(raw);
    rows.push({
      line: i + 1,
      values: Object.fromEntries(header.map((h, k) => [h, cells[k] ?? ""])),
    });
  }
  return { header, rows, delimiter };
}

function requireColumns(file: string, header: string[], columns: string[], problems: string[]) {
  const missing = columns.filter((c) => !header.includes(c));
  if (missing.length) problems.push(`${file}: missing column(s) ${missing.join(", ")}`);
  return missing.length === 0;
}

export const clubKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

// ---------------------------------------------------------------------------

export interface Association {
  code: string;
  nameEn: string;
  nameDe: string;
}

export function parseAssociations(file: string, text: string): Association[] {
  const problems: string[] = [];
  const { header, rows } = parseCsv(text);
  if (!requireColumns(file, header, ["code", "name_en", "name_de"], problems)) {
    throw new UefaDataError(problems);
  }
  const seen = new Set<string>();
  const out: Association[] = [];
  for (const { line, values } of rows) {
    const code = values.code!.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code))
      problems.push(`${file}:${line}: code "${values.code}" must be 3 letters`);
    else if (seen.has(code)) problems.push(`${file}:${line}: ${code} is listed twice`);
    seen.add(code);
    out.push({ code, nameEn: values.name_en!, nameDe: values.name_de || values.name_en! });
  }
  if (problems.length) throw new UefaDataError(problems);
  return out;
}

/** Season coefficients of earlier seasons: one row per association, one column per season ("2022-23"). */
export function parseHistory(
  file: string,
  text: string,
  associations: ReadonlySet<string>,
): Map<string, Map<string, number>> {
  const problems: string[] = [];
  const { header, rows, delimiter } = parseCsv(text);
  requireColumns(file, header, ["code"], problems);
  const seasons = header.filter((h) => /^\d{4}-\d{2}$/.test(h));
  const out = new Map<string, Map<string, number>>();
  for (const { line, values } of rows) {
    const code = values.code!.toUpperCase();
    if (!associations.has(code)) {
      problems.push(`${file}:${line}: unknown association "${values.code}" (see associations.csv)`);
      continue;
    }
    const bySeason = new Map<string, number>();
    for (const season of seasons) {
      const raw = values[season]!;
      if (raw === "") continue;
      const normalised = delimiter === ";" ? raw.replace(",", ".") : raw;
      const value = Number(normalised);
      if (!/^\d+(\.\d{1,3})?$/.test(normalised) || !Number.isFinite(value)) {
        problems.push(`${file}:${line}: ${code} ${season} "${raw}" is not a number like 21.785`);
      } else bySeason.set(season, value);
    }
    out.set(code, bySeason);
  }
  if (problems.length) throw new UefaDataError(problems);
  return out;
}

// ---------------------------------------------------------------------------

export interface Club {
  name: string;
  country: string;
  /** football-data.org team id, for Champions League matches imported automatically. */
  fdId: number | null;
}

export function parseClubs(file: string, text: string, associations: ReadonlySet<string>): Club[] {
  const problems: string[] = [];
  const { header, rows } = parseCsv(text);
  if (!requireColumns(file, header, ["club", "country"], problems))
    throw new UefaDataError(problems);
  const seen = new Map<string, number>();
  const out: Club[] = [];
  for (const { line, values } of rows) {
    const name = values.club!;
    const country = values.country!.toUpperCase();
    const fd = values.fd_id ?? "";
    if (!name) problems.push(`${file}:${line}: club name is empty`);
    if (!associations.has(country)) {
      problems.push(
        `${file}:${line}: unknown country "${values.country}" for ${name} (3-letter UEFA code, see associations.csv)`,
      );
    }
    if (fd && !/^\d+$/.test(fd)) problems.push(`${file}:${line}: fd_id "${fd}" must be a number`);
    const key = clubKey(name);
    if (seen.has(key))
      problems.push(`${file}:${line}: ${name} is already listed in line ${seen.get(key)}`);
    seen.set(key, line);
    out.push({ name, country, fdId: fd ? Number(fd) : null });
  }
  if (problems.length) throw new UefaDataError(problems);
  return out;
}

export interface UefaMatch {
  /** "matches.csv:12" for hand-entered rows, "football-data" for imported ones. */
  source: string;
  date: string;
  competition: Competition;
  round: Round;
  home: string;
  away: string;
  /** Null while the match has not been played (the round still counts as reached). */
  homeGoals: number | null;
  awayGoals: number | null;
}

const SCORE =
  /^(\d{1,2})\s*[-:]\s*(\d{1,2})(\s*(n\.?\s*e\.?|pen\.?|i\.?\s*e\.?|aet|n\.?\s*v\.?))?$/i;

/**
 * Hand-entered matches: date, competition, round, home, away, score.
 * Champions League matches from the league phase on are imported automatically
 * and must not be entered here.
 */
export function parseMatches(
  file: string,
  text: string,
  clubs: ReadonlyMap<string, Club>,
): UefaMatch[] {
  const problems: string[] = [];
  const { header, rows } = parseCsv(text);
  if (
    !requireColumns(
      file,
      header,
      ["date", "competition", "round", "home", "away", "score"],
      problems,
    )
  ) {
    throw new UefaDataError(problems);
  }
  const out: UefaMatch[] = [];
  const seen = new Map<string, number>();
  for (const { line, values } of rows) {
    const at = `${file}:${line}`;
    const competition = values.competition!.toUpperCase() as Competition;
    const round = values.round!.toUpperCase() as Round;
    const date = values.date!;
    let ok = true;
    const fail = (message: string) => {
      problems.push(`${at}: ${message}`);
      ok = false;
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`date "${date}" must look like 2026-07-08`);
    if (!COMPETITIONS.includes(competition))
      fail(`competition "${values.competition}" must be UCL, UEL or UECL`);
    if (!ROUNDS.includes(round))
      fail(`round "${values.round}" must be one of ${ROUNDS.join(", ")}`);
    if (competition === "UCL" && ROUNDS.indexOf(round) >= ROUNDS.indexOf("LP")) {
      fail(
        "Champions League matches from the league phase on are imported automatically; enter only PR, Q1 to Q3 and PO",
      );
    }
    if (round === "PR" && competition !== "UCL")
      fail("round PR (preliminary round) only exists in the Champions League");
    for (const side of ["home", "away"] as const) {
      if (!clubs.has(clubKey(values[side]!))) fail(`club "${values[side]}" is not in clubs.csv`);
    }
    if (clubKey(values.home!) === clubKey(values.away!)) fail("a club cannot play itself");
    const score = values.score!.trim();
    let homeGoals: number | null = null;
    let awayGoals: number | null = null;
    if (score) {
      const m = SCORE.exec(score);
      if (!m)
        fail(
          `score "${score}" must look like 2-1 (after extra time; add "pen" for a penalty shoot-out)`,
        );
      else {
        homeGoals = Number(m[1]);
        awayGoals = Number(m[2]);
        if (/pen|n\.?\s*e|i\.?\s*e/i.test(m[3] ?? "") && homeGoals !== awayGoals) {
          fail(
            `score "${score}" is marked as a penalty shoot-out but is not a draw; enter the score after extra time`,
          );
        }
      }
    }
    const key = [competition, round, clubKey(values.home!), clubKey(values.away!)].join("|");
    if (seen.has(key)) fail(`same match as line ${seen.get(key)}`);
    seen.set(key, line);
    if (ok) {
      out.push({
        source: at,
        date,
        competition,
        round,
        home: clubs.get(clubKey(values.home!))!.name,
        away: clubs.get(clubKey(values.away!))!.name,
        homeGoals,
        awayGoals,
      });
    }
  }
  if (problems.length) throw new UefaDataError(problems);
  return out;
}

export interface LeaguePhasePosition {
  competition: Competition;
  position: number;
  club: string;
}

/** Final league phase positions (entered once a league phase is complete). */
export function parseLeaguePhase(
  file: string,
  text: string,
  clubs: ReadonlyMap<string, Club>,
): LeaguePhasePosition[] {
  const problems: string[] = [];
  const { header, rows } = parseCsv(text);
  if (!requireColumns(file, header, ["competition", "position", "club"], problems)) {
    throw new UefaDataError(problems);
  }
  const out: LeaguePhasePosition[] = [];
  const taken = new Set<string>();
  for (const { line, values } of rows) {
    const competition = values.competition!.toUpperCase() as Competition;
    const position = Number(values.position);
    const club = clubs.get(clubKey(values.club!));
    if (!COMPETITIONS.includes(competition))
      problems.push(
        `${file}:${line}: competition "${values.competition}" must be UCL, UEL or UECL`,
      );
    if (!Number.isInteger(position) || position < 1 || position > 36)
      problems.push(`${file}:${line}: position "${values.position}" must be 1 to 36`);
    if (!club) problems.push(`${file}:${line}: club "${values.club}" is not in clubs.csv`);
    const key = `${competition}|${position}`;
    if (taken.has(key))
      problems.push(`${file}:${line}: ${competition} position ${position} is listed twice`);
    taken.add(key);
    if (club) out.push({ competition, position, club: club.name });
  }
  if (problems.length) throw new UefaDataError(problems);
  return out;
}
