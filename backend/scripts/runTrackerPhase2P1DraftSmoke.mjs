import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const { getWeekDraftService, saveWeekDraftService } = await import('../src/services/tracker.service.js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TEST_PROJECT = 'CSE000005';
const TEST_WEEK_NUMBER = 9101;

let pass = 0;
let fail = 0;
const logPass = (label) => {
  console.log(`[PASS] ${label}`);
  pass += 1;
};
const logFail = (label, detail) => {
  console.error(`[FAIL] ${label}${detail ? ` - ${detail}` : ''}`);
  fail += 1;
};

const client = await pool.connect();
let weekId = null;

try {
  const memberRes = await client.query(
    `SELECT tm.enrollment_id AS user_key
     FROM team_members tm
     WHERE tm.team_id = $1
     ORDER BY tm.enrollment_id ASC
     LIMIT 1`,
    [TEST_PROJECT]
  );

  const userKey = memberRes.rows[0]?.user_key;
  if (!userKey) {
    throw new Error(`No student member found for project ${TEST_PROJECT}`);
  }

  const weekRes = await client.query(
    `INSERT INTO project_weeks (project_id, week_number, status, deadline_at)
     VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP + INTERVAL '2 day')
     RETURNING week_id`,
    [TEST_PROJECT, TEST_WEEK_NUMBER]
  );
  weekId = weekRes.rows[0].week_id;

  const emptyDraft = await getWeekDraftService({ weekId, userKey, role: 'STUDENT' });
  if (emptyDraft?.draft_data?.summaryOfWork === '') {
    logPass('Default empty draft returned');
  } else {
    logFail('Default empty draft returned', JSON.stringify(emptyDraft));
  }

  const savedDraft = await saveWeekDraftService({
    weekId,
    summaryOfWork: 'Built tracker autosave',
    blockers: 'None',
    nextWeekPlan: 'Validate UX',
    githubLinkSnapshot: 'https://example.com/commit/123',
    userKey,
    role: 'STUDENT',
  });

  if (savedDraft?.draft_data?.summaryOfWork === 'Built tracker autosave') {
    logPass('Draft save persisted summary');
  } else {
    logFail('Draft save persisted summary', JSON.stringify(savedDraft));
  }

  const loadedDraft = await getWeekDraftService({ weekId, userKey, role: 'STUDENT' });
  if (
    loadedDraft?.draft_data?.summaryOfWork === 'Built tracker autosave' &&
    loadedDraft?.draft_data?.nextWeekPlan === 'Validate UX'
  ) {
    logPass('Draft load returned persisted payload');
  } else {
    logFail('Draft load returned persisted payload', JSON.stringify(loadedDraft));
  }
} catch (error) {
  logFail('Unexpected exception', error.message);
} finally {
  if (weekId) {
    await client.query(`DELETE FROM project_week_drafts WHERE week_id = $1`, [weekId]);
    await client.query(`DELETE FROM project_weeks WHERE week_id = $1`, [weekId]);
  }
  client.release();
  await pool.end();
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
