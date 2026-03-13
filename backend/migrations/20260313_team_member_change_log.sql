-- Team member change log for enforcing max_member_change_allowed
-- Date: 2026-03-13

BEGIN;

CREATE TABLE IF NOT EXISTS team_member_change_log (
  change_id BIGSERIAL PRIMARY KEY,
  team_id VARCHAR NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  enrollment_id VARCHAR NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('ADD', 'REMOVE')),
  acted_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_member_change_log_team_id
  ON team_member_change_log(team_id);

CREATE INDEX IF NOT EXISTS idx_team_member_change_log_created_at
  ON team_member_change_log(created_at DESC);

COMMIT;
