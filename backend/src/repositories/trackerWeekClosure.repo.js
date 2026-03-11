import pool from '../config/db.js';

export const getAutoMissedWeekCandidates = async () => {
  const q = `
    SELECT
      pw.week_id,
      pw.project_id,
      pw.week_number,
      pw.deadline_at,
      p.mentor_employee_id
    FROM project_weeks pw
    JOIN projects p ON p.project_id = pw.project_id
    WHERE pw.status IN ('pending', 'submitted')
      AND pw.deadline_at IS NOT NULL
      AND pw.deadline_at < CURRENT_TIMESTAMP
    ORDER BY pw.deadline_at ASC
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const markWeekAsMissedIfEligible = async (weekId) => {
  const q = `
    UPDATE project_weeks
    SET
      status = 'missed',
      updated_at = CURRENT_TIMESTAMP
    WHERE week_id = $1
      AND status IN ('pending', 'submitted')
    RETURNING week_id, project_id, week_number, status, deadline_at
  `;

  const { rows } = await pool.query(q, [weekId]);
  return rows[0] || null;
};
