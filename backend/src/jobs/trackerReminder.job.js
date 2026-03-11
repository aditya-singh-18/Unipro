import {
  getStudentDeadlineReminderCandidates,
  getMentorReviewReminderCandidates,
  registerNotificationDispatch,
} from '../repositories/trackerReminder.repo.js';
import { pushNotification } from '../services/notification.service.js';
import { getTrackerPolicySettingsService } from '../services/trackerPolicy.service.js';

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildHourBucket = () => new Date().toISOString().slice(0, 13);

const sendStudentDeadlineReminders = async ({ deadlineHours }) => {
  const candidates = await getStudentDeadlineReminderCandidates({ deadlineHours });
  let sent = 0;

  for (const item of candidates) {
    const dedupeKey = `student_deadline:${item.week_id}:${item.recipient_user_key}:${buildHourBucket()}`;

    const dispatch = await registerNotificationDispatch({
      dedupeKey,
      projectId: item.project_id,
      weekId: item.week_id,
      recipientUserKey: item.recipient_user_key,
      notificationType: 'student_deadline',
    });

    if (!dispatch) continue;

    const deadlineText = item.deadline_at ? new Date(item.deadline_at).toLocaleString() : 'soon';
    await pushNotification({
      userKey: item.recipient_user_key,
      role: 'student',
      title: 'Weekly tracker deadline approaching',
      message: `Week ${item.week_number} for project ${item.project_id} is due by ${deadlineText}. Please submit your update.`,
    });

    sent += 1;
  }

  return { candidates: candidates.length, sent };
};

const sendMentorReviewReminders = async ({ reviewSlaHours }) => {
  const candidates = await getMentorReviewReminderCandidates({ reviewSlaHours });
  let sent = 0;

  for (const item of candidates) {
    const dedupeKey = `mentor_review_pending:${item.week_id}:${item.recipient_user_key}:${buildHourBucket()}`;

    const dispatch = await registerNotificationDispatch({
      dedupeKey,
      projectId: item.project_id,
      weekId: item.week_id,
      recipientUserKey: item.recipient_user_key,
      notificationType: 'mentor_review_pending',
    });

    if (!dispatch) continue;

    await pushNotification({
      userKey: item.recipient_user_key,
      role: 'mentor',
      title: 'Weekly review pending',
      message: `Week ${item.week_number} for project ${item.project_id} is waiting for mentor review beyond SLA.`,
    });

    sent += 1;
  }

  return { candidates: candidates.length, sent };
};

export const runTrackerReminderJob = async () => {
  const policy = await getTrackerPolicySettingsService();
  if (!policy.reminder_enabled) {
    return { enabled: false, student: { candidates: 0, sent: 0 }, mentor: { candidates: 0, sent: 0 } };
  }

  const [studentResult, mentorResult] = await Promise.all([
    sendStudentDeadlineReminders({ deadlineHours: policy.student_deadline_reminder_hours }),
    sendMentorReviewReminders({ reviewSlaHours: policy.mentor_review_sla_hours }),
  ]);

  return {
    enabled: true,
    student: studentResult,
    mentor: mentorResult,
  };
};

export const startTrackerReminderScheduler = () => {
  const intervalMin = toInt(process.env.TRACKER_REMINDER_INTERVAL_MIN, 30);
  const intervalMs = intervalMin * 60 * 1000;

  const tick = async () => {
    try {
      const result = await runTrackerReminderJob();
      console.log(
        `[TrackerReminderJob] student sent=${result.student.sent}/${result.student.candidates}, mentor sent=${result.mentor.sent}/${result.mentor.candidates}`
      );
    } catch (err) {
      console.error('[TrackerReminderJob] failed:', err.message);
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return timer;
};
