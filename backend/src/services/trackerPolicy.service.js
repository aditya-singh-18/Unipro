import { getTrackerPolicyEntries, upsertTrackerPolicyEntry } from '../repositories/trackerPolicy.repo.js';

const toBoolean = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const TRACKER_POLICY_KEYS = [
  'escalation_enabled',
  'escalation_batch_limit',
  'escalation_pending_overdue_hours',
  'escalation_review_overdue_hours',
  'escalation_critical_overdue_hours',
  'reminder_enabled',
  'student_deadline_reminder_hours',
  'mentor_review_sla_hours',
  'auto_missed_enabled',
];

export const getTrackerPolicyDefaults = () => ({
  escalation_enabled: toBoolean(process.env.TRACKER_ESCALATION_ENABLED, true),
  escalation_batch_limit: toPositiveInt(process.env.TRACKER_ESCALATION_BATCH_LIMIT, 50),
  escalation_pending_overdue_hours: toPositiveInt(process.env.TRACKER_ESCALATION_PENDING_OVERDUE_HOURS, 48),
  escalation_review_overdue_hours: toPositiveInt(process.env.TRACKER_ESCALATION_REVIEW_OVERDUE_HOURS, 36),
  escalation_critical_overdue_hours: toPositiveInt(process.env.TRACKER_ESCALATION_CRITICAL_OVERDUE_HOURS, 72),
  reminder_enabled: toBoolean(process.env.TRACKER_REMINDER_ENABLED, true),
  student_deadline_reminder_hours: toPositiveInt(process.env.TRACKER_STUDENT_DEADLINE_REMINDER_HOURS, 24),
  mentor_review_sla_hours: toPositiveInt(process.env.TRACKER_MENTOR_REVIEW_SLA_HOURS, 24),
  auto_missed_enabled: toBoolean(process.env.TRACKER_AUTO_MISSED_ENABLED, true),
});
export const getTrackerPolicySettingsService = async () => {
  const defaults = getTrackerPolicyDefaults();
  const rows = await getTrackerPolicyEntries(TRACKER_POLICY_KEYS);
  const overrides = Object.fromEntries(rows.map((row) => [row.policy_key, row.policy_value]));

  return {
    escalation_enabled: toBoolean(overrides.escalation_enabled, defaults.escalation_enabled),
    escalation_batch_limit: toPositiveInt(overrides.escalation_batch_limit, defaults.escalation_batch_limit),
    escalation_pending_overdue_hours: toPositiveInt(
      overrides.escalation_pending_overdue_hours,
      defaults.escalation_pending_overdue_hours
    ),
    escalation_review_overdue_hours: toPositiveInt(
      overrides.escalation_review_overdue_hours,
      defaults.escalation_review_overdue_hours
    ),
    escalation_critical_overdue_hours: toPositiveInt(
      overrides.escalation_critical_overdue_hours,
      defaults.escalation_critical_overdue_hours
    ),
    reminder_enabled: toBoolean(overrides.reminder_enabled, defaults.reminder_enabled),
    student_deadline_reminder_hours: toPositiveInt(
      overrides.student_deadline_reminder_hours,
      defaults.student_deadline_reminder_hours
    ),
    mentor_review_sla_hours: toPositiveInt(
      overrides.mentor_review_sla_hours,
      defaults.mentor_review_sla_hours
    ),
    auto_missed_enabled: toBoolean(overrides.auto_missed_enabled, defaults.auto_missed_enabled),
  };
};

export const updateTrackerPolicySettingsService = async ({ payload, updatedBy }) => {
  const current = await getTrackerPolicySettingsService();
  const next = {
    ...current,
    escalation_enabled: toBoolean(payload?.escalation_enabled, current.escalation_enabled),
    escalation_batch_limit: toPositiveInt(payload?.escalation_batch_limit, current.escalation_batch_limit),
    escalation_pending_overdue_hours: toPositiveInt(
      payload?.escalation_pending_overdue_hours,
      current.escalation_pending_overdue_hours
    ),
    escalation_review_overdue_hours: toPositiveInt(
      payload?.escalation_review_overdue_hours,
      current.escalation_review_overdue_hours
    ),
    escalation_critical_overdue_hours: toPositiveInt(
      payload?.escalation_critical_overdue_hours,
      current.escalation_critical_overdue_hours
    ),
    reminder_enabled: toBoolean(payload?.reminder_enabled, current.reminder_enabled),
    student_deadline_reminder_hours: toPositiveInt(
      payload?.student_deadline_reminder_hours,
      current.student_deadline_reminder_hours
    ),
    mentor_review_sla_hours: toPositiveInt(
      payload?.mentor_review_sla_hours,
      current.mentor_review_sla_hours
    ),
    auto_missed_enabled: toBoolean(payload?.auto_missed_enabled, current.auto_missed_enabled),
  };

  if (next.escalation_critical_overdue_hours < next.escalation_pending_overdue_hours) {
    throw new Error('Critical threshold must be greater than or equal to pending overdue threshold');
  }

  if (next.escalation_critical_overdue_hours < next.escalation_review_overdue_hours) {
    throw new Error('Critical threshold must be greater than or equal to review overdue threshold');
  }

  await Promise.all(
    TRACKER_POLICY_KEYS.map((policyKey) =>
      upsertTrackerPolicyEntry({
        policyKey,
        policyValue: next[policyKey],
        updatedBy,
      })
    )
  );

  return next;
};
