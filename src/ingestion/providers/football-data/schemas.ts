import { z } from "zod";

/**
 * Validation schemas for football-data.org API v4 responses.
 *
 * Only the fields Footiqra needs are declared; unknown fields are ignored
 * (zod's default "strip" behaviour), so additive API changes do not break us,
 * while missing or mistyped required fields fail loudly at ingestion time.
 *
 * Reference: https://docs.football-data.org/general/v4/match.html
 */

export const MATCH_STATUSES = [
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "SUSPENDED",
  "POSTPONED",
  "CANCELLED",
  "AWARDED",
] as const;

const goals = z.number().int().nonnegative().nullable();

export const fdTeamRefSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  shortName: z.string().nullable().optional(),
  tla: z.string().nullable().optional(),
  crest: z.string().nullable().optional(),
});

export const fdMatchSchema = z.object({
  id: z.number().int(),
  utcDate: z.iso.datetime({ offset: true }),
  status: z.enum(MATCH_STATUSES),
  matchday: z.number().int().nullable(),
  stage: z.string(),
  lastUpdated: z.iso.datetime({ offset: true }),
  homeTeam: fdTeamRefSchema,
  awayTeam: fdTeamRefSchema,
  score: z.object({
    winner: z.string().nullable(),
    duration: z.string(),
    fullTime: z.object({ home: goals, away: goals }),
    halfTime: z.object({ home: goals, away: goals }).optional(),
  }),
  season: z
    .object({
      id: z.number().int(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
});

export const fdMatchListSchema = z.object({
  matches: z.array(fdMatchSchema),
});

export type FdTeamRef = z.infer<typeof fdTeamRefSchema>;
export type FdMatch = z.infer<typeof fdMatchSchema>;
export type FdMatchList = z.infer<typeof fdMatchListSchema>;

/** One row of a league table. Reference: https://docs.football-data.org/general/v4/competition.html */
export const fdStandingRowSchema = z.object({
  position: z.number().int().positive(),
  team: fdTeamRefSchema,
  playedGames: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  draw: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  points: z.number().int(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  goalDifference: z.number().int(),
});

export const fdStandingsSchema = z.object({
  standings: z.array(
    z.object({
      stage: z.string(),
      type: z.string(),
      group: z.string().nullable().optional(),
      table: z.array(fdStandingRowSchema),
    }),
  ),
});

export type FdStandingRow = z.infer<typeof fdStandingRowSchema>;

/** Teams of a competition with club details. Reference: https://docs.football-data.org/general/v4/team.html */
export const fdCompetitionTeamsSchema = z.object({
  teams: z.array(
    z.object({
      id: z.number().int(),
      venue: z.string().nullable().optional(),
      founded: z.number().int().nullable().optional(),
    }),
  ),
});

/** League top scorers. Reference: https://docs.football-data.org/general/v4/competition.html */
export const fdScorersSchema = z.object({
  scorers: z.array(
    z.object({
      player: z.object({ id: z.number().int(), name: z.string().min(1) }),
      team: z.object({ id: z.number().int() }),
      playedMatches: z.number().int().nullable().optional(),
      goals: z.number().int().nullable(),
      assists: z.number().int().nullable().optional(),
      penalties: z.number().int().nullable().optional(),
    }),
  ),
});

export type FdCompetitionTeam = z.infer<typeof fdCompetitionTeamsSchema>["teams"][number];
export type FdScorer = z.infer<typeof fdScorersSchema>["scorers"][number];
