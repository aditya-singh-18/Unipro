import {
  getStudentLearningRosterService,
  getStudentLearningDetailService,
  exportStudentLearningServiceCSV,
  exportStudentLearningServiceJSON,
} from '../src/services/studentLearning.service.js';

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
  const roster = await getStudentLearningRosterService();
  ok('Student learning roster service executes');

  if (roster.summary && typeof roster.summary.totalStudents === 'number') {
    ok('Summary contains totalStudents', `count=${roster.summary.totalStudents}`);
  } else {
    bad('Summary missing totalStudents');
  }

  if (Array.isArray(roster.items)) {
    ok('Roster items is array', `count=${roster.items.length}`);
  } else {
    bad('Roster items is not array');
  }

  if (roster.items.length > 0) {
    const first = roster.items[0];

    if (first.projectId && first.studentKey) {
      ok('Roster item has identity fields', `project=${first.projectId}, student=${first.studentKey}`);
    } else {
      bad('Roster item missing identity fields');
    }

    if (typeof first.avgQualityScore === 'number' && first.avgQualityScore >= 0 && first.avgQualityScore <= 100) {
      ok('Quality score in valid range', `avg=${first.avgQualityScore}`);
    } else {
      bad('Quality score out of range', `avg=${first.avgQualityScore}`);
    }

    if (typeof first.acceptanceRate === 'number' && first.acceptanceRate >= 0 && first.acceptanceRate <= 100) {
      ok('Acceptance rate in valid range', `rate=${first.acceptanceRate}`);
    } else {
      bad('Acceptance rate out of range', `rate=${first.acceptanceRate}`);
    }

    const detail = await getStudentLearningDetailService(first.projectId, first.studentKey);
    if (detail && Array.isArray(detail.submissions)) {
      ok('Student detail service executes', `submissions=${detail.submissions.length}`);
    } else {
      bad('Student detail service failed');
    }
  }

  const csv = await exportStudentLearningServiceCSV();
  if (typeof csv === 'string' && csv.includes('Student Key')) {
    ok('CSV export valid', `length=${csv.length}`);
  } else {
    bad('CSV export invalid');
  }

  const json = await exportStudentLearningServiceJSON();
  if (json?.summary && Array.isArray(json?.items)) {
    ok('JSON export valid', `items=${json.items.length}`);
  } else {
    bad('JSON export invalid');
  }
} catch (error) {
  bad('Student learning smoke execution failed', error?.message || String(error));
}

console.log(`PASS=${pass} FAIL=${fail}`);
if (fail > 0) process.exit(1);
