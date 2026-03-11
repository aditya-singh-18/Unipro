import { performance } from 'perf_hooks';
import {
  getAdminDashboardService,
  getAdminComplianceBoardService,
  getProjectWeeksService,
} from '../src/services/tracker.service.js';

const percentile95 = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Number(sorted[index].toFixed(2));
};

const measure = async (fn) => {
  const start = performance.now();
  await fn();
  return Number((performance.now() - start).toFixed(2));
};

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
  const runs = 8;
  const dashboardSamples = [];
  const complianceSamples = [];

  const boardSeed = await getAdminComplianceBoardService({ page: 1, pageSize: 5 });
  const sampleProjectId = boardSeed?.items?.[0]?.project_id;
  const weekSamples = [];

  for (let i = 0; i < runs; i += 1) {
    dashboardSamples.push(await measure(() => getAdminDashboardService()));
    complianceSamples.push(await measure(() => getAdminComplianceBoardService({ page: 1, pageSize: 20 })));

    if (sampleProjectId) {
      weekSamples.push(await measure(() => getProjectWeeksService({ projectId: sampleProjectId, userKey: 'phase7-perf', role: 'ADMIN' })));
    }
  }

  const dashboardP95 = percentile95(dashboardSamples);
  const complianceP95 = percentile95(complianceSamples);
  const weeksP95 = percentile95(weekSamples);

  ok('Dashboard load probe complete', `p95=${dashboardP95}ms`);
  ok('Compliance board load probe complete', `p95=${complianceP95}ms`);

  if (sampleProjectId) {
    ok('Project weeks API load probe complete', `project=${sampleProjectId}, p95=${weeksP95}ms`);
  } else {
    ok('Project weeks API probe skipped (no compliance project seed)');
  }

  // Soft thresholds for health signal (not strict perf gate)
  if (dashboardP95 <= 1200) ok('Dashboard p95 within soft threshold', `<=1200ms (${dashboardP95}ms)`);
  else bad('Dashboard p95 above soft threshold', `${dashboardP95}ms`);

  if (complianceP95 <= 1500) ok('Compliance p95 within soft threshold', `<=1500ms (${complianceP95}ms)`);
  else bad('Compliance p95 above soft threshold', `${complianceP95}ms`);
} catch (error) {
  bad('Phase 7 performance probe execution', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
