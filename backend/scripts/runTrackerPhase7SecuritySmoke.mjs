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
    addResult(`${name} login`, 'FAIL', `HTTP ${res.status}`);
    return null;
  }

  addResult(`${name} login`, 'PASS', 'Token acquired');
  return res.data.token;
};

const finish = () => {
  const pass = reportRows.filter((r) => r.status === 'PASS').length;
  const fail = reportRows.filter((r) => r.status === 'FAIL').length;
  const skip = reportRows.filter((r) => r.status === 'SKIP').length;
  console.log(`PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  process.exitCode = fail > 0 ? 1 : 0;
};

const run = async () => {
  const adminToken = await login('Admin', process.env.SMOKE_ADMIN_IDENTIFIER, process.env.SMOKE_ADMIN_PASSWORD, process.env.SMOKE_ADMIN_ROLE || 'ADMIN');
  const studentToken = await login('Student', process.env.SMOKE_STUDENT_IDENTIFIER, process.env.SMOKE_STUDENT_PASSWORD, process.env.SMOKE_STUDENT_ROLE || 'STUDENT');

  if (!adminToken || !studentToken) {
    addResult('Security suite', 'SKIP', 'Credentials missing for live API security tests');
    finish();
    return;
  }

  // Role guard bypass attempt: student hitting admin-only reports endpoint
  const studentReport = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/admin/progress-report/export?format=json`,
    token: studentToken,
  });

  addResult(
    'Role guard: student blocked from admin progress report',
    studentReport.status === 403 ? 'PASS' : 'FAIL',
    `HTTP ${studentReport.status}`
  );

  // Admin allowed path check
  const adminReport = await request({
    method: 'GET',
    url: `${baseApi}/tracker/dashboard/admin/progress-report/export?format=json`,
    token: adminToken,
  });

  addResult(
    'Role guard: admin allowed for progress report',
    adminReport.ok ? 'PASS' : 'FAIL',
    `HTTP ${adminReport.status}`
  );

  // File upload validation: missing required payload
  const invalidUpload = await request({
    method: 'POST',
    url: `${baseApi}/tracker/submissions/1/files`,
    token: studentToken,
    body: {
      fileName: '',
      fileUrl: '',
    },
  });

  addResult(
    'File upload validation blocks empty fileName/fileUrl',
    invalidUpload.status === 400 ? 'PASS' : 'FAIL',
    `HTTP ${invalidUpload.status}`
  );

  finish();
};

run().catch((err) => {
  addResult('Unhandled exception', 'FAIL', err.message || 'unknown error');
  finish();
});
