import {
  getAdminEscalationBoardService,
  getProjectStatusHistoryService,
} from '../src/services/tracker.service.js';

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
  const board = await getAdminEscalationBoardService({ limit: 10 });

  if (Array.isArray(board.items)) {
    ok('Escalation board returns items array', `count=${board.items.length}`);
  } else {
    bad('Escalation board returns items array');
  }

  if (
    board.thresholds &&
    typeof board.thresholds.pendingOverdueHours === 'number' &&
    typeof board.thresholds.reviewOverdueHours === 'number'
  ) {
    ok('Escalation thresholds are present');
  } else {
    bad('Escalation thresholds are present');
  }

  const invalidItem = board.items.find(
    (item) => !['pending_overdue', 'review_overdue'].includes(item.escalation_type)
  );
  if (!invalidItem) {
    ok('Escalation types are normalized');
  } else {
    bad('Escalation types are normalized', String(invalidItem.escalation_type));
  }
} catch (error) {
  bad('Escalation board service executes', error.message);
}

const projectId = process.env.SMOKE_PROJECT_ID;
if (!projectId) {
  ok('Project status history smoke skipped', 'Set SMOKE_PROJECT_ID to enable');
} else {
  try {
    const history = await getProjectStatusHistoryService({
      projectId,
      userKey: 'smoke-admin',
      role: 'ADMIN',
      limit: 10,
    });

    if (Array.isArray(history)) {
      ok('Project status history returns array', `count=${history.length}`);
    } else {
      bad('Project status history returns array');
    }

    const invalidHistory = history.find((item) => !item.created_at || !item.event_type);
    if (!invalidHistory) {
      ok('Status history entries include created_at and event_type');
    } else {
      bad('Status history entries include created_at and event_type');
    }
  } catch (error) {
    bad('Project status history service executes', error.message);
  }
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
