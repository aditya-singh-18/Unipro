import rateLimit from 'express-rate-limit';
import { getAdminSystemSettingsService } from '../services/systemSettings.service.js';

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const getAuthIdentity = (req) => {
  const raw = req?.body || {};
  const candidate =
    raw.user_key ||
    raw.employee_id ||
    raw.email ||
    raw.username ||
    '';

  return String(candidate).trim().toLowerCase() || 'unknown-user';
};

const normalizeRole = (value) => {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'MENTOR') return 'MENTOR';
  if (role === 'ADMIN') return 'ADMIN';
  return 'MENTOR';
};

const limiterByPolicyKey = new Map();
let authRatePolicyCache = null;
let authRatePolicyCacheExpiresAt = 0;

const getDefaultRolePolicy = (role) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (role === 'STUDENT') {
    return {
      max: isProduction ? 20 : 80,
      windowMs: 15 * 60 * 1000,
    };
  }

  if (role === 'ADMIN') {
    return {
      max: isProduction ? 8 : 50,
      windowMs: 15 * 60 * 1000,
    };
  }

  return {
    max: isProduction ? 12 : 60,
    windowMs: 15 * 60 * 1000,
  };
};

const getAuthRatePolicy = async () => {
  const now = Date.now();
  if (authRatePolicyCache && now < authRatePolicyCacheExpiresAt) {
    return authRatePolicyCache;
  }

  const defaults = {
    enabled: true,
    STUDENT: getDefaultRolePolicy('STUDENT'),
    MENTOR: getDefaultRolePolicy('MENTOR'),
    ADMIN: getDefaultRolePolicy('ADMIN'),
  };

  try {
    const settings = await getAdminSystemSettingsService();
    authRatePolicyCache = {
      enabled: settings.auth_rate_limit_enabled !== false,
      STUDENT: {
        max: toPositiveInteger(settings.student_auth_rate_limit_max, defaults.STUDENT.max),
        windowMs: toPositiveInteger(settings.student_auth_rate_limit_window_ms, defaults.STUDENT.windowMs),
      },
      MENTOR: {
        max: toPositiveInteger(settings.mentor_auth_rate_limit_max, defaults.MENTOR.max),
        windowMs: toPositiveInteger(settings.mentor_auth_rate_limit_window_ms, defaults.MENTOR.windowMs),
      },
      ADMIN: {
        max: toPositiveInteger(settings.admin_auth_rate_limit_max, defaults.ADMIN.max),
        windowMs: toPositiveInteger(settings.admin_auth_rate_limit_window_ms, defaults.ADMIN.windowMs),
      },
    };
  } catch {
    authRatePolicyCache = defaults;
  }

  authRatePolicyCacheExpiresAt = now + 30 * 1000;
  return authRatePolicyCache;
};

const getRoleAwareAuthLimiter = async (req) => {
  const role = normalizeRole(req?.body?.role);
  const policy = await getAuthRatePolicy();
  const rolePolicy = policy[role] || getDefaultRolePolicy(role);

  const key = `${role}:${rolePolicy.max}:${rolePolicy.windowMs}`;
  if (limiterByPolicyKey.has(key)) {
    return limiterByPolicyKey.get(key);
  }

  const limiter = rateLimit({
    windowMs: rolePolicy.windowMs,
    max: rolePolicy.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (request) => {
      const path = String(request.path || '').toLowerCase();
      return path !== '/login';
    },
    keyGenerator: (request) => `${request.ip}:${normalizeRole(request?.body?.role)}:${getAuthIdentity(request)}`,
    handler: createJsonRateLimitHandler(
      `Too many ${role.toLowerCase()} login attempts. Please wait before trying again.`,
      rolePolicy.windowMs
    ),
  });

  limiterByPolicyKey.set(key, limiter);
  return limiter;
};

const createJsonRateLimitHandler = (message, windowMs) => (req, res) => {
  const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).getTime() : null;
  const retryAfter = resetTime ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)) : Math.ceil(windowMs / 1000);

  return res.status(429).json({
    success: false,
    message: 'Rate limit exceeded',
    detail: message,
    retryAfter,
  });
};

/**
 * SECURITY: Layered rate limiting strategy.
 * - Global limiter: baseline protection across all API routes.
 * - Auth limiter: strict brute-force control for login/auth endpoints.
 * - Admin limiter: tighter controls for privileged admin operations.
 * - Tracker write limiter: throttles write-heavy tracker mutations.
 *
 * Optional production scale-out:
 * npm install rate-limit-redis ioredis
 * Use Redis store to share counters across multiple backend instances.
 */
export const authLimiter = async (req, res, next) => {
  try {
    const policy = await getAuthRatePolicy();
    if (policy.enabled === false) return next();

    const limiter = await getRoleAwareAuthLimiter(req);
    return limiter(req, res, next);
  } catch {
    const fallback = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 10 : 50,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      skip: (request) => String(request.path || '').toLowerCase() !== '/login',
      keyGenerator: (request) => `${request.ip}:${getAuthIdentity(request)}`,
      handler: createJsonRateLimitHandler('Too many login attempts. Please wait before trying again.', 15 * 60 * 1000),
    });

    return fallback(req, res, next);
  }
};

/**
 * Baseline limiter for all API routes.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createJsonRateLimitHandler(
    'Too many requests. Please wait 15 minutes before trying again.',
    15 * 60 * 1000
  ),
});

/**
 * Admin endpoint limiter.
 * Applied to all /api/admin/* routes.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createJsonRateLimitHandler(
    'Too many requests. Please wait 15 minutes before trying again.',
    15 * 60 * 1000
  ),
});

/**
 * Tracker write limiter.
 * Applied to write methods only (POST/PATCH/DELETE) under /api/tracker/* routes.
 */
export const trackerWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !['POST', 'PATCH', 'DELETE'].includes(String(req.method).toUpperCase()),
  handler: createJsonRateLimitHandler(
    'Too many write requests. Please wait 1 minute before trying again.',
    60 * 1000
  ),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createJsonRateLimitHandler(
    'Too many reset requests. Please wait 1 hour before trying again.',
    60 * 60 * 1000
  ),
});

/**
 * Strict limiter for particularly sensitive write operations.
 */
export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createJsonRateLimitHandler(
    'Rate limit exceeded for this operation. Please wait before retrying.',
    10 * 60 * 1000
  ),
});
