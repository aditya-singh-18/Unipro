import dotenv from 'dotenv';
import http from 'http';

import app from './app.js';
import { initSocket } from './socket.js';
import { autoActivateApprovedProjects } from './repositories/project.repo.js';
import { startTrackerReminderScheduler } from './jobs/trackerReminder.job.js';
import { startTrackerWeekClosureScheduler } from './jobs/trackerWeekClosure.job.js';
import { startTrackerEscalationScheduler } from './jobs/trackerEscalation.job.js';

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

// 🔹 Start server
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket running on port ${PORT}`);
});
