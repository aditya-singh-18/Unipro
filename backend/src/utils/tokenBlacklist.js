import pool from '../config/db.js';

/*
SECURITY: In production with high traffic, replace direct DB calls with Redis for O(1) lookups.
Install ioredis and use SET jti EX <ttl_seconds> for revocation.
*/

export const revokeToken = async (jti, userKey, expiresAt) => {
  if (!jti || !userKey || !expiresAt) {
    return;
  }

  await pool.query(
    `
      INSERT INTO token_blacklist (jti, user_key, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (jti) DO NOTHING
    `,
    [jti, userKey, expiresAt]
  );
};

export const isTokenRevoked = async (jti) => {
  if (!jti) {
    return false;
  }

  const result = await pool.query('SELECT 1 FROM token_blacklist WHERE jti = $1 LIMIT 1', [jti]);
  return result.rowCount > 0;
};

export const cleanupExpiredTokens = async () => {
  const result = await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
  return result.rowCount || 0;
};
