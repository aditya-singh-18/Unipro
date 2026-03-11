import {
  getAdminComplianceBoardService,
  getAdminEscalationBoardService,
  getAdminMentorLoadTrendsService,
  getAdminDepartmentLeaderboardService,
  getProgressReportExportService,
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
  const compliance = await getAdminComplianceBoardService({ page: 1, pageSize: 10 });
  if (Array.isArray(compliance?.items) && compliance?.pagination) {
    ok('Compliance board contract valid', `items=${compliance.items.length}`);
  } else {
    bad('Compliance board contract invalid');
  }

  const escalations = await getAdminEscalationBoardService({ limit: 10 });
  if (Array.isArray(escalations?.items) && escalations?.thresholds) {
    ok('Escalation board contract valid', `count=${escalations.count}`);
  } else {
    bad('Escalation board contract invalid');
  }

  const mentorLoad = await getAdminMentorLoadTrendsService({ limit: 10 });
  if (Array.isArray(mentorLoad?.items)) {
    ok('Mentor load API contract valid', `count=${mentorLoad.count}`);
  } else {
    bad('Mentor load API contract invalid');
  }

  const departments = await getAdminDepartmentLeaderboardService({ limit: 10 });
  if (Array.isArray(departments?.items)) {
    ok('Department leaderboard API contract valid', `count=${departments.count}`);
  } else {
    bad('Department leaderboard API contract invalid');
  }

  const reportJson = await getProgressReportExportService({ format: 'json', weekStart: 1, weekEnd: 4 });
  if (reportJson?.payload?.summary && Array.isArray(reportJson?.payload?.rows)) {
    ok('Progress report JSON contract valid', `rows=${reportJson.payload.rows.length}`);
  } else {
    bad('Progress report JSON contract invalid');
  }

  const reportCsv = await getProgressReportExportService({ format: 'csv', weekStart: 1, weekEnd: 4 });
  if (typeof reportCsv?.body === 'string' && reportCsv.body.includes('project_id')) {
    ok('Progress report CSV contract valid', `chars=${reportCsv.body.length}`);
  } else {
    bad('Progress report CSV contract invalid');
  }
} catch (error) {
  bad('Phase 7 API smoke execution', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
