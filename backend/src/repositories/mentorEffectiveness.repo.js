import pool from '../config/db.js';

export const getReviewTurnaroundStats = async (mentorId = null, days = 14) => {
  const q = `
    SELECT
      COALESCE(p.mentor_employee_id, 'unknown') AS mentor_id,
      COALESCE(mp.full_name, 'Unknown Mentor') AS mentor_name,
      COUNT(wr.review_id) AS review_count,
      EXTRACT(EPOCH FROM AVG(wr.reviewed_at - ws.submitted_at)) * 1000 AS avg_turnaround_ms,
      EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wr.reviewed_at - ws.submitted_at)) * 1000 AS median_turnaround_ms,
      EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wr.reviewed_at - ws.submitted_at)) * 1000 AS p95_turnaround_ms
    FROM week_reviews wr
    JOIN week_submissions ws ON ws.submission_id = wr.submission_id
    JOIN project_weeks pw ON pw.week_id = ws.week_id
    JOIN projects p ON p.project_id = pw.project_id
    LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
    WHERE wr.reviewed_at IS NOT NULL
      AND ws.submitted_at IS NOT NULL
      AND wr.reviewed_at >= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
      ${mentorId ? 'AND p.mentor_employee_id = $2' : ''}
    GROUP BY p.mentor_employee_id, mp.full_name
    ORDER BY mentor_id
  `;

  const params = mentorId ? [days, mentorId] : [days];
  const { rows } = await pool.query(q, params);
  return rows;
};

/**
 * Get feedback depth statistics (avg length, rich ratio) for a mentor or all mentors
 * Rich feedback = comments > 200 characters
 */
export const getFeedbackDepthStats = async (mentorId = null, days = 14) => {
  const q = `
    SELECT
      COALESCE(p.mentor_employee_id, 'unknown') AS mentor_id,
      COALESCE(mp.full_name, 'Unknown Mentor') AS mentor_name,
      COUNT(wr.review_id) AS review_count,
      ROUND(AVG(COALESCE(LENGTH(wr.review_comment), 0))::numeric, 2) AS avg_feedback_depth,
      ROUND(
        (SUM(CASE WHEN LENGTH(COALESCE(wr.review_comment, '')) > 200 THEN 1 ELSE 0 END)::numeric / 
         NULLIF(COUNT(wr.review_id), 0)) * 100,
        2
      ) AS rich_feedback_ratio_percent
    FROM week_reviews wr
    JOIN week_submissions ws ON ws.submission_id = wr.submission_id
    JOIN project_weeks pw ON pw.week_id = ws.week_id
    JOIN projects p ON p.project_id = pw.project_id
    LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
    WHERE wr.reviewed_at >= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
      ${mentorId ? 'AND p.mentor_employee_id = $2' : ''}
    GROUP BY p.mentor_employee_id, mp.full_name
    ORDER BY mentor_id
  `;

  const params = mentorId ? [days, mentorId] : [days];
  const { rows } = await pool.query(q, params);
  return rows;
};

/**
 * Get mentor workload band (active projects, capacity state)
 * Bands: healthy (<5), warning (5-10), critical (>10)
 */
export const getMentorWorkloadBand = async (mentorId) => {
  const q = `
    SELECT
      COALESCE(p.mentor_employee_id, 'unknown') AS mentor_id,
      COALESCE(mp.full_name, 'Unknown Mentor') AS mentor_name,
      COUNT(DISTINCT p.project_id) AS active_project_count,
      CASE
        WHEN COUNT(DISTINCT p.project_id) > 10 THEN 'critical'
        WHEN COUNT(DISTINCT p.project_id) >= 5 THEN 'warning'
        ELSE 'healthy'
      END AS workload_band
    FROM projects p
    LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
    LEFT JOIN project_weeks pw ON pw.project_id = p.project_id AND pw.status NOT IN ('locked', 'missed', 'approved')
    WHERE p.mentor_employee_id = $1
    GROUP BY p.mentor_employee_id, mp.full_name
  `;

  const { rows } = await pool.query(q, [mentorId]);
  return rows[0] || null;
};

/**
 * Get admin mentor effectiveness grid (all mentors with all metrics)
 */
export const getAdminMentorEffectivenessGrid = async ({ days = 14, q = '', limit = 50, offset = 0 } = {}) => {
  const qTrim = (q || '').trim();
  const sql = `
    WITH mentor_turnaround AS (
      SELECT
        COALESCE(p.mentor_employee_id, 'unknown') AS mentor_id,
        COALESCE(mp.full_name, 'Unknown Mentor') AS mentor_name,
        COUNT(wr.review_id) AS review_count,
        EXTRACT(EPOCH FROM AVG(wr.reviewed_at - ws.submitted_at)) * 1000 AS avg_turnaround_ms,
        EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wr.reviewed_at - ws.submitted_at)) * 1000 AS median_turnaround_ms,
        EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wr.reviewed_at - ws.submitted_at)) * 1000 AS p95_turnaround_ms
      FROM week_reviews wr
      JOIN week_submissions ws ON ws.submission_id = wr.submission_id
      JOIN project_weeks pw ON pw.week_id = ws.week_id
      JOIN projects p ON p.project_id = pw.project_id
      LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
      WHERE wr.reviewed_at IS NOT NULL
        AND ws.submitted_at IS NOT NULL
        AND wr.reviewed_at >= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
      GROUP BY p.mentor_employee_id, mp.full_name
    ),
    mentor_feedback_depth AS (
      SELECT
        COALESCE(p.mentor_employee_id, 'unknown') AS mentor_id,
        ROUND(AVG(COALESCE(LENGTH(wr.review_comment), 0))::numeric, 2) AS avg_feedback_depth,
        ROUND(
          (SUM(CASE WHEN LENGTH(COALESCE(wr.review_comment, '')) > 200 THEN 1 ELSE 0 END)::numeric / 
           NULLIF(COUNT(wr.review_id), 0)) * 100,
          2
        ) AS rich_feedback_ratio_percent
      FROM week_reviews wr
      JOIN week_submissions ws ON ws.submission_id = wr.submission_id
      JOIN project_weeks pw ON pw.week_id = ws.week_id
      JOIN projects p ON p.project_id = pw.project_id
      WHERE wr.reviewed_at >= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
      GROUP BY p.mentor_employee_id
    ),
    mentor_workload AS (
      SELECT
        p.mentor_employee_id AS mentor_id,
        COUNT(DISTINCT p.project_id) AS active_project_count,
        CASE
          WHEN COUNT(DISTINCT p.project_id) > 10 THEN 'critical'
          WHEN COUNT(DISTINCT p.project_id) >= 5 THEN 'warning'
          ELSE 'healthy'
        END AS workload_band
      FROM projects p
      LEFT JOIN project_weeks pw ON pw.project_id = p.project_id AND pw.status NOT IN ('locked', 'missed', 'approved')
      GROUP BY p.mentor_employee_id
    ),
    grid AS (
      SELECT
        mt.mentor_id,
        mt.mentor_name,
        COALESCE(mt.review_count, 0) AS review_count,
        mt.avg_turnaround_ms,
        mt.median_turnaround_ms,
        mt.p95_turnaround_ms,
        COALESCE(mf.avg_feedback_depth, 0) AS avg_feedback_depth,
        COALESCE(mf.rich_feedback_ratio_percent, 0) AS rich_feedback_ratio_percent,
        COALESCE(mw.active_project_count, 0) AS active_project_count,
        COALESCE(mw.workload_band, 'healthy') AS workload_band
      FROM mentor_turnaround mt
      LEFT JOIN mentor_feedback_depth mf ON mf.mentor_id = mt.mentor_id
      LEFT JOIN mentor_workload mw ON mw.mentor_id = mt.mentor_id
    ),
    org_summary AS (
      SELECT
        COUNT(*)::int AS total_mentors,
        COALESCE(ROUND(AVG(review_count))::int, 0) AS avg_review_count,
        COALESCE(ROUND(AVG(avg_turnaround_ms) FILTER (WHERE avg_turnaround_ms IS NOT NULL))::bigint, 0) AS avg_turnaround_ms,
        COALESCE(ROUND(AVG(avg_feedback_depth))::int, 0) AS avg_feedback_depth,
        COUNT(*) FILTER (WHERE workload_band = 'healthy')::int AS healthy_count,
        COUNT(*) FILTER (WHERE workload_band = 'warning')::int AS warning_count,
        COUNT(*) FILTER (WHERE workload_band = 'critical')::int AS critical_count
      FROM grid
    ),
    filtered AS (
      SELECT g.*
      FROM grid g
      WHERE ($2 = '' OR LOWER(g.mentor_name) LIKE '%' || LOWER($2) || '%'
                     OR LOWER(g.mentor_id)   LIKE '%' || LOWER($2) || '%')
    )
    SELECT
      (SELECT total_mentors    FROM org_summary) AS _summary_total_mentors,
      (SELECT avg_review_count FROM org_summary) AS _summary_avg_review_count,
      (SELECT avg_turnaround_ms FROM org_summary) AS _summary_avg_turnaround_ms,
      (SELECT avg_feedback_depth FROM org_summary) AS _summary_avg_feedback_depth,
      (SELECT healthy_count    FROM org_summary) AS _summary_healthy_count,
      (SELECT warning_count    FROM org_summary) AS _summary_warning_count,
      (SELECT critical_count   FROM org_summary) AS _summary_critical_count,
      (SELECT COUNT(*)::int FROM filtered) AS _filtered_total,
      f.*
    FROM filtered f
    ORDER BY f.mentor_name
    LIMIT $3 OFFSET $4
  `;

    const { rows } = await pool.query(sql, [days, qTrim, limit, offset]);
  return rows;
};

/**
 * Get recent review count for a mentor (last X days)
 */
export const getRecentReviewCount = async (mentorId, days = 7) => {
  const q = `
    SELECT COUNT(wr.review_id) AS recent_review_count
    FROM week_reviews wr
    JOIN week_submissions ws ON ws.submission_id = wr.submission_id
    JOIN project_weeks pw ON pw.week_id = ws.week_id
    JOIN projects p ON p.project_id = pw.project_id
    WHERE p.mentor_employee_id = $1
      AND wr.reviewed_at >= CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 day')
  `;

  const { rows } = await pool.query(q, [mentorId, days]);
  return rows[0]?.recent_review_count || 0;
};
