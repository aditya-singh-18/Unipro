import fs from 'fs';
import path from 'path';
import { runTrackerReminderJob } from '../src/jobs/trackerReminder.job.js';
import { runTrackerWeekClosureJob } from '../src/jobs/trackerWeekClosure.job.js';

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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
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
  const outPath = path.resolve(process.cwd(), '..', 'TRACKER_PHASE2_P0_SMOKE_REPORT.md');
  const pass = reportRows.filter((r) => r.status === 'PASS').length;
  const fail = reportRows.filter((r) => r.status === 'FAIL').length;
  const skip = reportRows.filter((r) => r.status === 'SKIP').length;

  const lines = [
    '# Tracker Phase 2 P0 Smoke Report',
    '',
    `Generated At: ${new Date().toISOString()}`,
    `Base API: ${baseApi}`,
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
    'SMOKE_MENTOR_IDENTIFIER',
    'SMOKE_MENTOR_PASSWORD',
    'SMOKE_MENTOR_ROLE',
  ];

  const missing = required.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length > 0) {
    addResult('Input validation', 'SKIP', `Missing env vars: ${missing.join(', ')}`);
    writeReport();
    process.exit(0);
  }

  const mentorToken = await login(
    'Mentor',
    process.env.SMOKE_MENTOR_IDENTIFIER,
    process.env.SMOKE_MENTOR_PASSWORD,
    process.env.SMOKE_MENTOR_ROLE || 'MENTOR'
  );

  if (!mentorToken) {
    const summary = writeReport();
    process.exit(summary.fail > 0 ? 1 : 0);
  }

  const queue = await request({
    method: 'GET',
    url: `${baseApi}/tracker/mentor/review-queue?sortBy=pending_age&order=desc&page=1&pageSize=20`,
    token: mentorToken,
  });

  addResult(
    'Mentor prioritized review queue',
    queue.ok ? 'PASS' : 'FAIL',
    queue.ok ? `items=${queue.data?.queue?.length || 0}` : `HTTP ${queue.status} ${queue.data?.message || ''}`
  );

  try {
    const reminder = await runTrackerReminderJob();
    addResult(
      'Reminder scheduler one-shot',
      'PASS',
      `student sent=${reminder.student.sent}/${reminder.student.candidates}, mentor sent=${reminder.mentor.sent}/${reminder.mentor.candidates}`
    );
  } catch (err) {
    addResult('Reminder scheduler one-shot', 'FAIL', err.message || 'runtime error');
  }

  try {
    const closure = await runTrackerWeekClosureJob();
    addResult(
      'Auto-missed scheduler one-shot',
      'PASS',
      `transitioned=${closure.transitioned}/${closure.candidates}`
    );
  } catch (err) {
    addResult('Auto-missed scheduler one-shot', 'FAIL', err.message || 'runtime error');
  }

  const summary = writeReport();
  process.exit(summary.fail > 0 ? 1 : 0);
};

run().catch((err) => {
  addResult('Unhandled exception', 'FAIL', err.message || 'unknown error');
  const summary = writeReport();
  process.exit(summary.fail > 0 ? 1 : 0);
});
