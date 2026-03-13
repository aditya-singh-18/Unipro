import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
import { generalLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());
app.disable('x-powered-by'); // hide Express fingerprint

// ─── CORS: restrict to known frontend origin only ─────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow curl / server-to-server (no origin header) in non-production
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ─── Request Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Body Parsing (limit prevents large payload attacks) ─────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Static uploads ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Global rate limiter (applied before all routes) ──────────────────────────
app.use('/api', generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', invitationRoutes);
app.use('/api/project', projectRoutes);
app.use('/api', adminOverrideRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', meetingsRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api', systemSettingsRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Kya lene aaye ho 😄 sab thik chal raha hai , maaaaa ke ladddleee me🚀');
});

// ─── Centralized error handler (must be last) ────────────────────────────────
app.use(errorHandler);

export default app;
