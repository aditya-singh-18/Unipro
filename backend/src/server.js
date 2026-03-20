import dotenv from 'dotenv';
import http from 'http';

import app from './app.js';
import { initSocket } from './socket.js';
import { autoActivateApprovedProjects } from './repositories/project.repo.js';
import { startTrackerReminderScheduler } from './jobs/trackerReminder.job.js';
import { startTrackerWeekClosureScheduler } from './jobs/trackerWeekClosure.job.js';
import { startTrackerEscalationScheduler } from './jobs/trackerEscalation.job.js';
import pool from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// 🔹 Create HTTP server (IMPORTANT for socket)
const server = http.createServer(app);

// 🔹 Initialize Socket.IO
initSocket(server);

// 🔹 Auto-activate approved projects (24h logic)
setInterval(async () => {
  try {
    await autoActivateApprovedProjects();
  } catch (err) {
    console.error('❌ Auto-activate failed:', err.message);
  }
}, 10 * 60 * 1000); // every 10 minutes

// 🔹 Tracker reminder scheduler
startTrackerReminderScheduler();

// 🔹 Tracker auto-missed scheduler
startTrackerWeekClosureScheduler();

// 🔹 Tracker escalation scheduler
startTrackerEscalationScheduler();

const verifySuperAdminBootstrap = async () => {
  const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!superAdminEmail) {
    console.warn('[SECURITY] SUPER_ADMIN_EMAIL is not set. Configure it in environment for admin hardening.');
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT user_key, is_super_admin
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [superAdminEmail]
    );

    const mappedUser = result.rows?.[0];
    if (!mappedUser || mappedUser.is_super_admin !== true) {
      console.warn(
        '[SECURITY] SUPER_ADMIN_EMAIL is configured but not assigned as is_super_admin=true. Set it manually in DB.'
      );
    }
  } catch (error) {
    console.warn('[SECURITY] Could not verify SUPER_ADMIN_EMAIL mapping:', error.message);
  }
};

verifySuperAdminBootstrap();

// 🔹 Start server
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket running on port ${PORT}`);
});
