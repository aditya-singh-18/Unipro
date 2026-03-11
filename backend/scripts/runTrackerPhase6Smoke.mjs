import { getProgressReportExportService } from '../src/services/tracker.service.js';

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
  const jsonResult = await getProgressReportExportService({ format: 'json' });
  if (jsonResult?.payload?.summary) {
    ok('JSON preview generated', `rows=${jsonResult.payload.summary.totalRows}`);
  } else {
    bad('JSON preview missing summary');
  }

  const csvResult = await getProgressReportExportService({ format: 'csv' });
  if (typeof csvResult?.body === 'string' && csvResult.body.includes('project_id')) {
    ok('CSV export generated', `chars=${csvResult.body.length}`);
  } else {
    bad('CSV export invalid format');
  }

  const pdfResult = await getProgressReportExportService({ format: 'pdf' });
  if (Buffer.isBuffer(pdfResult?.body) && pdfResult.body.length > 50) {
    ok('PDF export generated', `bytes=${pdfResult.body.length}`);
  } else {
    bad('PDF export invalid format');
  }

  const filteredResult = await getProgressReportExportService({
    format: 'json',
    weekStart: 1,
    weekEnd: 4,
  });
  if (filteredResult?.payload?.filters?.weekStart === 1 && filteredResult?.payload?.filters?.weekEnd === 4) {
    ok('Week range filtering accepted', 'weekStart=1, weekEnd=4');
  } else {
    bad('Week range filtering not applied');
  }
} catch (error) {
  bad('Phase 6 smoke execution', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
