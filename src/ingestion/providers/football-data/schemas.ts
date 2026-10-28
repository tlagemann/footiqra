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

export type FdMatch = z.infer<typeof fdMatchSchema>;
export type FdMatchList = z.infer<typeof fdMatchListSchema>;
