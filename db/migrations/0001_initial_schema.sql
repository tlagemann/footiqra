-- Footiqra: initial PostgreSQL schema (Phase 1 draft, not yet applied anywhere)
--
-- Principles
--  * Provider-independent core tables (competitions, seasons, teams, matches).
--  * External ids live in mapping tables, so a provider switch does not change internal ids.
--  * Natural/unique keys + ON CONFLICT upserts prevent duplicate records.
--  * Rankings are stored per calculation run, so history is never overwritten.
--  * Every ingestion run is logged with status and timestamps ("last successful update").

BEGIN;

CREATE TABLE competitions (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,                 -- "premier-league"
  name          TEXT NOT NULL,
  country_code  TEXT NOT NULL,                        -- "GB-ENG", "DE", ...
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seasons (
  id              BIGSERIAL PRIMARY KEY,
  competition_id  BIGINT NOT NULL REFERENCES competitions (id),
  label           TEXT NOT NULL,                      -- "2026-27"
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  UNIQUE (competition_id, label),
  CHECK (end_date > start_date)
);

CREATE TABLE teams (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,                   -- URL: /teams/{slug}/
  name        TEXT NOT NULL,
  short_name  TEXT,
  tla         TEXT,
  crest_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which competition a team plays in per season (teams move via promotion/relegation).
CREATE TABLE season_teams (
  season_id  BIGINT NOT NULL REFERENCES seasons (id),
  team_id    BIGINT NOT NULL REFERENCES teams (id),
  PRIMARY KEY (season_id, team_id)
);

-- Provider id mapping, e.g. ('football-data', 'team', '57') -> teams.id
CREATE TABLE external_ids (
  provider     TEXT NOT NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('competition', 'season', 'team', 'match')),
  external_id  TEXT NOT NULL,
  internal_id  BIGINT NOT NULL,
  PRIMARY KEY (provider, entity_type, external_id),
  UNIQUE (provider, entity_type, internal_id)
);

CREATE TYPE match_status AS ENUM (
  'scheduled', 'in_play', 'finished', 'postponed', 'suspended', 'cancelled', 'awarded'
);

CREATE TABLE matches (
  id             BIGSERIAL PRIMARY KEY,
  season_id      BIGINT NOT NULL REFERENCES seasons (id),
  matchday       INTEGER,
  stage          TEXT,
  kickoff_utc    TIMESTAMPTZ NOT NULL,
  status         match_status NOT NULL,
  home_team_id   BIGINT NOT NULL REFERENCES teams (id),
  away_team_id   BIGINT NOT NULL REFERENCES teams (id),
  home_goals     SMALLINT CHECK (home_goals >= 0),
  away_goals     SMALLINT CHECK (away_goals >= 0),
  duration       TEXT,                                -- REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT
  neutral_venue  BOOLEAN NOT NULL DEFAULT false,
  source_updated_at TIMESTAMPTZ,                      -- provider's lastUpdated
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id),
  CHECK (status <> 'finished' OR (home_goals IS NOT NULL AND away_goals IS NOT NULL))
);
-- Safety net against duplicates even if external id mapping fails.
CREATE UNIQUE INDEX matches_natural_key ON matches (season_id, home_team_id, away_team_id, kickoff_utc);
CREATE INDEX matches_team_lookup_home ON matches (home_team_id, kickoff_utc);
CREATE INDEX matches_team_lookup_away ON matches (away_team_id, kickoff_utc);
CREATE INDEX matches_status_kickoff ON matches (status, kickoff_utc);

-- League table snapshots as delivered by the provider (one row per team per snapshot).
CREATE TABLE standings_snapshots (
  id           BIGSERIAL PRIMARY KEY,
  season_id    BIGINT NOT NULL REFERENCES seasons (id),
  captured_at  TIMESTAMPTZ NOT NULL,
  matchday     INTEGER,
  UNIQUE (season_id, captured_at)
);

CREATE TABLE standings_rows (
  snapshot_id    BIGINT NOT NULL REFERENCES standings_snapshots (id) ON DELETE CASCADE,
  team_id        BIGINT NOT NULL REFERENCES teams (id),
  position       SMALLINT NOT NULL,
  played         SMALLINT NOT NULL,
  won            SMALLINT NOT NULL,
  drawn          SMALLINT NOT NULL,
  lost           SMALLINT NOT NULL,
  goals_for      SMALLINT NOT NULL,
  goals_against  SMALLINT NOT NULL,
  points         SMALLINT NOT NULL,
  PRIMARY KEY (snapshot_id, team_id)
);

-- One row per ranking calculation. History is append-only.
CREATE TABLE ranking_runs (
  id              BIGSERIAL PRIMARY KEY,
  model           TEXT NOT NULL,                      -- e.g. "elo-v0"
  model_params    JSONB NOT NULL,                     -- exact parameters used
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_cutoff_utc TIMESTAMPTZ NOT NULL,               -- latest match included
  is_published    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE team_ratings (
  run_id          BIGINT NOT NULL REFERENCES ranking_runs (id) ON DELETE CASCADE,
  team_id         BIGINT NOT NULL REFERENCES teams (id),
  rank            INTEGER NOT NULL CHECK (rank > 0),
  rating          NUMERIC(8, 2) NOT NULL,
  matches_played  INTEGER NOT NULL,
  PRIMARY KEY (run_id, team_id)
);
CREATE INDEX team_ratings_history ON team_ratings (team_id, run_id);

-- Ingestion log: drives "last updated" display, monitoring and request budgeting.
CREATE TABLE ingestion_runs (
  id             BIGSERIAL PRIMARY KEY,
  provider       TEXT NOT NULL,
  job            TEXT NOT NULL,                       -- "matches", "standings", "rankings"
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  requests_made  INTEGER NOT NULL DEFAULT 0,
  rows_upserted  INTEGER NOT NULL DEFAULT 0,
  error_message  TEXT                                  -- never contains secrets
);
CREATE INDEX ingestion_runs_latest_success ON ingestion_runs (job, finished_at DESC) WHERE status = 'success';

-- Raw response cache: replay/debug without spending API quota.
CREATE TABLE api_cache (
  provider      TEXT NOT NULL,
  request_key   TEXT NOT NULL,                        -- normalised path + query
  fetched_at    TIMESTAMPTZ NOT NULL,
  http_status   SMALLINT NOT NULL,
  payload       JSONB NOT NULL,
  PRIMARY KEY (provider, request_key)
);

CREATE TABLE schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations (version) VALUES ('0001_initial_schema');

COMMIT;
