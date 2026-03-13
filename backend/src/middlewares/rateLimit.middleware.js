import rateLimit from 'express-rate-limit';

/**
 * Tight limiter for login — prevents brute-force & credential stuffing.
 * 10 attempts per IP per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // sends RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true, // only count failed/unhandled requests
});

/**
 * General API limiter — safety net for all other routes.
 * 200 requests per IP per minute.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

/**
 * Strict limiter for sensitive write operations
 * (password change, admin overrides, etc.)
 * 20 requests per IP per 10 minutes.
 */
export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for this operation. Please wait before retrying.',
  },
});
