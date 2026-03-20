import { findUserByIdentifier } from '../repositories/user.repo.js';
import { comparePassword } from '../utils/password.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { getPublicSystemAccessService } from './systemSettings.service.js';
import { revokeToken } from '../utils/tokenBlacklist.js';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';
import { validateAndHashPassword } from '../utils/passwordPolicy.js';

export const loginService = async (identifier, password, selectedRole) => {
  const access = await getPublicSystemAccessService();

  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw { status: 401, message: 'Invalid credentials.' };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw {
      status: 429,
      message: `Account temporarily locked due to too many failed attempts. Try again at ${new Date(
        user.locked_until
      ).toISOString()}.`,
      lockedUntil: user.locked_until,
    };
  }

  if (user.locked_until && new Date(user.locked_until) <= new Date()) {
    await pool.query(
      `
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL, last_failed_login = NULL
        WHERE user_key = $1
      `,
      [user.user_key]
    );
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }

  if (!user.is_active) {
    throw { status: 403, message: 'Account is inactive' };
  }

  const userRole = user.role?.toUpperCase();
  const requestedRole = selectedRole?.toUpperCase();

  if (requestedRole === 'STUDENT' && !access.allow_student_login) {
    throw { status: 403, message: 'Student login is currently disabled by admin' };
  }

  if (requestedRole === 'MENTOR' && !access.allow_mentor_login) {
    throw { status: 403, message: 'Mentor login is currently disabled by admin' };
  }

  // ✅ ROLE CHECK (case-insensitive)
  if (!userRole || !requestedRole || userRole !== requestedRole) {
    throw { status: 403, message: 'Selected role is not allowed for this login' };
  }

  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    const failedLoginAttempts = Number(user.failed_login_attempts || 0) + 1;
    let lockedUntil = null;

    if (failedLoginAttempts >= 20) {
      lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (failedLoginAttempts >= 10) {
      lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
    } else if (failedLoginAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await pool.query(
      `
        UPDATE users
        SET
          failed_login_attempts = $1,
          locked_until = $2,
          last_failed_login = NOW()
        WHERE user_key = $3
      `,
      [failedLoginAttempts, lockedUntil, user.user_key]
    );

    throw {
      status: 401,
      message: 'Invalid credentials.',
      attemptsRemaining: Math.max(0, 5 - failedLoginAttempts),
    };
  }

  await pool.query(
    `
      UPDATE users
      SET failed_login_attempts = 0, locked_until = NULL, last_failed_login = NULL
      WHERE user_key = $1
    `,
    [user.user_key]
  );

  const token = generateToken({
    user_key: user.user_key,
    role: userRole,
    is_super_admin: Boolean(user.is_super_admin),
    token_version: Number(user.token_version || 0),
  });

  return {
    token,
    user: {
      user_key: user.user_key,
      role: userRole,
      email: user.email,
      is_super_admin: Boolean(user.is_super_admin),
      token_version: Number(user.token_version || 0),
    },
  };
};

export const logoutService = async ({ token, userKey }) => {
  if (!token || !userKey) {
    return;
  }

  const decoded = jwt.decode(token);
  const tokenJti = decoded?.jti;
  const tokenExp = decoded?.exp;

  if (!tokenJti || !tokenExp) {
    return;
  }

  await revokeToken(tokenJti, userKey, new Date(tokenExp * 1000));
};

export const verifyEmailService = async (token) => {
  if (!token) {
    throw {
      status: 400,
      message: 'Invalid or expired verification link. Please contact your administrator to resend.',
    };
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const result = await pool.query(
    `
      UPDATE users
      SET
        email_verified = TRUE,
        email_verify_token = NULL,
        email_verify_token_expires = NULL
      WHERE email_verify_token = $1
        AND email_verify_token_expires > NOW()
      RETURNING user_key
    `,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    throw {
      status: 400,
      message: 'Invalid or expired verification link. Please contact your administrator to resend.',
    };
  }

  return { success: true };
};

export const forgotPasswordService = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: true };
  }

  const result = await pool.query('SELECT user_key FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [
    normalizedEmail,
  ]);

  if (result.rowCount === 0) {
    return { success: true };
  }

  const userKey = result.rows[0].user_key;
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(
    `
      UPDATE users
      SET
        reset_password_token = $2,
        reset_password_expires = NOW() + INTERVAL '1 hour'
      WHERE user_key = $1
    `,
    [userKey, tokenHash]
  );

  console.log('[SECURITY] Password reset requested for user:', userKey);
  return { success: true };
};

export const resetPasswordService = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw { status: 400, message: 'Token and new password are required.' };
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const userResult = await pool.query(
    `
      SELECT user_key
      FROM users
      WHERE reset_password_token = $1
        AND reset_password_expires > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );

  if (userResult.rowCount === 0) {
    throw { status: 400, message: 'Invalid or expired reset link.' };
  }

  const userKey = userResult.rows[0].user_key;
  const passwordHash = await validateAndHashPassword(newPassword);

  await pool.query(
    `
      UPDATE users
      SET
        password_hash = $2,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        failed_login_attempts = 0,
        locked_until = NULL,
        last_failed_login = NULL,
        token_version = token_version + 1
      WHERE user_key = $1
    `,
    [userKey, passwordHash]
  );

  return { success: true };
};
