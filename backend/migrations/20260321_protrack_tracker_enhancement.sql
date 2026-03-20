-- ProTrack Tracker Enhancement Migration
-- Date: 2026-03-21
-- Purpose: Add daily_logs, progress_scores, github_commits, and mentor_feedback tables
-- IMPORTANT: This migration uses VARCHAR FKs matching existing schema (not UUID)
-- DO NOT modify existing tracker tables

BEGIN;

-- ==============================
-- 1) Daily Logs
-- ==============================
CREATE TABLE IF NOT EXISTS daily_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES project_tasks(task_id) ON DELETE SET NULL,
  week_id BIGINT REFERENCES project_weeks(week_id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  what_i_did TEXT NOT NULL CHECK (length(what_i_did) >= 10),
  what_i_will_do TEXT NOT NULL,
  blockers TEXT,
  tag TEXT NOT NULL DEFAULT 'progress'
    CHECK (tag IN ('progress', 'done', 'fix', 'review', 'blocker', 'meeting')),
  commit_count INTEGER DEFAULT 0,
  commit_link VARCHAR(500),
  hours_spent NUMERIC(3,1),
  is_late BOOLEAN DEFAULT false,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_user_key, project_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_student_user_key ON daily_logs(student_user_key);
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_id ON daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_task_id ON daily_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_week_id ON daily_logs(week_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_tag ON daily_logs(tag);
CREATE INDEX IF NOT EXISTS idx_daily_logs_created_at ON daily_logs(created_at DESC);

-- ==============================
-- 2) Progress Scores
-- ==============================
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
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  streak_days INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  days_since_commit INTEGER NOT NULL DEFAULT 0,
  overdue_task_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_user_key, project_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_progress_scores_student_user_key ON progress_scores(student_user_key);
CREATE INDEX IF NOT EXISTS idx_progress_scores_project_id ON progress_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_scores_week_number ON progress_scores(week_number);
CREATE INDEX IF NOT EXISTS idx_progress_scores_total_score ON progress_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_progress_scores_risk_level ON progress_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_progress_scores_calculated_at ON progress_scores(calculated_at DESC);

-- ==============================
-- 3) GitHub Commits
-- ==============================
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
  is_merge_commit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_commits_student_user_key ON github_commits(student_user_key);
CREATE INDEX IF NOT EXISTS idx_github_commits_project_id ON github_commits(project_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_sha ON github_commits(sha);
CREATE INDEX IF NOT EXISTS idx_github_commits_committed_at ON github_commits(committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_commits_created_at ON github_commits(created_at DESC);

-- ==============================
-- 4) Mentor Feedback
-- ==============================
CREATE TABLE IF NOT EXISTS mentor_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_employee_id VARCHAR NOT NULL REFERENCES mentor_profiles(employee_id) ON DELETE CASCADE,
  student_user_key VARCHAR NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  reference_type TEXT CHECK (reference_type IN ('submission', 'task', 'general')),
  reference_id VARCHAR,
  message TEXT NOT NULL CHECK (length(message) >= 5),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_read BOOLEAN NOT NULL DEFAULT false,
  student_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_employee_id ON mentor_feedback(mentor_employee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_student_user_key ON mentor_feedback(student_user_key);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_project_id ON mentor_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_reference_type ON mentor_feedback(reference_type);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_is_read ON mentor_feedback(is_read);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_created_at ON mentor_feedback(created_at DESC);

COMMIT;
