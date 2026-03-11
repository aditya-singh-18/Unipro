import fs from 'fs';
import path from 'path';

const loadEnvFileIfPresent = (envPath) => {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx < 1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
};

loadEnvFileIfPresent(path.resolve(process.cwd(), '.env.smoke'));

const baseApi = process.env.SMOKE_BASE_API || 'http://localhost:5000/api';
const projectId = process.env.SMOKE_PROJECT_ID || '';
const reportRows = [];

const addResult = (step, status, details) => {
  reportRows.push({ step, status, details });
  console.log(`[${status}] ${step} - ${details}`);
};

const request = async ({ method = 'GET', url, token, body }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

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

  return { ok: res.ok, status: res.status, data };
};

const login = async (name, identifier, password, role) => {
  if (!identifier || !password) {
    addResult(`${name} login`, 'SKIP', 'Missing env credentials');
    return null;
  }

  const res = await request({
    method: 'POST',
    url: `${baseApi}/auth/login`,
    body: { identifier, password, role },
  });

  if (!res.ok || !res.data?.token) {
    addResult(`${name} login`, 'FAIL', `HTTP ${res.status} ${res.data?.message || 'login failed'}`);
    return null;
  }

  addResult(`${name} login`, 'PASS', 'Token acquired');
  return res.data.token;
};

const writeReport = () => {
  const outPath = path.resolve(process.cwd(), '..', 'TRACKER_PHASE3_SECURITY_REPORT.md');
  const pass = reportRows.filter((r) => r.status === 'PASS').length;
  const fail = reportRows.filter((r) => r.status === 'FAIL').length;
  const skip = reportRows.filter((r) => r.status === 'SKIP').length;

  const lines = [
    '# Tracker Phase 3 Security Smoke Report',
    '',
    `Generated At: ${new Date().toISOString()}`,
    `Base API: ${baseApi}`,
    `Project ID: ${projectId || '(not provided)'}`,
    '',
    `Summary: PASS=${pass}, FAIL=${fail}, SKIP=${skip}`,
    '',
    '| Step | Status | Details |',
    '|---|---|---|',
    ...reportRows.map((r) => `| ${r.step} | ${r.status} | ${String(r.details).replace(/\|/g, '\\|')} |`),
  ];

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Report written: ${outPath}`);
  return { pass, fail, skip };
};

const run = async () => {
  const required = [
    'SMOKE_PROJECT_ID',
    'SMOKE_ADMIN_IDENTIFIER',
    'SMOKE_ADMIN_PASSWORD',
    'SMOKE_STUDENT_IDENTIFIER',
    'SMOKE_STUDENT_PASSWORD',
  ];

  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    addResult('Input validation', 'SKIP', `Missing env vars: ${missing.join(', ')}`);
    const summary = writeReport();
    process.exit(summary.fail > 0 ? 1 : 0);
  }

  const adminToken = await login('Admin', process.env.SMOKE_ADMIN_IDENTIFIER, process.env.SMOKE_ADMIN_PASSWORD, process.env.SMOKE_ADMIN_ROLE || 'ADMIN');
  const studentToken = await login('Student', process.env.SMOKE_STUDENT_IDENTIFIER, process.env.SMOKE_STUDENT_PASSWORD, process.env.SMOKE_STUDENT_ROLE || 'STUDENT');

  if (!adminToken || !studentToken) {
    const summary = writeReport();
    process.exit(summary.fail > 0 ? 1 : 0);
  }

  const adminHistory = await request({
    url: `${baseApi}/tracker/projects/${projectId}/status-history?limit=5`,
    token: adminToken,
  });
  addResult('Admin status-history access', adminHistory.ok ? 'PASS' : 'FAIL', adminHistory.ok ? `HTTP ${adminHistory.status}` : `HTTP ${adminHistory.status}`);

  const studentHistory = await request({
    url: `${baseApi}/tracker/projects/${projectId}/status-history?limit=5`,
    token: studentToken,
  });
  addResult('Student status-history blocked', studentHistory.status === 403 ? 'PASS' : 'FAIL', `HTTP ${studentHistory.status}`);

  const adminExport = await request({
    url: `${baseApi}/tracker/dashboard/admin/governance-export?format=json`,
    token: adminToken,
  });
  addResult('Admin governance export access', adminExport.ok ? 'PASS' : 'FAIL', `HTTP ${adminExport.status}`);

  const studentExport = await request({
    url: `${baseApi}/tracker/dashboard/admin/governance-export?format=json`,
    token: studentToken,
  });
  addResult('Student governance export blocked', studentExport.status === 403 ? 'PASS' : 'FAIL', `HTTP ${studentExport.status}`);

  const adminMentorLoad = await request({
    url: `${baseApi}/tracker/dashboard/admin/mentor-load?limit=5`,
    token: adminToken,
  });
  addResult('Admin mentor-load access', adminMentorLoad.ok ? 'PASS' : 'FAIL', `HTTP ${adminMentorLoad.status}`);

  const studentMentorLoad = await request({
    url: `${baseApi}/tracker/dashboard/admin/mentor-load?limit=5`,
    token: studentToken,
  });
  addResult('Student mentor-load blocked', studentMentorLoad.status === 403 ? 'PASS' : 'FAIL', `HTTP ${studentMentorLoad.status}`);

  const summary = writeReport();
  process.exit(summary.fail > 0 ? 1 : 0);
};

run().catch((err) => {
  addResult('Unhandled exception', 'FAIL', err.message || 'unknown error');
  const summary = writeReport();
  process.exit(summary.fail > 0 ? 1 : 0);
});
