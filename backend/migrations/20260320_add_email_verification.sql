ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verify_token TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verify_token_expires TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_verify_token
ON users(email_verify_token)
WHERE email_verify_token IS NOT NULL;
