import {
  getAdminEscalationBoardService,
} from '../src/services/tracker.service.js';
import {
  getEscalationDetailService,
  updateEscalationFollowUpService,
} from '../src/services/escalationFollowUp.service.js';

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
  ok('Escalation board service executes', `count=${board.count}`);

  if (!Array.isArray(board.items)) {
    bad('Escalation board items not array');
  } else {
    ok('Escalation board items is array');
  }

  if (board.items.length === 0) {
    ok('No live escalations to mutate; read path validated');
  } else {
    const target = board.items[0];
    const escalationId = Number(target.week_id);

    const detail = await getEscalationDetailService(escalationId);
    if (detail?.detail?.week_id) {
      ok('Escalation detail service executes', `weekId=${detail.detail.week_id}`);
    } else {
      bad('Escalation detail service failed');
    }

    const acknowledged = await updateEscalationFollowUpService(
      escalationId,
      {
        resolutionState: 'acknowledged',
        resolutionNotes: 'Phase4 smoke: acknowledged state check',
      },
      'SYSTEM_SMOKE'
    );

    if (acknowledged?.currentState === 'acknowledged') {
      ok('Escalation state updated to acknowledged');
    } else {
      bad('Escalation state did not update to acknowledged', `current=${acknowledged?.currentState}`);
    }

    const followUp = await updateEscalationFollowUpService(
      escalationId,
      {
        resolutionState: 'in_follow_up',
        resolutionNotes: 'Phase4 smoke: follow-up state check',
      },
      'SYSTEM_SMOKE'
    );

    if (followUp?.currentState === 'in_follow_up') {
      ok('Escalation state updated to in_follow_up');
    } else {
      bad('Escalation state did not update to in_follow_up', `current=${followUp?.currentState}`);
    }
  }
} catch (error) {
  bad('Escalation follow-up smoke execution failed', error?.message || String(error));
}

console.log(`PASS=${pass} FAIL=${fail}`);
if (fail > 0) process.exit(1);
