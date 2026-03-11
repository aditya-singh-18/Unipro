-- Tracker Phase 1 Schema
-- Date: 2026-03-11
-- Notes:
-- 1) This migration creates tracker tables only.
-- 2) Existing tables (projects, users, mentor_profiles) are not altered.
-- 3) Apply only after team approval.

BEGIN;

-- Common updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- 1) Project Weeks
-- ==============================
CREATE TABLE IF NOT EXISTS project_weeks (
  week_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  phase_name VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'missed', 'locked')),
  starts_on DATE,
  deadline_at TIMESTAMP,
  locked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_project_weeks_project_id ON project_weeks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_weeks_status ON project_weeks(status);
CREATE INDEX IF NOT EXISTS idx_project_weeks_deadline ON project_weeks(deadline_at);

DROP TRIGGER IF EXISTS trg_project_weeks_updated_at ON project_weeks;
CREATE TRIGGER trg_project_weeks_updated_at
BEFORE UPDATE ON project_weeks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ==============================
-- 2) Weekly Submissions
-- ==============================
CREATE TABLE IF NOT EXISTS week_submissions (
  submission_id BIGSERIAL PRIMARY KEY,
  week_id BIGINT NOT NULL REFERENCES project_weeks(week_id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  revision_no INT NOT NULL DEFAULT 1,
  submitted_by_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE RESTRICT,
  summary_of_work TEXT NOT NULL,
  blockers TEXT,
  next_week_plan TEXT,
  github_link_snapshot TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (week_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_week_submissions_week_id ON week_submissions(week_id);
CREATE INDEX IF NOT EXISTS idx_week_submissions_project_id ON week_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_week_submissions_submitted_by ON week_submissions(submitted_by_user_key);
CREATE INDEX IF NOT EXISTS idx_week_submissions_submitted_at ON week_submissions(submitted_at DESC);

-- ==============================
-- 3) Submission Files
-- ==============================
CREATE TABLE IF NOT EXISTS week_submission_files (
  file_id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES week_submissions(submission_id) ON DELETE CASCADE,
  version_no INT NOT NULL DEFAULT 1,
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR,
  file_size_bytes BIGINT,
  uploaded_by_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE RESTRICT,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (submission_id, version_no, file_name)
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON week_submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_uploaded_by ON week_submission_files(uploaded_by_user_key);

-- ==============================
-- 4) Weekly Reviews (Mentor)
-- ==============================
CREATE TABLE IF NOT EXISTS week_reviews (
  review_id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES week_submissions(submission_id) ON DELETE CASCADE,
  week_id BIGINT NOT NULL REFERENCES project_weeks(week_id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  reviewer_employee_id VARCHAR NOT NULL REFERENCES mentor_profiles(employee_id) ON DELETE RESTRICT,
  action VARCHAR NOT NULL CHECK (action IN ('approve', 'reject')),
  review_comment TEXT,
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_week_reviews_week_id ON week_reviews(week_id);
CREATE INDEX IF NOT EXISTS idx_week_reviews_project_id ON week_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_week_reviews_reviewer ON week_reviews(reviewer_employee_id);
CREATE INDEX IF NOT EXISTS idx_week_reviews_reviewed_at ON week_reviews(reviewed_at DESC);

-- ==============================
-- 5) Project Tasks (Kanban)
-- ==============================
CREATE TABLE IF NOT EXISTS project_tasks (
  task_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  week_id BIGINT REFERENCES project_weeks(week_id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  priority VARCHAR NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  assigned_to_user_key VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  due_date DATE,
  created_by_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to_user_key);
CREATE INDEX IF NOT EXISTS idx_project_tasks_week_id ON project_tasks(week_id);

DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER trg_project_tasks_updated_at
BEFORE UPDATE ON project_tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ==============================
-- 6) Milestones
-- ==============================
CREATE TABLE IF NOT EXISTS project_milestones (
  milestone_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  target_week_number INT NOT NULL,
  due_date DATE,
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'achieved', 'missed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);

DROP TRIGGER IF EXISTS trg_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER trg_project_milestones_updated_at
BEFORE UPDATE ON project_milestones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ==============================
-- 7) Risk Snapshots
-- ==============================
CREATE TABLE IF NOT EXISTS project_risk_snapshots (
  risk_snapshot_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_risk_project_id ON project_risk_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risk_level ON project_risk_snapshots(risk_level);
CREATE INDEX IF NOT EXISTS idx_project_risk_calculated_at ON project_risk_snapshots(calculated_at DESC);

-- ==============================
-- 8) Health Snapshots
-- ==============================
CREATE TABLE IF NOT EXISTS project_health_snapshots (
  health_snapshot_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  health_score NUMERIC(5,2) NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  task_completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  deadline_adherence_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  review_acceptance_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  activity_signal_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_health_project_id ON project_health_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_health_score ON project_health_snapshots(health_score);
CREATE INDEX IF NOT EXISTS idx_project_health_calculated_at ON project_health_snapshots(calculated_at DESC);

-- ==============================
-- 9) Tracker Timeline (Audit)
-- ==============================
CREATE TABLE IF NOT EXISTS project_activity_timeline (
  timeline_id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  week_id BIGINT REFERENCES project_weeks(week_id) ON DELETE SET NULL,
  event_type VARCHAR NOT NULL,
  actor_user_key VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  actor_role VARCHAR,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON project_activity_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_week_id ON project_activity_timeline(week_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON project_activity_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON project_activity_timeline(created_at DESC);

COMMIT;
