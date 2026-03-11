-- Phase 3 P0-1: escalation support indexes and timeline event tracking aid

CREATE INDEX IF NOT EXISTS idx_project_weeks_status_deadline
  ON project_weeks (status, deadline_at);

CREATE INDEX IF NOT EXISTS idx_week_submissions_week_revision
  ON week_submissions (week_id, revision_no DESC);

CREATE INDEX IF NOT EXISTS idx_project_activity_timeline_project_event_created
  ON project_activity_timeline (project_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (LOWER(role));
