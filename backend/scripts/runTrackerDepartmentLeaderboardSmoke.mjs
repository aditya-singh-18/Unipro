import { getAdminDepartmentLeaderboardService } from '../src/services/tracker.service.js';

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
  const result = await getAdminDepartmentLeaderboardService({ limit: 25 });

  if (Array.isArray(result.items)) {
    ok('Department leaderboard returns items array', `count=${result.items.length}`);
  } else {
    bad('Department leaderboard returns items array');
  }

  const invalid = result.items.find(
    (item) => !['healthy', 'warning', 'critical'].includes(item.department_band)
  );

  if (!invalid) {
    ok('Department bands are normalized');
  } else {
    bad('Department bands are normalized', String(invalid.department_band));
  }
} catch (error) {
  bad('Department leaderboard service executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
