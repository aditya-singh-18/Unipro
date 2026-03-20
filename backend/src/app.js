import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import teamRoutes from './routes/team.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import projectRoutes from './routes/project.routes.js';
import adminOverrideRoutes from './routes/adminOverride.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminSettingsRoutes from './routes/adminSettings.routes.js';
import profileRoutes from './routes/profile.routes.js';
import studentRoutes from './routes/student.routes.js';
import meetingsRoutes from './routes/meetings.routes.js';
import trackerRoutes from './routes/tracker.routes.js';
import systemSettingsRoutes from './routes/systemSettings.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import {
  adminLimiter,
  authLimiter,
  generalLimiter,
  trackerWriteLimiter,
} from './middlewares/rateLimit.middleware.js';

const app = express();

const { generateToken, doubleCsrfProtection, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'change-this-csrf-secret',
  cookieName: '__Host-unipro.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/',
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    // Explicit directives reduce risks like XSS, clickjacking, and content-type sniffing.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.FRONTEND_URL].filter(Boolean),
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.disable('x-powered-by'); // hide Express fingerprint

// ─── CORS: restrict to known frontend origin only ─────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV === 'development') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('[SECURITY] CORS blocked request from origin:', origin);
      callback(new Error('CORS policy violation: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);

// ─── Request Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Body Parsing (limit prevents large payload attacks) ─────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// CSRF protection is defense-in-depth. Primary auth uses JWT in Authorization headers.
// This layer protects any cookie-based flows (for example refresh token endpoints).
app.use('/api', (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  if (!req.headers.cookie) {
    return next();
  }

  const pathValue = String(req.path || '');
  if (pathValue === '/auth/login' || pathValue === '/auth/register') {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
});

// ─── Static uploads ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Global rate limiter (applied before all routes) ──────────────────────────
app.use('/api', generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.get('/api/auth/csrf-token', (_req, res) => {
  res.status(200).json({ success: true, csrfToken: generateToken(res) });
});
app.use('/api/user', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', invitationRoutes);
app.use('/api/project', projectRoutes);
app.use('/api', adminOverrideRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin/settings', adminLimiter, adminSettingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', meetingsRoutes);
app.use('/api/tracker', trackerWriteLimiter, trackerRoutes);
app.use('/api', systemSettingsRoutes);

app.use((err, _req, res, next) => {
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token invalid. Please refresh the page and try again.',
    });
  }

  if (String(err?.message || '').includes('CORS policy violation')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
    });
  }

  return next(err);
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Kya lene aaye ho 😄 sab thik chal raha hai , maaaaa ke ladddleee me🚀');
});

// ─── Centralized error handler (must be last) ────────────────────────────────
app.use(errorHandler);

export default app;
