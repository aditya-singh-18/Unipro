ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_super_admin
ON users(is_super_admin)
WHERE is_super_admin = TRUE;

-- Only 1-2 accounts should ever have is_super_admin = TRUE. Set manually in DB.
