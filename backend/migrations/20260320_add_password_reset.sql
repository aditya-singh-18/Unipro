ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_password_token TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_reset_token
ON users(reset_password_token)
WHERE reset_password_token IS NOT NULL;
