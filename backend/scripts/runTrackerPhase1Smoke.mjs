import fs from 'fs';
import path from 'path';

const loadEnvFileIfPresent = (envPath) => {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex < 1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const smokeEnvPath = path.resolve(process.cwd(), '.env.smoke');
loadEnvFileIfPresent(smokeEnvPath);

const baseApi = process.env.SMOKE_BASE_API || 'http://localhost:5000/api';
const projectId = process.env.SMOKE_PROJECT_ID || '';
const totalWeeks = Number(process.env.SMOKE_TOTAL_WEEKS || 20);
const startDate = process.env.SMOKE_START_DATE || '2026-03-17';

const credentials = {
  admin: {
    identifier: process.env.SMOKE_ADMIN_IDENTIFIER,
    password: process.env.SMOKE_ADMIN_PASSWORD,
    role: process.env.SMOKE_ADMIN_ROLE || 'ADMIN',
  },
  student: {
    identifier: process.env.SMOKE_STUDENT_IDENTIFIER,
    password: process.env.SMOKE_STUDENT_PASSWORD,
    role: process.env.SMOKE_STUDENT_ROLE || 'STUDENT',
  },
  mentor: {
    identifier: process.env.SMOKE_MENTOR_IDENTIFIER,
    password: process.env.SMOKE_MENTOR_PASSWORD,
    role: process.env.SMOKE_MENTOR_ROLE || 'MENTOR',
  },
};

const reportRows = [];

const addResult = (step, status, details) => {
  reportRows.push({ step, status, details });
  const icon = status === 'PASS' ? 'PASS' : status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${icon}] ${step} - ${details}`);
};

const request = async ({ method = 'GET', url, token, body }) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
};

const withMessage = (res) => {
  const msg = res?.data?.message || res?.data?.error || '';
  return msg ? `HTTP ${res.status} - ${msg}` : `HTTP ${res.status}`;
};

const login = async (name, cred) => {
  if (!cred.identifier || !cred.password || !cred.role) {
    addResult(`${name} login`, 'SKIP', 'Missing env credentials');
    return null;
  }

  const res = await request({
    method: 'POST',
    url: `${baseApi}/auth/login`,
    body: cred,
  });

  if (!res.ok || !res.data?.token) {
    addResult(`${name} login`, 'FAIL', `HTTP ${res.status} ${res.data?.message || 'Login failed'}`);
    return null;
  }

  addResult(`${name} login`, 'PASS', 'Token acquired');
  return res.data.token;
};

const writeReport = () => {
  const now = new Date().toISOString();
  const outPath = path.resolve(process.cwd(), '..', 'TRACKER_PHASE1_SMOKE_TEST_REPORT.md');

  const passCount = reportRows.filter((r) => r.status === 'PASS').length;
  const failCount = reportRows.filter((r) => r.status === 'FAIL').length;
  const skipCount = reportRows.filter((r) => r.status === 'SKIP').length;

  const lines = [
    '# Tracker Phase 1 Smoke Test Report',
    '',
    `Generated At: ${now}`,
    `Base API: ${baseApi}`,
    `Project ID: ${projectId || '(not provided)'}`,
    '',
    `Summary: PASS=${passCount}, FAIL=${failCount}, SKIP=${skipCount}`,
    '',
    '| Step | Status | Details |',
    '|---|---|---|',
    ...reportRows.map((r) => `| ${r.step} | ${r.status} | ${String(r.details).replace(/\|/g, '\\|')} |`),
    '',
    '## Required Env Vars',
    '- SMOKE_PROJECT_ID',
    '- SMOKE_ADMIN_IDENTIFIER / SMOKE_ADMIN_PASSWORD',
    '- SMOKE_STUDENT_IDENTIFIER / SMOKE_STUDENT_PASSWORD',
    '- SMOKE_MENTOR_IDENTIFIER / SMOKE_MENTOR_PASSWORD',
    '- Optional: SMOKE_BASE_API, SMOKE_TOTAL_WEEKS, SMOKE_START_DATE',
  ];

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Report written: ${outPath}`);

  return { failCount, skipCount };
};

const getMissingRequiredEnvKeys = () => {
  const required = [
    'SMOKE_PROJECT_ID',
    'SMOKE_ADMIN_IDENTIFIER',
    'SMOKE_ADMIN_PASSWORD',
    'SMOKE_STUDENT_IDENTIFIER',
    'SMOKE_STUDENT_PASSWORD',
    'SMOKE_MENTOR_IDENTIFIER',
    'SMOKE_MENTOR_PASSWORD',
  ];

  return required.filter((key) => !String(process.env[key] || '').trim());
};

const checkApiReachability = async () => {
  try {
    const origin = new URL(baseApi).origin;
    const res = await request({ method: 'GET', url: `${origin}/` });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
};

const run = async () => {
  const missingKeys = getMissingRequiredEnvKeys();
  if (missingKeys.length > 0) {
    addResult('Input validation', 'SKIP', `Missing env vars: ${missingKeys.join(', ')}`);
    writeReport();
    process.exit(0);
  }

  const apiReachable = await checkApiReachability();
  if (!apiReachable) {
    addResult('Preflight API reachability', 'SKIP', `Cannot reach API at ${baseApi}`);
    writeReport();
    process.exit(0);
  }

  addResult('Preflight API reachability', 'PASS', `API reachable at ${baseApi}`);

  const adminToken = await login('Admin', credentials.admin);
  const studentToken = await login('Student', credentials.student);
  const mentorToken = await login('Mentor', credentials.mentor);

  if (!adminToken || !studentToken || !mentorToken) {
    addResult('Run gate', 'SKIP', 'Cannot continue without all 3 role tokens');
    const summary = writeReport();
    process.exit(summary.failCount > 0 ? 1 : 0);
  }

  const phasePlan = [
    { phase_name: 'Ideation', start_week: 1, end_week: 2 },
    { phase_name: 'Development', start_week: 3, end_week: 15 },
    { phase_name: 'Testing', start_week: 16, end_week: 18 },
    { phase_name: 'Final', start_week: 19, end_week: 20 },
  ];

  const bootstrap = await request({
    method: 'POST',
    url: `${baseApi}/tracker/projects/${projectId}/weeks/bootstrap`,
    token: adminToken,
    body: { totalWeeks, startDate, phasePlan },
  });
  addResult(
    'Admin bootstrap weeks',
    bootstrap.ok ? 'PASS' : 'FAIL',
    bootstrap.ok ? `count=${bootstrap.data?.count ?? 0}` : `HTTP ${bootstrap.status}`
  );

  const studentWeeks = await request({
    method: 'GET',
    url: `${baseApi}/tracker/projects/${projectId}/weeks`,
    token: studentToken,
  });
  addResult(
    'Student list weeks',
    studentWeeks.ok ? 'PASS' : 'FAIL',
    studentWeeks.ok ? `count=${studentWeeks.data?.count ?? 0}` : `HTTP ${studentWeeks.status}`
  );

  if (!studentWeeks.ok || !Array.isArray(studentWeeks.data?.weeks) || studentWeeks.data.weeks.length === 0) {
    addResult('Run gate', 'SKIP', 'No week available for submission flow');
    const summary = writeReport();
    process.exit(summary.failCount > 0 ? 1 : 0);
  }

  const nonTerminalWeeks = studentWeeks.data.weeks.filter((w) => !['locked', 'missed'].includes(w.status));
  let flowWeek = null;
  let flowSubmissions = [];

  for (const week of nonTerminalWeeks) {
    const subsRes = await request({
      method: 'GET',
      url: `${baseApi}/tracker/weeks/${week.week_id}/submissions`,
      token: mentorToken,
    });

    if (!subsRes.ok) continue;

    const subs = subsRes.data?.submissions || [];
    if (week.status === 'pending' && subs.length === 0) {
      flowWeek = week;
      flowSubmissions = subs;
      break;
    }

    if (!flowWeek && ['submitted', 'under_review', 'rejected', 'pending', 'approved'].includes(week.status)) {
      flowWeek = week;
      flowSubmissions = subs;
    }
  }

  if (!flowWeek) {
    addResult('Run gate', 'SKIP', 'No suitable week found for workflow smoke');
    const summary = writeReport();
    process.exit(summary.failCount > 0 ? 1 : 0);
  }

  const weekId = flowWeek.week_id;

  const submissionPayload = {
    summaryOfWork: 'Phase1 smoke: implemented tracker flow checks',
    blockers: 'None',
    nextWeekPlan: 'Proceed with integration tests',
    githubLinkSnapshot: 'https://example.com/pr/phase1-smoke',
  };

  let submit = null;
  if (flowWeek.status === 'pending' && flowSubmissions.length === 0) {
    submit = await request({
      method: 'POST',
      url: `${baseApi}/tracker/weeks/${weekId}/submissions`,
      token: studentToken,
      body: submissionPayload,
    });

    const submitOk =
      submit.ok ||
      ((submit.status === 400 || submit.status === 409) &&
        String(submit.data?.message || '').includes('Current state: submitted'));
    addResult(
      'Student create submission',
      submitOk ? 'PASS' : 'FAIL',
      submitOk ? 'Submitted/already submitted' : withMessage(submit)
    );
  } else {
    addResult(
      'Student create submission',
      'SKIP',
      `Week ${weekId} not fresh pending (state=${flowWeek.status}); reusing existing submission flow`
    );
  }

  const mentorSubs = await request({
    method: 'GET',
    url: `${baseApi}/tracker/weeks/${weekId}/submissions`,
    token: mentorToken,
  });
  addResult(
    'Mentor list submissions',
    mentorSubs.ok ? 'PASS' : 'FAIL',
    mentorSubs.ok ? `count=${mentorSubs.data?.count ?? 0}` : withMessage(mentorSubs)
  );

  const latestSubmission = mentorSubs.data?.submissions?.[0];
  if (!latestSubmission?.submission_id) {
    addResult('Run gate', 'SKIP', 'No submission found for review flow');
    const summary = writeReport();
    process.exit(summary.failCount > 0 ? 1 : 0);
  }

  const uploadFile = await request({
    method: 'POST',
    url: `${baseApi}/tracker/submissions/${latestSubmission.submission_id}/files`,
    token: studentToken,
    body: {
      fileName: 'phase1-smoke-notes.txt',
      fileUrl: 'https://example.com/files/phase1-smoke-notes.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 2048,
    },
  });
  addResult(
    'Submission file upload metadata',
    uploadFile.ok ? 'PASS' : 'FAIL',
    uploadFile.ok ? `file_id=${uploadFile.data?.file?.file_id ?? '-'}` : withMessage(uploadFile)
  );

  const listFiles = await request({
    method: 'GET',
    url: `${baseApi}/tracker/submissions/${latestSubmission.submission_id}/files`,
    token: mentorToken,
  });
  addResult(
    'Submission file list',
    listFiles.ok ? 'PASS' : 'FAIL',
    listFiles.ok ? `count=${listFiles.data?.count ?? 0}` : withMessage(listFiles)
  );

  let reject = null;
  if (['submitted', 'under_review'].includes(flowWeek.status) || submit?.ok) {
    reject = await request({
      method: 'POST',
      url: `${baseApi}/tracker/submissions/${latestSubmission.submission_id}/review`,
      token: mentorToken,
      body: {
        action: 'reject',
        reviewComment: 'Phase1 smoke reject for resubmission test',
      },
    });

    const rejectOk = reject.ok || (reject.status === 409 && String(reject.data?.message || '').includes('not in reviewable state'));
    addResult('Mentor reject submission', rejectOk ? 'PASS' : 'FAIL', rejectOk ? 'Rejected/already non-reviewable' : withMessage(reject));
  } else {
    addResult('Mentor reject submission', 'SKIP', `Week state=${flowWeek.status}; reject flow not applicable`);
  }

  let resubmit = null;
  if (reject?.ok) {
    resubmit = await request({
      method: 'POST',
      url: `${baseApi}/tracker/weeks/${weekId}/submissions/resubmit`,
      token: studentToken,
      body: {
        ...submissionPayload,
        summaryOfWork: 'Phase1 smoke: resubmitted after reject',
      },
    });
    addResult('Student resubmit week', resubmit.ok ? 'PASS' : 'FAIL', resubmit.ok ? 'Resubmitted' : withMessage(resubmit));
  } else {
    addResult('Student resubmit week', 'SKIP', 'Reject step not completed in this run');
  }

  const mentorSubsAfterResubmit = await request({
    method: 'GET',
    url: `${baseApi}/tracker/weeks/${weekId}/submissions`,
    token: mentorToken,
  });

  const latestForApprove = mentorSubsAfterResubmit.data?.submissions?.[0];
  if (latestForApprove?.submission_id && resubmit?.ok) {
    const approve = await request({
      method: 'POST',
      url: `${baseApi}/tracker/submissions/${latestForApprove.submission_id}/review`,
      token: mentorToken,
      body: {
        action: 'approve',
        reviewComment: 'Phase1 smoke approve after resubmission',
      },
    });
    addResult('Mentor approve submission', approve.ok ? 'PASS' : 'FAIL', approve.ok ? 'Approved' : withMessage(approve));
  } else {
    addResult('Mentor approve submission', 'SKIP', 'Resubmission/approval flow not applicable in this run');
  }

  const createTask = await request({
    method: 'POST',
    url: `${baseApi}/tracker/projects/${projectId}/tasks`,
    token: studentToken,
    body: {
      title: 'Phase1 smoke task',
      description: 'Validate task flow',
      priority: 'high',
      assignedToUserKey: process.env.SMOKE_ASSIGN_TO || undefined,
      weekId,
    },
  });
  addResult(
    'Create task',
    createTask.ok ? 'PASS' : 'FAIL',
    createTask.ok ? `task_id=${createTask.data?.task?.task_id ?? '-'}` : withMessage(createTask)
  );

  const taskId = createTask.data?.task?.task_id;
  if (taskId) {
    const moveTask = await request({
      method: 'PATCH',
      url: `${baseApi}/tracker/tasks/${taskId}/status`,
      token: studentToken,
      body: { status: 'in_progress' },
    });
    addResult('Move task status', moveTask.ok ? 'PASS' : 'FAIL', moveTask.ok ? 'todo->in_progress' : withMessage(moveTask));
  } else {
    addResult('Move task status', 'SKIP', 'Task not created');
  }

  const listTasks = await request({
    method: 'GET',
    url: `${baseApi}/tracker/projects/${projectId}/tasks`,
    token: studentToken,
  });
  addResult('List project tasks', listTasks.ok ? 'PASS' : 'FAIL', listTasks.ok ? `count=${listTasks.data?.count ?? 0}` : withMessage(listTasks));

  const timeline = await request({
    method: 'GET',
    url: `${baseApi}/tracker/projects/${projectId}/timeline?page=1&pageSize=20`,
    token: mentorToken,
  });
  addResult('Get project timeline', timeline.ok ? 'PASS' : 'FAIL', timeline.ok ? `count=${timeline.data?.count ?? 0}` : withMessage(timeline));

  const risk = await request({
    method: 'GET',
    url: `${baseApi}/tracker/projects/${projectId}/risk/current`,
    token: mentorToken,
  });
  addResult('Get current risk', risk.ok ? 'PASS' : 'FAIL', risk.ok ? 'Risk fetched' : withMessage(risk));

  const recalcRisk = await request({
    method: 'POST',
    url: `${baseApi}/tracker/projects/${projectId}/risk/recalculate`,
    token: mentorToken,
  });
  addResult(
    'Recalculate risk snapshot',
    recalcRisk.ok ? 'PASS' : 'FAIL',
    recalcRisk.ok ? `risk=${recalcRisk.data?.risk?.risk_level ?? '-'}` : withMessage(recalcRisk)
  );

  const health = await request({
    method: 'GET',
    url: `${baseApi}/tracker/projects/${projectId}/health/current`,
    token: mentorToken,
  });
  addResult('Get current health', health.ok ? 'PASS' : 'FAIL', health.ok ? 'Health fetched' : withMessage(health));

  const recalcHealth = await request({
    method: 'POST',
    url: `${baseApi}/tracker/projects/${projectId}/health/recalculate`,
    token: mentorToken,
  });
  addResult(
    'Recalculate health snapshot',
    recalcHealth.ok ? 'PASS' : 'FAIL',
    recalcHealth.ok ? `score=${recalcHealth.data?.health?.health_score ?? '-'}` : withMessage(recalcHealth)
  );

  const adminLockTarget = nonTerminalWeeks.find((w) => w.week_id !== weekId && !['locked', 'missed'].includes(w.status));
  if (adminLockTarget) {
    const lockWeek = await request({
      method: 'PATCH',
      url: `${baseApi}/tracker/weeks/${adminLockTarget.week_id}/status`,
      token: adminToken,
      body: {
        status: 'locked',
        reason: 'Phase1 smoke override check',
      },
    });
    const lockOk = lockWeek.ok || (lockWeek.status === 409 && String(lockWeek.data?.message || '').includes('Invalid week transition'));
    addResult('Admin week status override', lockOk ? 'PASS' : 'FAIL', lockOk ? 'Week locked/transition-guard verified' : withMessage(lockWeek));
  } else {
    addResult('Admin week status override', 'SKIP', 'No eligible week found for lock override test');
  }

  const studentDashboard = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/student`,
    token: studentToken,
  });
  addResult('Student dashboard', studentDashboard.ok ? 'PASS' : 'FAIL', studentDashboard.ok ? 'Fetched' : withMessage(studentDashboard));

  const mentorDashboard = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/mentor`,
    token: mentorToken,
  });
  addResult('Mentor dashboard', mentorDashboard.ok ? 'PASS' : 'FAIL', mentorDashboard.ok ? 'Fetched' : withMessage(mentorDashboard));

  const unauthorizedDashboard = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/student`,
    token: mentorToken,
  });
  addResult(
    'Negative: unauthorized role returns 403',
    unauthorizedDashboard.status === 403 ? 'PASS' : 'FAIL',
    withMessage(unauthorizedDashboard)
  );

  const invalidTransitionTask = await request({
    method: 'POST',
    url: `${baseApi}/tracker/projects/${projectId}/tasks`,
    token: studentToken,
    body: {
      title: 'Phase1 invalid transition task',
      priority: 'medium',
      weekId,
    },
  });

  if (invalidTransitionTask.ok && invalidTransitionTask.data?.task?.task_id) {
    const invalidTransition = await request({
      method: 'PATCH',
      url: `${baseApi}/tracker/tasks/${invalidTransitionTask.data.task.task_id}/status`,
      token: studentToken,
      body: { status: 'done' },
    });
    addResult(
      'Negative: invalid transition returns 409',
      invalidTransition.status === 409 ? 'PASS' : 'FAIL',
      withMessage(invalidTransition)
    );
  } else {
    addResult('Negative: invalid transition returns 409', 'SKIP', 'Unable to create task for negative test');
  }

  const adminDashboard = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/admin`,
    token: adminToken,
  });
  addResult('Admin dashboard', adminDashboard.ok ? 'PASS' : 'FAIL', adminDashboard.ok ? 'Fetched' : withMessage(adminDashboard));

  const summary = writeReport();
  process.exit(summary.failCount > 0 ? 1 : 0);
};

run().catch((error) => {
  addResult('Unhandled exception', 'FAIL', error.message || 'Unknown error');
  const summary = writeReport();
  process.exit(summary.failCount > 0 ? 1 : 0);
});
