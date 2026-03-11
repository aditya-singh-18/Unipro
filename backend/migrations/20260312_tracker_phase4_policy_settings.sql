-- Phase 4 / P2: tracker policy settings for admin-managed SLA thresholds

CREATE TABLE IF NOT EXISTS tracker_policy_settings (
  policy_key VARCHAR PRIMARY KEY,
  policy_value JSONB NOT NULL,
  updated_by VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracker_policy_updated_at
  ON tracker_policy_settings (updated_at DESC);
