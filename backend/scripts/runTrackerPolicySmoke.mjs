import {
  getTrackerPolicySettingsService,
  updateTrackerPolicySettingsService,
} from '../src/services/trackerPolicy.service.js';

let pass = 0;
let fail = 0;

const ok = (label, detail = '') => {
  console.log(`[PASS] ${label}${detail ? ` - ${detail}` : ''}`);
  pass += 1;
};

const bad = (label, detail = '') => {
  console.error(`[FAIL] ${label}${detail ? ` - ${detail}` : ''}`);
  fail += 1;
};

let originalPolicy = null;

try {
  originalPolicy = await getTrackerPolicySettingsService();
  ok('Tracker policy load', `enabled=${originalPolicy.escalation_enabled}`);

  const nextPolicy = {
    ...originalPolicy,
    escalation_batch_limit: originalPolicy.escalation_batch_limit + 1,
    reminder_enabled: !originalPolicy.reminder_enabled,
    student_deadline_reminder_hours: originalPolicy.student_deadline_reminder_hours + 1,
    mentor_review_sla_hours: originalPolicy.mentor_review_sla_hours + 1,
    auto_missed_enabled: !originalPolicy.auto_missed_enabled,
  };

  const updatedPolicy = await updateTrackerPolicySettingsService({
    payload: nextPolicy,
    updatedBy: null,
  });

  if (updatedPolicy.escalation_batch_limit === nextPolicy.escalation_batch_limit) {
    ok('Tracker policy update persists new batch limit');
  } else {
    bad('Tracker policy update persists new batch limit');
  }

  if (
    updatedPolicy.reminder_enabled === nextPolicy.reminder_enabled &&
    updatedPolicy.student_deadline_reminder_hours === nextPolicy.student_deadline_reminder_hours &&
    updatedPolicy.mentor_review_sla_hours === nextPolicy.mentor_review_sla_hours &&
    updatedPolicy.auto_missed_enabled === nextPolicy.auto_missed_enabled
  ) {
    ok('Tracker policy update persists reminder and auto-missed settings');
  } else {
    bad('Tracker policy update persists reminder and auto-missed settings');
  }

  const reloadedPolicy = await getTrackerPolicySettingsService();
  if (
    reloadedPolicy.escalation_batch_limit === nextPolicy.escalation_batch_limit &&
    reloadedPolicy.reminder_enabled === nextPolicy.reminder_enabled &&
    reloadedPolicy.student_deadline_reminder_hours === nextPolicy.student_deadline_reminder_hours &&
    reloadedPolicy.mentor_review_sla_hours === nextPolicy.mentor_review_sla_hours &&
    reloadedPolicy.auto_missed_enabled === nextPolicy.auto_missed_enabled
  ) {
    ok('Tracker policy reload returns persisted values');
  } else {
    bad('Tracker policy reload returns persisted values');
  }
} catch (error) {
  bad('Tracker policy service executes', error.message);
} finally {
  if (originalPolicy) {
    try {
      await updateTrackerPolicySettingsService({
        payload: originalPolicy,
        updatedBy: null,
      });
      ok('Tracker policy restored to original values');
    } catch (error) {
      bad('Tracker policy restore', error.message);
    }
  }
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
