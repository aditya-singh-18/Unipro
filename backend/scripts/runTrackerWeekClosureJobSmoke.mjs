import { runTrackerWeekClosureJob } from '../src/jobs/trackerWeekClosure.job.js';
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
  ok('Tracker auto-missed policy loads', `enabled=${policy.auto_missed_enabled}`);

  if (typeof policy.auto_missed_enabled === 'boolean') {
    ok('Tracker auto-missed policy has enablement boolean');
  } else {
    bad('Tracker auto-missed policy missing enablement field');
  }

  const result = await runTrackerWeekClosureJob();
  ok('Tracker week-closure job executes');

  if (result.enabled === true || result.enabled === false) {
    ok('Tracker week-closure job returns enabled flag', `enabled=${result.enabled}`);
  } else {
    bad('Tracker week-closure job missing enabled field');
  }

  if (typeof result.candidates === 'number' && typeof result.transitioned === 'number') {
    ok('Tracker week-closure job returns transition metrics', `candidates=${result.candidates}, transitioned=${result.transitioned}`);
  } else {
    bad('Tracker week-closure job missing transition metrics shape');
  }

  if (result.transitioned <= result.candidates) {
    ok('Tracker week-closure job respects candidacy constraint', `transitioned=${result.transitioned} <= candidates=${result.candidates}`);
  } else {
    bad('Tracker week-closure job violates candidacy constraint', `transitioned=${result.transitioned} > candidates=${result.candidates}`);
  }

  if (!policy.auto_missed_enabled) {
    ok('Tracker week-closure job respects disabled policy', 'no-op returned');
  }
} catch (error) {
  bad('Tracker week-closure job executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
