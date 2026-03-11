import pool from '../config/db.js';

export const getStudentDeadlineReminderCandidates = async ({ deadlineHours }) => {
  const q = `
    SELECT
      pw.week_id,
      pw.project_id,
      pw.week_number,
      pw.deadline_at,
      tm.enrollment_id AS recipient_user_key
    FROM project_weeks pw
    JOIN team_members tm ON tm.team_id = pw.project_id
    WHERE pw.status = 'pending'
      AND pw.deadline_at IS NOT NULL
      AND pw.deadline_at > CURRENT_TIMESTAMP
      AND pw.deadline_at <= (CURRENT_TIMESTAMP + ($1::int * INTERVAL '1 hour'))
  `;

  const { rows } = await pool.query(q, [deadlineHours]);
  return rows;
};

export const getMentorReviewReminderCandidates = async ({ reviewSlaHours }) => {
  const q = `
    WITH latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.project_id,
        ws.submitted_at
      FROM week_submissions ws
      ORDER BY ws.week_id, ws.revision_no DESC
    )
    SELECT
      pw.week_id,
      pw.project_id,
      pw.week_number,
      pw.deadline_at,
      p.mentor_employee_id AS recipient_user_key,
      ls.submitted_at
    FROM project_weeks pw
    JOIN projects p ON p.project_id = pw.project_id
    JOIN latest_submission ls ON ls.week_id = pw.week_id
    WHERE pw.status IN ('submitted', 'under_review')
      AND p.mentor_employee_id IS NOT NULL
      AND ls.submitted_at <= (CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 hour'))
  `;

  const { rows } = await pool.query(q, [reviewSlaHours]);
  return rows;
};

export const registerNotificationDispatch = async ({
  dedupeKey,
  projectId,
  weekId,
  recipientUserKey,
  notificationType,
}) => {
  const q = `
    INSERT INTO tracker_notification_dispatch_log (
      dedupe_key,
      project_id,
      week_id,
      recipient_user_key,
      notification_type
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING dispatch_id
  `;

  const { rows } = await pool.query(q, [
    dedupeKey,
    projectId,
    weekId || null,
    recipientUserKey,
    notificationType,
  ]);

  return rows[0] || null;
};
