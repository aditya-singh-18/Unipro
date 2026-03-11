import {
  getAdminComplianceBoardService,
  getAdminMentorLoadTrendsService,
  getGovernanceExportService,
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
  const board = await getAdminComplianceBoardService({ page: 1, pageSize: 20 });
  if (Array.isArray(board.items)) {
    ok('Compliance board returns items array', `count=${board.items.length}`);
  } else {
    bad('Compliance board returns items array');
  }

  const invalidWarning = board.items.find(
    (item) => typeof item.predictive_warning_score !== 'number' || !Array.isArray(item.predictive_warning_reasons)
  );
  if (!invalidWarning) {
    ok('Predictive warning fields are present on compliance items');
  } else {
    bad('Predictive warning fields are present on compliance items');
  }
} catch (error) {
  bad('Compliance predictive warning service executes', error.message);
}

try {
  const mentorLoad = await getAdminMentorLoadTrendsService({ limit: 20 });
  if (Array.isArray(mentorLoad.items)) {
    ok('Mentor load service returns items array', `count=${mentorLoad.items.length}`);
  } else {
    bad('Mentor load service returns items array');
  }

  const invalidLoad = mentorLoad.items.find(
    (item) => !['healthy', 'warning', 'critical'].includes(item.load_band)
  );
  if (!invalidLoad) {
    ok('Mentor load bands are normalized');
  } else {
    bad('Mentor load bands are normalized', String(invalidLoad.load_band));
  }
} catch (error) {
  bad('Mentor load service executes', error.message);
}

try {
  const jsonExport = await getGovernanceExportService({ format: 'json' });
  if (jsonExport.format === 'json' && jsonExport.payload?.projects) {
    ok('Governance JSON export returns payload', `projects=${jsonExport.payload.projects.length}`);
  } else {
    bad('Governance JSON export returns payload');
  }

  const csvExport = await getGovernanceExportService({ format: 'csv' });
  if (csvExport.format === 'csv' && String(csvExport.body || '').includes('project_id')) {
    ok('Governance CSV export returns csv body');
  } else {
    bad('Governance CSV export returns csv body');
  }
} catch (error) {
  bad('Governance export service executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
