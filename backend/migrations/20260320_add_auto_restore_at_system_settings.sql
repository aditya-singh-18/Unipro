ALTER TABLE admin_system_settings
ADD COLUMN IF NOT EXISTS auto_restore_at TIMESTAMPTZ NULL;
