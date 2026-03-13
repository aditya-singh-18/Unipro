import {
  getAdminSystemSettingsService,
  getPublicSystemAccessService,
  updateAdminSystemSettingsService,
  listProjectCyclesService,
  createProjectCycleService,
  activateProjectCycleService,
} from '../src/services/systemSettings.service.js';

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

let original = null;

try {
  original = await getAdminSystemSettingsService();
  ok('System settings load', `university=${original.university_name}`);

  const toggled = await updateAdminSystemSettingsService({
    payload: {
      allow_student_login: !original.allow_student_login,
      allow_mentor_login: !original.allow_mentor_login,
      max_files_per_submission: Number(original.max_files_per_submission) + 1,
      max_resubmissions: Number(original.max_resubmissions) + 1,
    },
    actorUserKey: null,
  });

  if (
    toggled.allow_student_login === !original.allow_student_login &&
    toggled.allow_mentor_login === !original.allow_mentor_login
  ) {
    ok('System settings update persists login toggles');
  } else {
    bad('System settings update persists login toggles');
  }

  const publicAccess = await getPublicSystemAccessService();
  if (
    publicAccess.allow_student_login === toggled.allow_student_login &&
    publicAccess.allow_mentor_login === toggled.allow_mentor_login
  ) {
    ok('Public system access reflects admin settings');
  } else {
    bad('Public system access reflects admin settings');
  }

  const beforeCycles = await listProjectCyclesService();
  ok('Project cycles list loads', `count=${beforeCycles.length}`);

  const smokeCycleName = `Smoke Cycle ${Date.now()}`;
  const created = await createProjectCycleService({
    payload: {
      cycle_name: smokeCycleName,
      batch_start_year: 2024,
      batch_end_year: 2028,
      project_mode: 'both',
    },
    actorUserKey: null,
  });

  if (created?.cycle_name === smokeCycleName) {
    ok('Project cycle create works');
  } else {
    bad('Project cycle create works');
  }

  const activated = await activateProjectCycleService({
    cycleId: created.cycle_id,
    actorUserKey: null,
  });

  if (activated?.is_active) {
    ok('Project cycle activate works');
  } else {
    bad('Project cycle activate works');
  }

  const afterActivateCycles = await listProjectCyclesService();
  const activeCount = afterActivateCycles.filter((item) => item.is_active).length;
  if (activeCount === 1) {
    ok('Exactly one active cycle enforced', `active_count=${activeCount}`);
  } else {
    bad('Exactly one active cycle enforced', `active_count=${activeCount}`);
  }
} catch (error) {
  bad('System settings smoke execution', error.message);
} finally {
  if (original) {
    try {
      await updateAdminSystemSettingsService({
        payload: original,
        actorUserKey: null,
      });
      ok('System settings restored to original values');
    } catch (error) {
      bad('System settings restore', error.message);
    }
  }
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
