import { getAdminComplianceBoardService } from '../src/services/tracker.service.js';

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
  const board = await getAdminComplianceBoardService();

  if (Array.isArray(board.items)) {
    ok('Compliance board returns items array', `count=${board.items.length}`);
  } else {
    bad('Compliance board returns items array', typeof board.items);
  }

  if (board.summary && typeof board.summary.total_projects === 'number') {
    ok('Compliance board returns summary object', `total=${board.summary.total_projects}`);
  } else {
    bad('Compliance board returns summary object');
  }

  if (board.summary.total_projects === board.items.length) {
    ok('Summary total matches items length');
  } else {
    bad('Summary total matches items length', `${board.summary.total_projects} !== ${board.items.length}`);
  }

  const computedFollowUp = board.items.filter(
    (item) => item.compliance_status === 'critical' || item.compliance_status === 'warning'
  ).length;

  if (computedFollowUp === board.summary.follow_up_required) {
    ok('Follow-up summary matches items', `follow_up=${computedFollowUp}`);
  } else {
    bad('Follow-up summary matches items', `${computedFollowUp} !== ${board.summary.follow_up_required}`);
  }

  const invalidStatus = board.items.find(
    (item) => !['healthy', 'warning', 'critical'].includes(item.compliance_status)
  );
  if (!invalidStatus) {
    ok('Compliance status values are normalized');
  } else {
    bad('Compliance status values are normalized', invalidStatus.compliance_status);
  }
} catch (error) {
  bad('Unexpected exception', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
