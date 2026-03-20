import jwt from 'jsonwebtoken';
import { isTokenRevoked } from '../utils/tokenBlacklist.js';
import pool from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.jti) {
      try {
        const revoked = await isTokenRevoked(decoded.jti);
        if (revoked) {
          return res.status(401).json({
            success: false,
            message: 'Token has been revoked. Please log in again.',
          });
        }
      } catch (blacklistError) {
        // SECURITY TRADE-OFF: fail-open preserves availability if revocation store is unavailable.
        console.error('[SECURITY] token blacklist check failed:', blacklistError.message);
      }
    }

    if (decoded?.token_version !== undefined && decoded?.user_key) {
      const versionResult = await pool.query(
        'SELECT token_version FROM users WHERE user_key = $1 LIMIT 1',
        [decoded.user_key]
      );

      if (versionResult.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      const currentVersion = Number(versionResult.rows[0].token_version || 0);
      if (Number(decoded.token_version) !== currentVersion) {
        return res.status(401).json({
          success: false,
          message: 'Token has been invalidated. Please log in again.',
        });
      }
    }

    // For STUDENT role: user_key IS the enrollment_id (same value stored in both
    // users.user_key and student_profiles.enrollment_id and team_members.enrollment_id)
    req.user = {
      user_key: decoded.user_key,
      role: decoded.role,
      jti: decoded.jti,
      is_super_admin: decoded.is_super_admin === true,
      token_version: Number(decoded.token_version || 0),
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
