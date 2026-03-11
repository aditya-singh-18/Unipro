import pool from '../config/db.js';

const QUALITY_SCORE_SQL = `(
  (CASE
    WHEN LENGTH(COALESCE(ws.summary_of_work, '')) >= 200 THEN 35
    WHEN LENGTH(COALESCE(ws.summary_of_work, '')) >= 120 THEN 25
    WHEN LENGTH(COALESCE(ws.summary_of_work, '')) >= 60 THEN 15
    ELSE 5
  END)
  +
  (CASE
    WHEN LENGTH(COALESCE(ws.next_week_plan, '')) >= 80 THEN 20
    WHEN LENGTH(COALESCE(ws.next_week_plan, '')) >= 40 THEN 12
    WHEN LENGTH(COALESCE(ws.next_week_plan, '')) > 0 THEN 5
    ELSE 0
  END)
  +
  (CASE WHEN COALESCE(ws.github_link_snapshot, '') <> '' THEN 15 ELSE 0 END)
  +
  (CASE
    WHEN LENGTH(COALESCE(ws.blockers, '')) >= 20 THEN 10
    WHEN LENGTH(COALESCE(ws.blockers, '')) > 0 THEN 5
    ELSE 0
  END)
  +
  (CASE
    WHEN COALESCE(lr.action, '') = 'approve' THEN 20
    WHEN COALESCE(lr.action, '') = 'reject' THEN 10
    ELSE 5
  END)
)`;

export const getStudentLearningRoster = async ({ days = 42, q = '', limit = 50, offset = 0 } = {}) => {
  const qTrim = (q || '').trim();
  const sql = `
    WITH latest_reviews AS (
      SELECT DISTINCT ON (wr.submission_id)
        wr.submission_id,
        wr.action,
        wr.review_comment,
        wr.reviewed_at
      FROM week_reviews wr
      ORDER BY wr.submission_id, wr.reviewed_at DESC, wr.review_id DESC
    ),
    scored AS (
      SELECT
        ws.project_id,
        ws.submitted_by_user_key AS student_key,
        ws.week_id,
        ws.revision_no,
        ws.submitted_at,
        ${QUALITY_SCORE_SQL}::int AS quality_score,
        lr.action,
        lr.review_comment,
        CASE
          WHEN LOWER(COALESCE(lr.review_comment, '')) ~ '(good|great|excellent|well done|nice work|solid)' THEN 'supportive'
          WHEN LOWER(COALESCE(lr.review_comment, '')) ~ '(improve|issue|missing|needs|incorrect|fix|weak)' THEN 'critical'
          ELSE 'neutral'
        END AS sentiment_bucket
      FROM week_submissions ws
      LEFT JOIN latest_reviews lr ON lr.submission_id = ws.submission_id
      WHERE ws.submitted_at >= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
    ),
    rollup AS (
      SELECT
        s.project_id,
        s.student_key,
        COUNT(*)::int AS submission_count,
        COUNT(*) FILTER (WHERE s.revision_no > 1)::int AS revision_count,
        ROUND(AVG(s.quality_score)::numeric, 2) AS avg_quality_score,
        ROUND((SUM(CASE WHEN s.action = 'approve' THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN s.action IN ('approve', 'reject') THEN 1 ELSE 0 END), 0)) * 100, 2) AS acceptance_rate,
        SUM(CASE WHEN s.sentiment_bucket = 'supportive' THEN 1 ELSE 0 END)::int AS supportive_feedback_count,
        SUM(CASE WHEN s.sentiment_bucket = 'critical' THEN 1 ELSE 0 END)::int AS critical_feedback_count,
        SUM(CASE WHEN s.sentiment_bucket = 'neutral' THEN 1 ELSE 0 END)::int AS neutral_feedback_count,
        MIN(s.submitted_at) AS first_submitted_at,
        MAX(s.submitted_at) AS latest_submitted_at
      FROM scored s
      GROUP BY s.project_id, s.student_key
    ),
    first_scores AS (
      SELECT DISTINCT ON (project_id, student_key)
        project_id,
        student_key,
        quality_score AS first_quality_score
      FROM scored
      ORDER BY project_id, student_key, submitted_at ASC
    ),
    latest_scores AS (
      SELECT DISTINCT ON (project_id, student_key)
        project_id,
        student_key,
        quality_score AS latest_quality_score
      FROM scored
      ORDER BY project_id, student_key, submitted_at DESC
    ),
    grid AS (
      SELECT
        r.project_id,
        r.student_key,
        r.submission_count,
        r.revision_count,
        r.avg_quality_score,
        COALESCE(r.acceptance_rate, 0) AS acceptance_rate,
        r.supportive_feedback_count,
        r.critical_feedback_count,
        r.neutral_feedback_count,
        r.first_submitted_at,
        r.latest_submitted_at,
        COALESCE(fs.first_quality_score, 0) AS first_quality_score,
        COALESCE(ls.latest_quality_score, 0) AS latest_quality_score
      FROM rollup r
      LEFT JOIN first_scores fs ON fs.project_id = r.project_id AND fs.student_key = r.student_key
      LEFT JOIN latest_scores ls ON ls.project_id = r.project_id AND ls.student_key = r.student_key
    ),
    org_summary AS (
      SELECT
        COUNT(*)::int AS total_students,
        COUNT(*) FILTER (WHERE (latest_quality_score - first_quality_score) >= 10)::int AS improving_count,
        COUNT(*) FILTER (WHERE (latest_quality_score - first_quality_score) <= -10)::int AS declining_count,
        COUNT(*) FILTER (WHERE (latest_quality_score - first_quality_score) > -10
                           AND (latest_quality_score - first_quality_score) < 10)::int AS stable_count,
        COALESCE(ROUND(AVG(acceptance_rate))::int, 0) AS avg_acceptance_rate
      FROM grid
    ),
    filtered AS (
      SELECT g.*
      FROM grid g
      WHERE ($2 = '' OR LOWER(g.student_key) LIKE '%' || LOWER($2) || '%'
                     OR LOWER(g.project_id::text) LIKE '%' || LOWER($2) || '%')
    )
    SELECT
      (SELECT total_students    FROM org_summary) AS _summary_total_students,
      (SELECT improving_count   FROM org_summary) AS _summary_improving_count,
      (SELECT declining_count   FROM org_summary) AS _summary_declining_count,
      (SELECT stable_count      FROM org_summary) AS _summary_stable_count,
      (SELECT avg_acceptance_rate FROM org_summary) AS _summary_avg_acceptance_rate,
      (SELECT COUNT(*)::int FROM filtered) AS _filtered_total,
      f.*
    FROM filtered f
    ORDER BY (f.latest_quality_score - f.first_quality_score) ASC, f.latest_submitted_at DESC
    LIMIT $3 OFFSET $4
  `;

  const { rows } = await pool.query(sql, [days, qTrim, limit, offset]);
  return rows;
};

export const getStudentLearningDetail = async (projectId, studentKey, days = 56) => {
  const q = `
    WITH latest_reviews AS (
      SELECT DISTINCT ON (wr.submission_id)
        wr.submission_id,
        wr.action,
        wr.review_comment,
        wr.reviewed_at
      FROM week_reviews wr
      ORDER BY wr.submission_id, wr.reviewed_at DESC, wr.review_id DESC
    )
    SELECT
      ws.submission_id,
      ws.project_id,
      ws.week_id,
      pw.week_number,
      ws.submitted_by_user_key AS student_key,
      ws.revision_no,
      ws.summary_of_work,
      ws.blockers,
      ws.next_week_plan,
      ws.github_link_snapshot,
      ws.submitted_at,
      lr.action,
      lr.review_comment,
      lr.reviewed_at,
      ${QUALITY_SCORE_SQL}::int AS quality_score
    FROM week_submissions ws
    JOIN project_weeks pw ON pw.week_id = ws.week_id
    LEFT JOIN latest_reviews lr ON lr.submission_id = ws.submission_id
    WHERE ws.project_id = $1
      AND ws.submitted_by_user_key = $2
      AND ws.submitted_at >= CURRENT_TIMESTAMP - ($3::int * INTERVAL '1 day')
    ORDER BY ws.submitted_at DESC, ws.revision_no DESC
  `;

  const { rows } = await pool.query(q, [projectId, studentKey, days]);
  return rows;
};
