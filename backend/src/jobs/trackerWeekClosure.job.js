import { getTeamMembers } from '../repositories/team.repo.js';
import { findUserByEnrollmentId } from '../repositories/user.repo.js';
import { createTimelineEvent } from '../repositories/tracker.repo.js';
import { pushNotification } from '../services/notification.service.js';
import { getTrackerPolicySettingsService } from '../services/trackerPolicy.service.js';
import {
  getAutoMissedWeekCandidates,
  markWeekAsMissedIfEligible,
} from '../repositories/trackerWeekClosure.repo.js';

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const notifyAutoMissed = async (candidate) => {
  const teamMembers = await getTeamMembers(candidate.project_id);

  for (const member of teamMembers) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (!user?.user_key) continue;

    await pushNotification({
      userKey: user.user_key,
      role: 'student',
      title: 'Week marked as missed',
      message: `Week ${candidate.week_number} for project ${candidate.project_id} has been auto-marked missed due to deadline expiry.`,
    });
  }

  if (candidate.mentor_employee_id) {
    await pushNotification({
      userKey: candidate.mentor_employee_id,
      role: 'mentor',
      title: 'Project week auto-marked missed',
      message: `Week ${candidate.week_number} for project ${candidate.project_id} was auto-marked missed after deadline expiry.`,
    });
  }
};

export const runTrackerWeekClosureJob = async () => {
  const policy = await getTrackerPolicySettingsService();
  if (!policy.auto_missed_enabled) {
    return { enabled: false, candidates: 0, transitioned: 0 };
  }

  const candidates = await getAutoMissedWeekCandidates();
  let transitioned = 0;

  for (const candidate of candidates) {
    const updated = await markWeekAsMissedIfEligible(candidate.week_id);
    if (!updated) continue;

    await createTimelineEvent({
      projectId: updated.project_id,
      weekId: updated.week_id,
      eventType: 'week_marked_missed',
      actorUserKey: null,
      actorRole: 'SYSTEM',
      meta: {
        reason: 'auto_deadline_expired',
        deadline_at: updated.deadline_at,
      },
    });

    await notifyAutoMissed(candidate);
    transitioned += 1;
  }

  return {
    enabled: true,
    candidates: candidates.length,
    transitioned,
  };
};

export const startTrackerWeekClosureScheduler = () => {
  const intervalMin = toInt(process.env.TRACKER_AUTO_MISSED_INTERVAL_MIN, 30);
  const intervalMs = intervalMin * 60 * 1000;

  const tick = async () => {
    try {
      const result = await runTrackerWeekClosureJob();
      console.log(`[TrackerWeekClosureJob] transitioned=${result.transitioned}/${result.candidates}`);
    } catch (err) {
      console.error('[TrackerWeekClosureJob] failed:', err.message);
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return timer;
};
