-- Phase 2 P1: Student weekly draft autosave
-- Date: 2026-03-11

BEGIN;

CREATE TABLE IF NOT EXISTS project_week_drafts (
  week_id     BIGINT      NOT NULL REFERENCES project_weeks(week_id) ON DELETE CASCADE,
  author_user_key VARCHAR  NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  draft_data  JSONB       NOT NULL DEFAULT '{}',
  saved_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (week_id, author_user_key)
);

CREATE INDEX IF NOT EXISTS idx_week_drafts_author
  ON project_week_drafts(author_user_key);

COMMIT;
