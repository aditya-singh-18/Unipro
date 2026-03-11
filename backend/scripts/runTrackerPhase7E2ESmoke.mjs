import dotenv from 'dotenv';
import pkg from 'pg';
import {
  createWeekSubmissionService,
  reviewSubmissionService,
  getAdminComplianceBoardService,
  getAdminEscalationBoardService,
} from '../src/services/tracker.service.js';

const { Pool } = pkg;
dotenv.config();

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let createdWeekId = null;

try {
  const seedQ = `
    SELECT
      p.project_id,
      p.mentor_employee_id,
      tm.enrollment_id AS student_id
    FROM projects p
    JOIN team_members tm ON tm.team_id = p.project_id
    WHERE p.mentor_employee_id IS NOT NULL
      AND p.status IN ('APPROVED','ACTIVE','COMPLETED')
    LIMIT 1
  `;

  const seedR = await pool.query(seedQ);
  const seed = seedR.rows[0];

  if (!seed) {
    ok('E2E flow skipped - no seed project found');
  } else {
    const weekNumber = 9800 + Math.floor(Math.random() * 100);
    const insertWeekQ = `
      INSERT INTO project_weeks (project_id, week_number, status, starts_on, deadline_at)
      VALUES ($1, $2, 'pending', CURRENT_DATE, CURRENT_TIMESTAMP + INTERVAL '24 hours')
      RETURNING week_id
    `;

    const weekR = await pool.query(insertWeekQ, [seed.project_id, weekNumber]);
    createdWeekId = weekR.rows[0].week_id;
    ok('E2E fixture week created', `weekId=${createdWeekId}`);

    const submission = await createWeekSubmissionService({
      weekId: createdWeekId,
      summaryOfWork: 'Phase7 E2E student submission',
      blockers: 'none',
      nextWeekPlan: 'continue implementation',
      githubLinkSnapshot: 'https://example.com/repo/pull/phase7',
      userKey: seed.student_id,
      role: 'STUDENT',
      isResubmission: false,
    });

    if (submission?.submission_id) {
      ok('Student submission created', `submissionId=${submission.submission_id}`);
    } else {
      bad('Student submission creation failed');
    }

    const review = await reviewSubmissionService({
      submissionId: submission.submission_id,
      action: 'approve',
      reviewComment: 'Looks good. Approved in Phase 7 E2E.',
      reviewerEmployeeId: seed.mentor_employee_id,
      role: 'MENTOR',
    });

    if (review?.review_id && review?.action === 'approve') {
      ok('Mentor review approve flow works', `reviewId=${review.review_id}`);
    } else {
      bad('Mentor review flow failed');
    }

    const compliance = await getAdminComplianceBoardService({ page: 1, pageSize: 10 });
    if (Array.isArray(compliance?.items)) {
      ok('Admin monitoring compliance board available', `items=${compliance.items.length}`);
    } else {
      bad('Admin compliance board unavailable');
    }

    const escalations = await getAdminEscalationBoardService({ limit: 10 });
    if (Array.isArray(escalations?.items)) {
      ok('Admin monitoring escalation board available', `items=${escalations.items.length}`);
    } else {
      bad('Admin escalation board unavailable');
    }
  }
} catch (error) {
  bad('Phase 7 E2E execution', error.message);
} finally {
  if (createdWeekId) {
    try {
      await pool.query('DELETE FROM project_activity_timeline WHERE week_id = $1', [createdWeekId]);
      await pool.query('DELETE FROM week_reviews WHERE week_id = $1', [createdWeekId]);
      await pool.query('DELETE FROM week_submission_files WHERE submission_id IN (SELECT submission_id FROM week_submissions WHERE week_id = $1)', [createdWeekId]);
      await pool.query('DELETE FROM week_submissions WHERE week_id = $1', [createdWeekId]);
      await pool.query('DELETE FROM project_week_drafts WHERE week_id = $1', [createdWeekId]);
      await pool.query('DELETE FROM project_weeks WHERE week_id = $1', [createdWeekId]);
      ok('E2E cleanup completed', `weekId=${createdWeekId}`);
    } catch (cleanupError) {
      bad('E2E cleanup failed', cleanupError.message);
    }
  }

  await pool.end();
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
