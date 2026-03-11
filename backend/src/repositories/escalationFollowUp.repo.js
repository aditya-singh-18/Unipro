import pool from '../config/db.js';

export const getEscalationDetail = async ({
  weekId,
  pendingOverdueHours,
  reviewOverdueHours,
  criticalOverdueHours,
}) => {
  const q = `
    WITH latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.project_id,
        ws.submitted_at
      FROM week_submissions ws
      ORDER BY ws.week_id, ws.revision_no DESC
    ),
    latest_risk AS (
      SELECT DISTINCT ON (prs.project_id)
        prs.project_id,
        prs.risk_level
      FROM project_risk_snapshots prs
      ORDER BY prs.project_id, prs.calculated_at DESC
    ),
    escalation_rows AS (
      SELECT
        pw.week_id,
        pw.project_id,
        p.title,
        pw.week_number,
        pw.status,
        pw.deadline_at,
        ls.submitted_at,
        p.mentor_employee_id,
        mp.full_name AS mentor_name,
        COALESCE(lr.risk_level, 'low') AS risk_level,
        CASE
          WHEN pw.status = 'pending'
            AND pw.deadline_at IS NOT NULL
            AND pw.deadline_at <= (CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 hour'))
            THEN 'pending_overdue'
          WHEN pw.status IN ('submitted', 'under_review')
            AND ls.submitted_at IS NOT NULL
            AND ls.submitted_at <= (CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 hour'))
            THEN 'review_overdue'
          ELSE NULL
        END AS escalation_type,
        GREATEST(
          0,
          ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(ls.submitted_at, pw.deadline_at))) / 3600.0, 2)
        ) AS overdue_hours
      FROM project_weeks pw
      JOIN projects p ON p.project_id = pw.project_id
      LEFT JOIN latest_submission ls ON ls.week_id = pw.week_id
      LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
      LEFT JOIN latest_risk lr ON lr.project_id = pw.project_id
      WHERE pw.week_id = $4
    )
    SELECT
      er.week_id,
      er.project_id,
      er.title,
      er.week_number,
      er.status,
      er.deadline_at,
      er.submitted_at,
      er.mentor_employee_id,
      er.mentor_name,
      er.risk_level,
      er.escalation_type,
      er.overdue_hours,
      CASE
        WHEN er.overdue_hours >= $3 THEN 'critical'
        WHEN er.overdue_hours >= GREATEST($1, $2) THEN 'warning'
        ELSE 'info'
      END AS escalation_severity
    FROM escalation_rows er
    WHERE er.escalation_type IS NOT NULL
  `;

  const { rows } = await pool.query(q, [pendingOverdueHours, reviewOverdueHours, criticalOverdueHours, weekId]);
  return rows[0] || null;
};

export const getEscalationTimeline = async ({ projectId, weekId }) => {
  const q = `
    SELECT
      timeline_id,
      project_id,
      week_id,
      event_type,
      actor_user_key,
      actor_role,
      meta,
      created_at
    FROM project_activity_timeline
    WHERE project_id = $1
      AND (week_id = $2 OR week_id IS NULL)
      AND event_type IN (
        'admin_escalation_triggered',
        'admin_escalation_acknowledged',
        'admin_follow_up_note_added',
        'admin_escalation_state_changed'
      )
    ORDER BY created_at ASC
  `;

  const { rows } = await pool.query(q, [projectId, weekId]);
  return rows;
};
