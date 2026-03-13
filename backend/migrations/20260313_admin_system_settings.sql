-- Admin system settings and project cycle configuration
-- Date: 2026-03-13

BEGIN;

CREATE TABLE IF NOT EXISTS admin_system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,

  university_name VARCHAR(180) NOT NULL DEFAULT 'ABC University',
  department_name VARCHAR(180) NOT NULL DEFAULT 'Computer Science Engineering',
  academic_year VARCHAR(32) NOT NULL DEFAULT '2026-2027',
  semesters JSONB NOT NULL DEFAULT '["Semester 7","Semester 8"]'::jsonb,

  allow_student_login BOOLEAN NOT NULL DEFAULT TRUE,
  allow_mentor_login BOOLEAN NOT NULL DEFAULT TRUE,
  allow_team_creation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_project_creation BOOLEAN NOT NULL DEFAULT TRUE,

  max_projects_per_student INTEGER NOT NULL DEFAULT 1 CHECK (max_projects_per_student >= 1),
  max_projects_per_team INTEGER NOT NULL DEFAULT 1 CHECK (max_projects_per_team >= 1),
  max_teams_per_project_idea INTEGER NOT NULL DEFAULT 1 CHECK (max_teams_per_project_idea >= 1),

  default_project_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  default_submission_status VARCHAR(40) NOT NULL DEFAULT 'pending',

  project_start_date DATE,
  project_end_date DATE,
  total_project_weeks INTEGER NOT NULL DEFAULT 20 CHECK (total_project_weeks >= 1 AND total_project_weeks <= 52),
  days_per_week INTEGER NOT NULL DEFAULT 7 CHECK (days_per_week >= 1 AND days_per_week <= 7),
  submission_allowed_days JSONB NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]'::jsonb,
  deadline_day VARCHAR(16) NOT NULL DEFAULT 'sunday',
  deadline_time TIME NOT NULL DEFAULT '23:59:00',

  grace_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  grace_period_hours INTEGER NOT NULL DEFAULT 24 CHECK (grace_period_hours >= 0 AND grace_period_hours <= 168),
  auto_lock_week_after_deadline BOOLEAN NOT NULL DEFAULT TRUE,
  allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
  mark_week_as_missed_automatically BOOLEAN NOT NULL DEFAULT TRUE,
  allow_admin_unlock_week BOOLEAN NOT NULL DEFAULT TRUE,

  min_team_size INTEGER NOT NULL DEFAULT 2 CHECK (min_team_size >= 1),
  max_team_size INTEGER NOT NULL DEFAULT 4 CHECK (max_team_size >= 1),
  allow_solo_projects BOOLEAN NOT NULL DEFAULT FALSE,
  max_teams_per_student INTEGER NOT NULL DEFAULT 3 CHECK (max_teams_per_student >= 1),
  max_teams_per_project INTEGER NOT NULL DEFAULT 1 CHECK (max_teams_per_project >= 1),
  team_leader_required BOOLEAN NOT NULL DEFAULT TRUE,
  allow_leader_change BOOLEAN NOT NULL DEFAULT FALSE,
  allow_member_add_after_creation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_member_removal BOOLEAN NOT NULL DEFAULT TRUE,
  max_member_change_allowed INTEGER NOT NULL DEFAULT 2 CHECK (max_member_change_allowed >= 0),
  auto_lock_team_after_project_approval BOOLEAN NOT NULL DEFAULT TRUE,
  lock_team_after_week INTEGER NOT NULL DEFAULT 2 CHECK (lock_team_after_week >= 1 AND lock_team_after_week <= 52),

  enable_weekly_submissions BOOLEAN NOT NULL DEFAULT TRUE,
  total_submission_weeks INTEGER NOT NULL DEFAULT 20 CHECK (total_submission_weeks >= 1 AND total_submission_weeks <= 52),
  required_submission_fields JSONB NOT NULL DEFAULT '["progress_description","github_repository_link","file_upload"]'::jsonb,
  allowed_file_types JSONB NOT NULL DEFAULT '["pdf","docx","ppt","zip"]'::jsonb,
  max_file_size_mb INTEGER NOT NULL DEFAULT 20 CHECK (max_file_size_mb >= 1 AND max_file_size_mb <= 100),
  max_files_per_submission INTEGER NOT NULL DEFAULT 3 CHECK (max_files_per_submission >= 1 AND max_files_per_submission <= 20),
  allow_resubmission BOOLEAN NOT NULL DEFAULT TRUE,
  max_resubmissions INTEGER NOT NULL DEFAULT 2 CHECK (max_resubmissions >= 0 AND max_resubmissions <= 20),
  late_submission_penalty_percent NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (late_submission_penalty_percent >= 0 AND late_submission_penalty_percent <= 100),
  auto_lock_week_after_review BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,

  CONSTRAINT admin_system_settings_singleton CHECK (id = 1),
  CONSTRAINT admin_system_settings_team_size_check CHECK (max_team_size >= min_team_size),
  CONSTRAINT admin_system_settings_date_check CHECK (project_end_date IS NULL OR project_start_date IS NULL OR project_end_date >= project_start_date)
);

CREATE INDEX IF NOT EXISTS idx_admin_system_settings_updated_at
  ON admin_system_settings(updated_at DESC);

CREATE TABLE IF NOT EXISTS project_cycles (
  cycle_id BIGSERIAL PRIMARY KEY,
  cycle_name VARCHAR(180) NOT NULL,
  batch_start_year INTEGER NOT NULL CHECK (batch_start_year >= 2000),
  batch_end_year INTEGER NOT NULL CHECK (batch_end_year >= batch_start_year),
  project_mode VARCHAR(24) NOT NULL DEFAULT 'team_based' CHECK (project_mode IN ('team_based', 'individual', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  updated_by VARCHAR REFERENCES users(user_key) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_cycles_name
  ON project_cycles(cycle_name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_cycles_active
  ON project_cycles(is_active)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS admin_system_settings_audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  actor_user_key VARCHAR REFERENCES users(user_key) ON DELETE SET NULL,
  action_type VARCHAR(32) NOT NULL,
  section_name VARCHAR(64) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_system_settings_audit_created_at
  ON admin_system_settings_audit_log(created_at DESC);

INSERT INTO admin_system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_cycles (cycle_name, batch_start_year, batch_end_year, project_mode, is_active)
VALUES ('Final Year Major Project', 2023, 2027, 'team_based', TRUE)
ON CONFLICT (cycle_name) DO NOTHING;

COMMIT;
