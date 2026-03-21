BEGIN;

ALTER TABLE admin_system_settings
  ADD COLUMN IF NOT EXISTS auth_rate_limit_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS student_auth_rate_limit_max INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS mentor_auth_rate_limit_max INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS admin_auth_rate_limit_max INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS student_auth_rate_limit_window_ms INTEGER NOT NULL DEFAULT 900000,
  ADD COLUMN IF NOT EXISTS mentor_auth_rate_limit_window_ms INTEGER NOT NULL DEFAULT 900000,
  ADD COLUMN IF NOT EXISTS admin_auth_rate_limit_window_ms INTEGER NOT NULL DEFAULT 900000;

ALTER TABLE admin_system_settings
  DROP CONSTRAINT IF EXISTS admin_system_settings_student_auth_rate_limit_max_check,
  DROP CONSTRAINT IF EXISTS admin_system_settings_mentor_auth_rate_limit_max_check,
  DROP CONSTRAINT IF EXISTS admin_system_settings_admin_auth_rate_limit_max_check,
  DROP CONSTRAINT IF EXISTS admin_system_settings_student_auth_rate_limit_window_ms_check,
  DROP CONSTRAINT IF EXISTS admin_system_settings_mentor_auth_rate_limit_window_ms_check,
  DROP CONSTRAINT IF EXISTS admin_system_settings_admin_auth_rate_limit_window_ms_check;

ALTER TABLE admin_system_settings
  ADD CONSTRAINT admin_system_settings_student_auth_rate_limit_max_check CHECK (student_auth_rate_limit_max >= 1 AND student_auth_rate_limit_max <= 200),
  ADD CONSTRAINT admin_system_settings_mentor_auth_rate_limit_max_check CHECK (mentor_auth_rate_limit_max >= 1 AND mentor_auth_rate_limit_max <= 200),
  ADD CONSTRAINT admin_system_settings_admin_auth_rate_limit_max_check CHECK (admin_auth_rate_limit_max >= 1 AND admin_auth_rate_limit_max <= 200),
  ADD CONSTRAINT admin_system_settings_student_auth_rate_limit_window_ms_check CHECK (student_auth_rate_limit_window_ms >= 1000 AND student_auth_rate_limit_window_ms <= 3600000),
  ADD CONSTRAINT admin_system_settings_mentor_auth_rate_limit_window_ms_check CHECK (mentor_auth_rate_limit_window_ms >= 1000 AND mentor_auth_rate_limit_window_ms <= 3600000),
  ADD CONSTRAINT admin_system_settings_admin_auth_rate_limit_window_ms_check CHECK (admin_auth_rate_limit_window_ms >= 1000 AND admin_auth_rate_limit_window_ms <= 3600000);

COMMIT;
