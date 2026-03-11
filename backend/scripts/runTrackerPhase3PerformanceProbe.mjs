import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import {
  getAdminComplianceBoardService,
  getProjectStatusHistoryService,
} from '../src/services/tracker.service.js';

const runs = 5;
const samples = { compliance: [], statusHistory: [] };

const percentile95 = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Number(sorted[index].toFixed(2));
};

const timeCall = async (fn) => {
  const started = performance.now();
  const result = await fn();
  const elapsed = performance.now() - started;
  return { result, elapsed: Number(elapsed.toFixed(2)) };
};

const complianceSeed = await getAdminComplianceBoardService({ page: 1, pageSize: 25 });
const seedProjectId = complianceSeed.items[0]?.project_id || null;

for (let index = 0; index < runs; index += 1) {
  const compliance = await timeCall(() => getAdminComplianceBoardService({ page: 1, pageSize: 25 }));
  samples.compliance.push(compliance.elapsed);

  if (seedProjectId) {
    const statusHistory = await timeCall(() => getProjectStatusHistoryService({
      projectId: seedProjectId,
      userKey: 'perf-admin',
      role: 'ADMIN',
      limit: 20,
    }));
    samples.statusHistory.push(statusHistory.elapsed);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  runs,
  compliance: {
    samples_ms: samples.compliance,
    p95_ms: percentile95(samples.compliance),
  },
  status_history: {
    project_id: seedProjectId,
    samples_ms: samples.statusHistory,
    p95_ms: percentile95(samples.statusHistory),
  },
};

const outPath = path.resolve(process.cwd(), '..', 'TRACKER_PHASE3_PERFORMANCE_REPORT.md');
const lines = [
  '# Tracker Phase 3 Performance Probe',
  '',
  `Generated At: ${report.generated_at}`,
  `Runs: ${runs}`,
  '',
  `Compliance API service p95: ${report.compliance.p95_ms} ms`,
  `Compliance samples: ${report.compliance.samples_ms.join(', ')}`,
  '',
  `Status history service project: ${report.status_history.project_id || '(none)'}`,
  `Status history p95: ${report.status_history.p95_ms} ms`,
  `Status history samples: ${report.status_history.samples_ms.join(', ')}`,
];

fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Compliance p95=${report.compliance.p95_ms}ms`);
console.log(`StatusHistory p95=${report.status_history.p95_ms}ms`);
console.log(`Report written: ${outPath}`);
