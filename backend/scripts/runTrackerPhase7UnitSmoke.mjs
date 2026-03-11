import {
  getAdminComplianceBoardService,
  getCurrentRiskService,
  recalculateRiskService,
  getCurrentHealthService,
  recalculateHealthService,
} from '../src/services/tracker.service.js';
import pkg from 'pg';
import {
  isValidTaskTransition,
  isValidWeekTransition,
  normalizeReviewQueueParams,
} from '../src/validators/tracker.validator.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
  if (isValidWeekTransition('pending', 'submitted')) ok('Week transition pending->submitted valid');
  else bad('Week transition pending->submitted expected valid');

  if (!isValidWeekTransition('done', 'submitted')) ok('Invalid week state blocked');
  else bad('Invalid week state should be rejected');

  if (isValidTaskTransition('todo', 'in_progress')) ok('Task transition todo->in_progress valid');
  else bad('Task transition todo->in_progress expected valid');

  if (!isValidTaskTransition('done', 'todo')) ok('Task reopen done->todo blocked');
  else bad('Task reopen done->todo should be blocked');

  const normalizedQueue = normalizeReviewQueueParams({
    sortBy: 'unknown',
    order: 'UP',
    riskLevel: 'X',
    page: 0,
    pageSize: 1000,
  });

  if (
    normalizedQueue.sortBy === 'pending_age' &&
    normalizedQueue.order === 'desc' &&
    normalizedQueue.riskLevel === null &&
    normalizedQueue.page === 1 &&
    normalizedQueue.pageSize === 100
  ) {
    ok('Review queue normalization enforces defaults and bounds');
  } else {
    bad('Review queue normalization mismatch', JSON.stringify(normalizedQueue));
  }

  const board = await getAdminComplianceBoardService({ page: 1, pageSize: 1 });
  const projectId = board?.items?.[0]?.project_id;
  const adminUserQ = await pool.query(`SELECT user_key FROM users WHERE LOWER(role) = 'admin' LIMIT 1`);
  const actorUserKey = adminUserQ.rows[0]?.user_key;

  if (!projectId) {
    ok('Unit risk/health checks skipped (no compliance projects in seed)');
  } else if (!actorUserKey) {
    ok('Unit risk/health checks skipped (no admin user key found)');
  } else {
    const currentRisk = await getCurrentRiskService({ projectId, userKey: 'phase7-unit', role: 'ADMIN' });
    if (currentRisk && typeof currentRisk === 'object') ok('Current risk service returns snapshot object', `project=${projectId}`);
    else bad('Current risk service invalid payload');

    const recalculatedRisk = await recalculateRiskService({ projectId, userKey: actorUserKey, role: 'ADMIN' });
    if (recalculatedRisk?.project_id === projectId) ok('Risk recalculation produces snapshot');
    else bad('Risk recalculation failed');

    const currentHealth = await getCurrentHealthService({ projectId, userKey: actorUserKey, role: 'ADMIN' });
    if (!currentHealth || currentHealth?.project_id === projectId) ok('Current health service contract valid (nullable snapshot)');
    else bad('Current health service invalid payload');

    const recalculatedHealth = await recalculateHealthService({ projectId, userKey: actorUserKey, role: 'ADMIN' });
    if (recalculatedHealth?.project_id === projectId) ok('Health recalculation produces snapshot');
    else bad('Health recalculation failed');
  }
} catch (error) {
  bad('Phase 7 unit smoke execution', error.message);
} finally {
  await pool.end();
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
