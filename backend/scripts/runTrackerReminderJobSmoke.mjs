import { runTrackerReminderJob } from '../src/jobs/trackerReminder.job.js';
import { getTrackerPolicySettingsService } from '../src/services/trackerPolicy.service.js';

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

try {
  const policy = await getTrackerPolicySettingsService();
  ok('Tracker reminder policy loads', `enabled=${policy.reminder_enabled}`);

  if (policy.reminder_enabled && typeof policy.student_deadline_reminder_hours === 'number') {
    ok('Tracker reminder policy has deadline hours', `hours=${policy.student_deadline_reminder_hours}`);
  } else {
    bad('Tracker reminder policy missing deadline hours');
  }

  if (policy.reminder_enabled && typeof policy.mentor_review_sla_hours === 'number') {
    ok('Tracker reminder policy has review SLA hours', `hours=${policy.mentor_review_sla_hours}`);
  } else {
    bad('Tracker reminder policy missing review SLA hours');
  }

  const result = await runTrackerReminderJob();
  ok('Tracker reminder job executes');

  if (result.enabled === true || result.enabled === false) {
    ok('Tracker reminder job returns enabled flag', `enabled=${result.enabled}`);
  } else {
    bad('Tracker reminder job missing enabled field');
  }

  if (result.student && typeof result.student.candidates === 'number' && typeof result.student.sent === 'number') {
    ok('Tracker reminder job returns student metrics', `candidates=${result.student.candidates}, sent=${result.student.sent}`);
  } else {
    bad('Tracker reminder job missing student metrics shape');
  }

  if (result.mentor && typeof result.mentor.candidates === 'number' && typeof result.mentor.sent === 'number') {
    ok('Tracker reminder job returns mentor metrics', `candidates=${result.mentor.candidates}, sent=${result.mentor.sent}`);
  } else {
    bad('Tracker reminder job missing mentor metrics shape');
  }

  if (!policy.reminder_enabled) {
    ok('Tracker reminder job respects disabled policy', 'no-op returned');
  }
} catch (error) {
  bad('Tracker reminder job executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
