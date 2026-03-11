import {
  createTimelineEvent,
  getAdminEscalationQueue,
  getAdminRecipients,
} from '../repositories/tracker.repo.js';
import { registerNotificationDispatch } from '../repositories/trackerReminder.repo.js';
import { pushNotification } from '../services/notification.service.js';
import { getTrackerPolicySettingsService } from '../services/trackerPolicy.service.js';

const isEnabled = (value, fallback = true) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const buildHourBucket = () => new Date().toISOString().slice(0, 13);

export const runTrackerEscalationJob = async () => {
  const policy = await getTrackerPolicySettingsService();
  if (!policy.escalation_enabled) {
    return { enabled: false, candidates: 0, notified: 0 };
  }

  const [admins, candidates] = await Promise.all([
    getAdminRecipients(),
    getAdminEscalationQueue({
      pendingOverdueHours: policy.escalation_pending_overdue_hours,
      reviewOverdueHours: policy.escalation_review_overdue_hours,
      criticalOverdueHours: policy.escalation_critical_overdue_hours,
      limit: policy.escalation_batch_limit,
    }),
  ]);

  if (!admins.length || !candidates.length) {
    return { enabled: true, candidates: candidates.length, notified: 0 };
  }

  let notified = 0;

  for (const item of candidates) {
    let escalatedAtLeastOnce = false;

    for (const admin of admins) {
      const dedupeKey = `admin_escalation:${item.week_id}:${admin.user_key}:${buildHourBucket()}`;

      const dispatch = await registerNotificationDispatch({
        dedupeKey,
        projectId: item.project_id,
        weekId: item.week_id,
        recipientUserKey: admin.user_key,
        notificationType: 'admin_escalation',
      });

      if (!dispatch) continue;

      await pushNotification({
        userKey: admin.user_key,
        role: 'admin',
        title: 'Tracker escalation requires intervention',
        message:
          item.escalation_type === 'pending_overdue'
            ? `Project ${item.project_id} week ${item.week_number} is pending beyond SLA (${item.overdue_hours}h).`
            : `Project ${item.project_id} week ${item.week_number} is awaiting mentor review beyond SLA (${item.overdue_hours}h).`,
      });

      escalatedAtLeastOnce = true;
      notified += 1;
    }

    if (escalatedAtLeastOnce) {
      await createTimelineEvent({
        projectId: item.project_id,
        weekId: item.week_id,
        eventType: 'admin_escalation_triggered',
        actorUserKey: null,
        actorRole: 'SYSTEM',
        meta: {
          escalation_type: item.escalation_type,
          overdue_hours: item.overdue_hours,
          risk_level: item.risk_level,
          escalation_severity: item.escalation_severity,
        },
      });
    }
  }

  return {
    enabled: true,
    candidates: candidates.length,
    notified,
  };
};

export const startTrackerEscalationScheduler = () => {
  const enabled = isEnabled(process.env.TRACKER_ESCALATION_ENABLED, true);
  if (!enabled) {
    console.log('Tracker escalation scheduler is disabled by env');
    return null;
  }

  const intervalMin = toInt(process.env.TRACKER_ESCALATION_INTERVAL_MIN, 30);
  const intervalMs = intervalMin * 60 * 1000;

  const tick = async () => {
    try {
      const result = await runTrackerEscalationJob();
      console.log(`[TrackerEscalationJob] notified=${result.notified}, candidates=${result.candidates}`);
    } catch (err) {
      console.error('[TrackerEscalationJob] failed:', err.message);
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return timer;
};
