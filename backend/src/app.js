import express from 'express';
import cors from 'cors';
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
import profileRoutes from './routes/profile.routes.js';
import studentRoutes from './routes/student.routes.js';
import meetingsRoutes from './routes/meetings.routes.js';
import trackerRoutes from './routes/tracker.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', invitationRoutes);
app.use('/api/project', projectRoutes);
app.use('/api', adminOverrideRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', meetingsRoutes);
app.use('/api/tracker', trackerRoutes);

// health check
app.get('/', (req, res) => {
  res.send('Kya lene aaye ho 😄 sab thik chal raha hai 🚀');
});

// centralized error handler (must be after all routes)
app.use(errorHandler);

export default app;
