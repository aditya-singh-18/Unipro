-- Tracker Phase 2: Reminder de-duplication log
-- Date: 2026-03-11

BEGIN;

CREATE TABLE IF NOT EXISTS tracker_notification_dispatch_log (
  dispatch_id BIGSERIAL PRIMARY KEY,
  dedupe_key VARCHAR NOT NULL UNIQUE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  week_id BIGINT REFERENCES project_weeks(week_id) ON DELETE SET NULL,
  recipient_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  dispatched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracker_dispatch_project_id
  ON tracker_notification_dispatch_log(project_id);

CREATE INDEX IF NOT EXISTS idx_tracker_dispatch_week_id
  ON tracker_notification_dispatch_log(week_id);

CREATE INDEX IF NOT EXISTS idx_tracker_dispatch_recipient
  ON tracker_notification_dispatch_log(recipient_user_key);

CREATE INDEX IF NOT EXISTS idx_tracker_dispatch_type
  ON tracker_notification_dispatch_log(notification_type);

CREATE INDEX IF NOT EXISTS idx_tracker_dispatch_dispatched_at
  ON tracker_notification_dispatch_log(dispatched_at DESC);

COMMIT;
