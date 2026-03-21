BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS daily_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES project_tasks(task_id) ON DELETE SET NULL,
  week_id BIGINT REFERENCES project_weeks(week_id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  what_i_did TEXT NOT NULL CHECK (char_length(what_i_did) >= 10),
  what_i_will_do TEXT NOT NULL,
  blockers TEXT,
  tag TEXT NOT NULL DEFAULT 'progress' CHECK (tag IN ('progress', 'done', 'fix', 'review', 'blocker', 'meeting')),
  commit_count INTEGER NOT NULL DEFAULT 0,
  commit_link VARCHAR(500),
  hours_spent NUMERIC(3,1),
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_key, project_id, log_date)
);

CREATE TABLE IF NOT EXISTS progress_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  git_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  task_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  submission_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  log_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  days_since_commit INTEGER NOT NULL DEFAULT 0,
  overdue_task_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_key, project_id, week_number)
);

CREATE TABLE IF NOT EXISTS github_commits (
  commit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  sha VARCHAR(40) NOT NULL UNIQUE,
  message TEXT,
  committed_at TIMESTAMPTZ NOT NULL,
  branch VARCHAR(200),
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  is_merge_commit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_employee_id VARCHAR NOT NULL REFERENCES mentor_profiles(employee_id) ON DELETE CASCADE,
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL DEFAULT 'general' CHECK (reference_type IN ('submission', 'task', 'general')),
  reference_id VARCHAR,
  message TEXT NOT NULL CHECK (char_length(message) >= 5),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  student_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS github_webhook_secret VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scoring_weights JSONB NOT NULL DEFAULT '{"git":30,"tasks":35,"sub":25,"logs":10}'::jsonb;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_username VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON daily_logs(project_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_student_project ON daily_logs(student_user_key, project_id);
CREATE INDEX IF NOT EXISTS idx_progress_scores_project_week ON progress_scores(project_id, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_progress_scores_risk ON progress_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_github_commits_student_project_date ON github_commits(student_user_key, project_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_student_created ON mentor_feedback(student_user_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_created ON mentor_feedback(mentor_employee_id, created_at DESC);

COMMIT;
