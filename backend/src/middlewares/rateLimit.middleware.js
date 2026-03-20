import rateLimit from 'express-rate-limit';

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
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createJsonRateLimitHandler(
    'Too many requests. Please wait 15 minutes before trying again.',
    15 * 60 * 1000
  ),
  skipSuccessfulRequests: true,
});

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
