-- Mentor assignment foundation: settings, mentor capacity columns, recommendation audit tables
-- Date: 2026-03-13

BEGIN;

ALTER TABLE admin_system_settings
  ADD COLUMN IF NOT EXISTS mentor_assignment_mode VARCHAR(32) NOT NULL DEFAULT 'manual_only',
  ADD COLUMN IF NOT EXISTS mentor_auto_assign_threshold NUMERIC(5,2) NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS mentor_default_max_active_projects INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mentor_recommendation_top_n INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS mentor_load_balance_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE mentor_profiles
  ADD COLUMN IF NOT EXISTS available_for_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_active_projects INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS assignment_priority INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS mentor_assignment_recommendations (
  recommendation_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  batch_key VARCHAR(64) NOT NULL,
  mentor_employee_id VARCHAR NOT NULL REFERENCES mentor_profiles(employee_id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  track_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  tech_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  proficiency_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  workload_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  fairness_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  reason_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_recommendations_project_created
  ON mentor_assignment_recommendations(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_recommendations_project_batch_rank
  ON mentor_assignment_recommendations(project_id, batch_key, rank_position);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_recommendations_mentor_created
  ON mentor_assignment_recommendations(mentor_employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_recommendations_selected
  ON mentor_assignment_recommendations(project_id, is_selected);

CREATE TABLE IF NOT EXISTS mentor_assignment_audit (
  audit_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  mentor_employee_id VARCHAR REFERENCES mentor_profiles(employee_id) ON DELETE SET NULL,
  decision_source VARCHAR(40) NOT NULL,
  recommended_score NUMERIC(6,2),
  approved_by VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  auto_assigned BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_audit_project_created
  ON mentor_assignment_audit(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_assignment_audit_mentor_created
  ON mentor_assignment_audit(mentor_employee_id, created_at DESC);

COMMIT;