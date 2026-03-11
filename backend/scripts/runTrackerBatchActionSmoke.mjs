import {
  applyAdminEscalationBatchActionService,
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
  const escalations = await getAdminEscalationBoardService({ limit: 5 });
  if (!Array.isArray(escalations.items)) {
    bad('Escalation board returns items array');
  } else {
    ok('Escalation board returns items array', `count=${escalations.items.length}`);
  }

  if (escalations.items.length === 0) {
    ok('Batch action smoke skipped', 'No active escalations to annotate');
  } else {
    const target = escalations.items[0];
    const result = await applyAdminEscalationBatchActionService({
      action: 'follow_up',
      note: 'Smoke follow-up note',
      actorUserKey: null,
      items: [{
        projectId: target.project_id,
        weekId: target.week_id,
        escalationType: target.escalation_type,
        escalationSeverity: target.escalation_severity,
      }],
    });

    if (result.processed === 1) {
      ok('Batch action processes selected escalation');
    } else {
      bad('Batch action processes selected escalation');
    }

    const history = await getProjectStatusHistoryService({
      projectId: target.project_id,
      userKey: 'admin-smoke',
      role: 'ADMIN',
      limit: 20,
    });

    const found = history.find((item) => item.event_type === 'admin_follow_up_note_added');
    if (found) {
      ok('Batch action writes timeline audit event');
    } else {
      bad('Batch action writes timeline audit event');
    }
  }
} catch (error) {
  bad('Batch action workflow executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
