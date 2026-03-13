import pool from '../config/db.js';

let supportsGithubRepoUrlColumn = null;

const hasGithubRepoUrlColumn = async () => {
  if (supportsGithubRepoUrlColumn !== null) {
    return supportsGithubRepoUrlColumn;
  }

  const q = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'projects'
        AND column_name = 'github_repo_url'
    ) AS exists
  `;

  const { rows } = await pool.query(q);
  supportsGithubRepoUrlColumn = Boolean(rows[0]?.exists);
  return supportsGithubRepoUrlColumn;
};

export const getProjectById = async (projectId) => {
  const q = `
    SELECT
      p.project_id,
      p.mentor_employee_id,
      to_jsonb(p)->>'github_repo_url' AS github_repo_url
    FROM projects p
    WHERE p.project_id = $1
  `;
  const { rows } = await pool.query(q, [projectId]);
  return rows[0] || null;
};

export const setProjectGithubRepoUrlIfEmpty = async ({ projectId, githubRepoUrl }) => {
  const canUseRepoColumn = await hasGithubRepoUrlColumn();
  if (!canUseRepoColumn) {
    return null;
  }

  const q = `
    UPDATE projects
    SET
      github_repo_url = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE
      project_id = $1
      AND (github_repo_url IS NULL OR btrim(github_repo_url) = '')
    RETURNING project_id, github_repo_url
  `;
  const { rows } = await pool.query(q, [projectId, githubRepoUrl]);
  return rows[0] || null;
};

export const bootstrapProjectWeeks = async ({ projectId, totalWeeks, startDate, phasePlan }) => {
  const q = `
    INSERT INTO project_weeks (
      project_id,
      week_number,
      phase_name,
      starts_on,
      deadline_at,
      status
    )
    SELECT
      $1,
      gs AS week_number,
      pp.phase_name,
      ($3::date + ((gs - 1) * INTERVAL '7 day'))::date AS starts_on,
      (($3::date + (gs * INTERVAL '7 day'))::timestamp - INTERVAL '1 second') AS deadline_at,
      'pending' AS status
    FROM generate_series(1, $2) gs
    LEFT JOIN LATERAL (
      SELECT p->>'phase_name' AS phase_name
      FROM jsonb_array_elements($4::jsonb) p
      WHERE gs BETWEEN (p->>'start_week')::int AND (p->>'end_week')::int
      LIMIT 1
    ) pp ON true
    ON CONFLICT (project_id, week_number)
    DO UPDATE SET
      phase_name = EXCLUDED.phase_name,
      starts_on = EXCLUDED.starts_on,
      deadline_at = EXCLUDED.deadline_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING week_id, week_number, phase_name, status, starts_on, deadline_at
  `;

  const { rows } = await pool.query(q, [
    projectId,
    totalWeeks,
    startDate,
    JSON.stringify(phasePlan || []),
  ]);

  return rows;
};

export const getWeeksByProjectId = async (projectId) => {
  const q = `
    SELECT
      week_id,
      week_number,
      phase_name,
      status,
      starts_on,
      deadline_at,
      locked_at,
      created_at,
      updated_at
    FROM project_weeks
    WHERE project_id = $1
    ORDER BY week_number ASC
  `;
  const { rows } = await pool.query(q, [projectId]);
  return rows;
};

export const getWeekById = async (weekId) => {
  const q = `
    SELECT
      week_id,
      project_id,
      week_number,
      phase_name,
      status,
      starts_on,
      deadline_at,
      locked_at
    FROM project_weeks
    WHERE week_id = $1
  `;
  const { rows } = await pool.query(q, [weekId]);
  return rows[0] || null;
};

export const updateWeekStatus = async ({ weekId, status }) => {
  const q = `
    UPDATE project_weeks
    SET
      status = $2::varchar,
      locked_at = CASE WHEN $2::varchar = 'locked' THEN CURRENT_TIMESTAMP ELSE locked_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE week_id = $1
    RETURNING week_id, project_id, week_number, status, deadline_at, locked_at
  `;
  const { rows } = await pool.query(q, [weekId, status]);
  return rows[0] || null;
};

export const getNextSubmissionRevision = async (weekId) => {
  const q = `
    SELECT COALESCE(MAX(revision_no), 0)::int + 1 AS revision_no
    FROM week_submissions
    WHERE week_id = $1
  `;
  const { rows } = await pool.query(q, [weekId]);
  return rows[0].revision_no;
};

export const createWeekSubmission = async ({
  weekId,
  projectId,
  revisionNo,
  userKey,
  summaryOfWork,
  blockers,
  nextWeekPlan,
  githubLinkSnapshot,
}) => {
  const q = `
    INSERT INTO week_submissions (
      week_id,
      project_id,
      revision_no,
      submitted_by_user_key,
      summary_of_work,
      blockers,
      next_week_plan,
      github_link_snapshot
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      submission_id,
      week_id,
      project_id,
      revision_no,
      submitted_by_user_key,
      summary_of_work,
      blockers,
      next_week_plan,
      github_link_snapshot,
      submitted_at
  `;

  const { rows } = await pool.query(q, [
    weekId,
    projectId,
    revisionNo,
    userKey,
    summaryOfWork,
    blockers || null,
    nextWeekPlan || null,
    githubLinkSnapshot || null,
  ]);

  return rows[0];
};

export const getWeekSubmissions = async (weekId) => {
  const q = `
    SELECT
      submission_id,
      week_id,
      project_id,
      revision_no,
      submitted_by_user_key,
      summary_of_work,
      blockers,
      next_week_plan,
      github_link_snapshot,
      submitted_at
    FROM week_submissions
    WHERE week_id = $1
    ORDER BY revision_no DESC
  `;
  const { rows } = await pool.query(q, [weekId]);
  return rows;
};

export const getSubmissionById = async (submissionId) => {
  const q = `
    SELECT
      submission_id,
      week_id,
      project_id,
      revision_no,
      submitted_by_user_key,
      summary_of_work,
      blockers,
      next_week_plan,
      github_link_snapshot,
      submitted_at
    FROM week_submissions
    WHERE submission_id = $1
  `;
  const { rows } = await pool.query(q, [submissionId]);
  return rows[0] || null;
};

export const getNextSubmissionFileVersion = async (submissionId, fileName) => {
  const q = `
    SELECT COALESCE(MAX(version_no), 0)::int + 1 AS version_no
    FROM week_submission_files
    WHERE submission_id = $1
      AND file_name = $2
  `;
  const { rows } = await pool.query(q, [submissionId, fileName]);
  return rows[0].version_no;
};

export const createSubmissionFile = async ({
  submissionId,
  versionNo,
  fileName,
  fileUrl,
  mimeType,
  fileSizeBytes,
  uploadedByUserKey,
}) => {
  const q = `
    INSERT INTO week_submission_files (
      submission_id,
      version_no,
      file_name,
      file_url,
      mime_type,
      file_size_bytes,
      uploaded_by_user_key
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      file_id,
      submission_id,
      version_no,
      file_name,
      file_url,
      mime_type,
      file_size_bytes,
      uploaded_by_user_key,
      uploaded_at
  `;

  const { rows } = await pool.query(q, [
    submissionId,
    versionNo,
    fileName,
    fileUrl,
    mimeType || null,
    fileSizeBytes || null,
    uploadedByUserKey,
  ]);

  return rows[0];
};

export const getSubmissionFiles = async (submissionId) => {
  const q = `
    SELECT
      file_id,
      submission_id,
      version_no,
      file_name,
      file_url,
      mime_type,
      file_size_bytes,
      uploaded_by_user_key,
      uploaded_at
    FROM week_submission_files
    WHERE submission_id = $1
    ORDER BY uploaded_at DESC, file_id DESC
  `;
  const { rows } = await pool.query(q, [submissionId]);
  return rows;
};

export const createWeekReview = async ({
  submissionId,
  weekId,
  projectId,
  reviewerEmployeeId,
  action,
  reviewComment,
}) => {
  const q = `
    INSERT INTO week_reviews (
      submission_id,
      week_id,
      project_id,
      reviewer_employee_id,
      action,
      review_comment
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      review_id,
      submission_id,
      week_id,
      project_id,
      reviewer_employee_id,
      action,
      review_comment,
      reviewed_at
  `;

  const { rows } = await pool.query(q, [
    submissionId,
    weekId,
    projectId,
    reviewerEmployeeId,
    action,
    reviewComment || null,
  ]);

  return rows[0];
};

export const getWeekReviews = async (weekId) => {
  const q = `
    SELECT
      review_id,
      submission_id,
      week_id,
      project_id,
      reviewer_employee_id,
      action,
      review_comment,
      reviewed_at
    FROM week_reviews
    WHERE week_id = $1
    ORDER BY reviewed_at DESC
  `;
  const { rows } = await pool.query(q, [weekId]);
  return rows;
};

export const createTask = async ({
  projectId,
  weekId,
  title,
  description,
  priority,
  assignedToUserKey,
  dueDate,
  createdByUserKey,
}) => {
  const q = `
    INSERT INTO project_tasks (
      project_id,
      week_id,
      title,
      description,
      priority,
      assigned_to_user_key,
      due_date,
      created_by_user_key
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      task_id,
      project_id,
      week_id,
      title,
      description,
      priority,
      status,
      assigned_to_user_key,
      due_date,
      created_by_user_key,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(q, [
    projectId,
    weekId || null,
    title,
    description || null,
    priority || 'medium',
    assignedToUserKey || null,
    dueDate || null,
    createdByUserKey,
  ]);

  return rows[0];
};

export const getTasksByProject = async ({ projectId, status, assignedTo, weekId }) => {
  const conditions = ['project_id = $1'];
  const params = [projectId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (assignedTo) {
    params.push(assignedTo);
    conditions.push(`assigned_to_user_key = $${params.length}`);
  }

  if (weekId) {
    params.push(weekId);
    conditions.push(`week_id = $${params.length}`);
  }

  const q = `
    SELECT
      task_id,
      project_id,
      week_id,
      title,
      description,
      priority,
      status,
      assigned_to_user_key,
      due_date,
      created_by_user_key,
      created_at,
      updated_at
    FROM project_tasks
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(q, params);
  return rows;
};

export const getTaskById = async (taskId) => {
  const q = `
    SELECT
      task_id,
      project_id,
      week_id,
      title,
      description,
      priority,
      status,
      assigned_to_user_key,
      due_date,
      created_by_user_key,
      created_at,
      updated_at
    FROM project_tasks
    WHERE task_id = $1
  `;
  const { rows } = await pool.query(q, [taskId]);
  return rows[0] || null;
};

export const updateTaskStatus = async ({ taskId, status }) => {
  const q = `
    UPDATE project_tasks
    SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE task_id = $1
    RETURNING
      task_id,
      project_id,
      week_id,
      title,
      description,
      priority,
      status,
      assigned_to_user_key,
      due_date,
      created_by_user_key,
      created_at,
      updated_at
  `;
  const { rows } = await pool.query(q, [taskId, status]);
  return rows[0] || null;
};

export const createTimelineEvent = async ({
  projectId,
  weekId,
  eventType,
  actorUserKey,
  actorRole,
  meta,
}) => {
  const q = `
    INSERT INTO project_activity_timeline (
      project_id,
      week_id,
      event_type,
      actor_user_key,
      actor_role,
      meta
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING timeline_id, project_id, week_id, event_type, actor_user_key, actor_role, meta, created_at
  `;

  const { rows } = await pool.query(q, [
    projectId,
    weekId || null,
    eventType,
    actorUserKey || null,
    actorRole || null,
    JSON.stringify(meta || {}),
  ]);

  return rows[0];
};

export const getProjectTimeline = async ({ projectId, eventType, limit, offset }) => {
  const conditions = ['project_id = $1'];
  const params = [projectId];

  if (eventType) {
    params.push(eventType);
    conditions.push(`event_type = $${params.length}`);
  }

  params.push(limit);
  const limitPos = params.length;
  params.push(offset);
  const offsetPos = params.length;

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
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${limitPos} OFFSET $${offsetPos}
  `;

  const { rows } = await pool.query(q, params);
  return rows;
};

export const getMentorReviewQueue = async ({
  mentorEmployeeId,
  sortBy,
  order,
  riskLevel,
  limit,
  offset,
}) => {
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  const orderByMap = {
    pending_age: `pending_hours ${direction}, submitted_at ASC`,
    risk: `risk_rank ${direction}, submitted_at ASC`,
    deadline: `deadline_at ${direction} NULLS LAST, submitted_at ASC`,
  };

  const orderByClause = orderByMap[sortBy] || orderByMap.pending_age;

  const params = [mentorEmployeeId];
  const filters = [];

  if (riskLevel) {
    params.push(riskLevel);
    filters.push(`COALESCE(queue.risk_level, 'low') = $${params.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  params.push(limit);
  const limitPos = params.length;
  params.push(offset);
  const offsetPos = params.length;

  const baseCte = `
    WITH mentor_projects AS (
      SELECT p.project_id
      FROM projects p
      WHERE p.mentor_employee_id = $1
    ),
    latest_risk AS (
      SELECT DISTINCT ON (prs.project_id)
        prs.project_id,
        prs.risk_level
      FROM project_risk_snapshots prs
      ORDER BY prs.project_id, prs.calculated_at DESC
    ),
    reviewable_weeks AS (
      SELECT
        pw.week_id,
        pw.project_id,
        pw.week_number,
        pw.phase_name,
        pw.deadline_at,
        pw.status
      FROM project_weeks pw
      WHERE pw.project_id IN (SELECT project_id FROM mentor_projects)
        AND pw.status IN ('submitted', 'under_review')
    ),
    latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.submission_id,
        ws.revision_no,
        ws.submitted_at,
        ws.summary_of_work,
        ws.blockers,
        ws.next_week_plan,
        ws.github_link_snapshot
      FROM week_submissions ws
      WHERE ws.week_id IN (SELECT week_id FROM reviewable_weeks)
      ORDER BY ws.week_id, ws.revision_no DESC
    ),
    queue AS (
      SELECT
        rw.project_id,
        rw.week_id,
        rw.week_number,
        rw.phase_name,
        rw.deadline_at,
        rw.status AS week_status,
        ls.submission_id,
        ls.revision_no,
        ls.submitted_at,
        ls.summary_of_work,
        ls.blockers,
        ls.next_week_plan,
        ls.github_link_snapshot,
        COALESCE(lr.risk_level, 'low') AS risk_level,
        CASE COALESCE(lr.risk_level, 'low')
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          ELSE 1
        END AS risk_rank,
        ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ls.submitted_at)) / 3600.0, 2) AS pending_hours
      FROM reviewable_weeks rw
      JOIN latest_submission ls ON ls.week_id = rw.week_id
      LEFT JOIN latest_risk lr ON lr.project_id = rw.project_id
    )
  `;

  const dataQuery = `
    ${baseCte}
    SELECT
      queue.project_id,
      queue.week_id,
      queue.week_number,
      queue.phase_name,
      queue.deadline_at,
      queue.week_status,
      queue.submission_id,
      queue.revision_no,
      queue.submitted_at,
      queue.summary_of_work,
      queue.blockers,
      queue.next_week_plan,
      queue.github_link_snapshot,
      queue.risk_level,
      queue.pending_hours
    FROM queue
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${limitPos} OFFSET $${offsetPos}
  `;

  const countQuery = `
    ${baseCte}
    SELECT COUNT(*)::int AS total
    FROM queue
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, params),
    pool.query(countQuery, params.slice(0, riskLevel ? 2 : 1)),
  ]);

  return {
    items: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

export const getLatestRiskSnapshot = async (projectId) => {
  const q = `
    SELECT
      risk_snapshot_id,
      project_id,
      risk_level,
      risk_reasons,
      calculated_at,
      created_at
    FROM project_risk_snapshots
    WHERE project_id = $1
    ORDER BY calculated_at DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(q, [projectId]);
  return rows[0] || null;
};

export const createRiskSnapshot = async ({ projectId, riskLevel, riskReasons }) => {
  const q = `
    INSERT INTO project_risk_snapshots (
      project_id,
      risk_level,
      risk_reasons
    )
    VALUES ($1, $2, $3::jsonb)
    RETURNING
      risk_snapshot_id,
      project_id,
      risk_level,
      risk_reasons,
      calculated_at,
      created_at
  `;
  const { rows } = await pool.query(q, [projectId, riskLevel, JSON.stringify(riskReasons || [])]);
  return rows[0];
};

export const getLatestHealthSnapshot = async (projectId) => {
  const q = `
    SELECT
      health_snapshot_id,
      project_id,
      health_score,
      task_completion_rate,
      deadline_adherence_rate,
      review_acceptance_rate,
      activity_signal_score,
      calculated_at,
      created_at
    FROM project_health_snapshots
    WHERE project_id = $1
    ORDER BY calculated_at DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(q, [projectId]);
  return rows[0] || null;
};

export const createHealthSnapshot = async ({
  projectId,
  healthScore,
  taskCompletionRate,
  deadlineAdherenceRate,
  reviewAcceptanceRate,
  activitySignalScore,
}) => {
  const q = `
    INSERT INTO project_health_snapshots (
      project_id,
      health_score,
      task_completion_rate,
      deadline_adherence_rate,
      review_acceptance_rate,
      activity_signal_score
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      health_snapshot_id,
      project_id,
      health_score,
      task_completion_rate,
      deadline_adherence_rate,
      review_acceptance_rate,
      activity_signal_score,
      calculated_at,
      created_at
  `;

  const { rows } = await pool.query(q, [
    projectId,
    healthScore,
    taskCompletionRate,
    deadlineAdherenceRate,
    reviewAcceptanceRate,
    activitySignalScore,
  ]);

  return rows[0];
};

export const getProjectOperationalMetrics = async (projectId) => {
  const q = `
    WITH task_stats AS (
      SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
        COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked_tasks
      FROM project_tasks
      WHERE project_id = $1
    ),
    week_stats AS (
      SELECT
        COUNT(*)::int AS total_weeks,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_weeks,
        COUNT(*) FILTER (
          WHERE deadline_at IS NOT NULL
            AND deadline_at < CURRENT_TIMESTAMP
            AND status NOT IN ('approved', 'locked', 'missed')
        )::int AS overdue_open_weeks,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_weeks
      FROM project_weeks
      WHERE project_id = $1
    ),
    review_stats AS (
      SELECT
        COUNT(*)::int AS total_reviews,
        COUNT(*) FILTER (WHERE action = 'approve')::int AS approved_reviews
      FROM week_reviews
      WHERE project_id = $1
    ),
    activity_stats AS (
      SELECT
        COUNT(*)::int AS events_last_14_days
      FROM project_activity_timeline
      WHERE project_id = $1
        AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '14 day')
    )
    SELECT
      ts.total_tasks,
      ts.done_tasks,
      ts.blocked_tasks,
      ws.total_weeks,
      ws.approved_weeks,
      ws.overdue_open_weeks,
      ws.rejected_weeks,
      rs.total_reviews,
      rs.approved_reviews,
      as2.events_last_14_days
    FROM task_stats ts
    CROSS JOIN week_stats ws
    CROSS JOIN review_stats rs
    CROSS JOIN activity_stats as2
  `;

  const { rows } = await pool.query(q, [projectId]);
  return rows[0] || null;
};

export const getStudentDashboardStats = async (userKey) => {
  const q = `
    WITH student_projects AS (
      SELECT DISTINCT p.project_id
      FROM projects p
      JOIN team_members tm ON tm.team_id = p.project_id
      WHERE tm.enrollment_id = $1
    ),
    latest_risk AS (
      SELECT DISTINCT ON (project_id)
        project_id,
        risk_level
      FROM project_risk_snapshots
      WHERE project_id IN (SELECT project_id FROM student_projects)
      ORDER BY project_id, calculated_at DESC
    )
    SELECT
      (SELECT COUNT(*)::int FROM student_projects) AS total_projects,
      (
        SELECT COUNT(*)::int
        FROM project_weeks pw
        WHERE pw.project_id IN (SELECT project_id FROM student_projects)
          AND pw.status = 'pending'
      ) AS pending_weeks,
      (
        SELECT COUNT(*)::int
        FROM project_weeks pw
        WHERE pw.project_id IN (SELECT project_id FROM student_projects)
          AND pw.status = 'rejected'
      ) AS rejected_weeks,
      (
        SELECT COUNT(*)::int
        FROM latest_risk
        WHERE risk_level = 'high'
      ) AS high_risk_projects
  `;

  const { rows } = await pool.query(q, [userKey]);
  return rows[0];
};

export const getMentorDashboardStats = async (mentorEmployeeId) => {
  const q = `
    WITH mentor_projects AS (
      SELECT p.project_id
      FROM projects p
      WHERE p.mentor_employee_id = $1
    ),
    latest_risk AS (
      SELECT DISTINCT ON (project_id)
        project_id,
        risk_level
      FROM project_risk_snapshots
      WHERE project_id IN (SELECT project_id FROM mentor_projects)
      ORDER BY project_id, calculated_at DESC
    )
    SELECT
      (SELECT COUNT(*)::int FROM mentor_projects) AS assigned_projects,
      (
        SELECT COUNT(*)::int
        FROM project_weeks pw
        WHERE pw.project_id IN (SELECT project_id FROM mentor_projects)
          AND pw.status = 'submitted'
      ) AS review_queue,
      (
        SELECT COUNT(*)::int
        FROM latest_risk
        WHERE risk_level IN ('medium', 'high')
      ) AS risk_alert_projects,
      (
        SELECT COUNT(*)::int
        FROM project_weeks pw
        WHERE pw.project_id IN (SELECT project_id FROM mentor_projects)
          AND pw.status = 'approved'
      ) AS approved_weeks
  `;

  const { rows } = await pool.query(q, [mentorEmployeeId]);
  return rows[0];
};

export const getAdminDashboardStats = async () => {
  const q = `
    WITH latest_risk AS (
      SELECT DISTINCT ON (project_id)
        project_id,
        risk_level
      FROM project_risk_snapshots
      ORDER BY project_id, calculated_at DESC
    )
    SELECT
      (SELECT COUNT(*)::int FROM projects) AS total_projects,
      (SELECT COUNT(*)::int FROM projects WHERE status = 'ACTIVE') AS active_projects,
      (
        SELECT COUNT(*)::int
        FROM latest_risk
        WHERE risk_level = 'high'
      ) AS high_risk_projects,
      (
        SELECT COUNT(*)::int
        FROM project_weeks
        WHERE status = 'missed'
      ) AS missed_weeks
  `;

  const { rows } = await pool.query(q);
  return rows[0];
};

export const getAdminComplianceBoard = async ({ complianceStatus, limit, offset }) => {
  const baseCte = `
    WITH latest_risk AS (
      SELECT DISTINCT ON (project_id)
        project_id,
        risk_level,
        calculated_at
      FROM project_risk_snapshots
      ORDER BY project_id, calculated_at DESC
    ),
    latest_health AS (
      SELECT DISTINCT ON (project_id)
        project_id,
        health_score,
        calculated_at
      FROM project_health_snapshots
      ORDER BY project_id, calculated_at DESC
    ),
    week_rollup AS (
      SELECT
        pw.project_id,
        COUNT(*) FILTER (WHERE pw.status = 'pending')::int AS pending_week_count,
        COUNT(*) FILTER (WHERE pw.status = 'missed')::int AS missed_week_count,
        COUNT(*) FILTER (WHERE pw.status = 'rejected')::int AS rejected_week_count,
        COUNT(*) FILTER (
          WHERE pw.status = 'pending'
            AND pw.deadline_at IS NOT NULL
            AND pw.deadline_at < CURRENT_TIMESTAMP
        )::int AS overdue_pending_count,
        MIN(pw.deadline_at) FILTER (
          WHERE pw.status = 'pending'
            AND pw.deadline_at IS NOT NULL
        ) AS next_pending_deadline
      FROM project_weeks pw
      GROUP BY pw.project_id
    ),
    latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.project_id,
        ws.submitted_at
      FROM week_submissions ws
      ORDER BY ws.week_id, ws.revision_no DESC
    ),
    review_rollup AS (
      SELECT
        pw.project_id,
        COUNT(*) FILTER (WHERE pw.status IN ('submitted', 'under_review'))::int AS review_pending_count,
        MIN(ls.submitted_at) FILTER (WHERE pw.status IN ('submitted', 'under_review')) AS oldest_review_submitted_at,
        MAX(ls.submitted_at) AS latest_submission_at
      FROM project_weeks pw
      LEFT JOIN latest_submission ls ON ls.week_id = pw.week_id
      GROUP BY pw.project_id
    ),
    team_rollup AS (
      SELECT
        tm.team_id AS project_id,
        COUNT(*)::int AS team_size
      FROM team_members tm
      GROUP BY tm.team_id
    ),
    compliance_rows AS (
      SELECT
      p.project_id,
      p.title,
      p.status AS project_status,
      p.mentor_employee_id,
      mp.full_name AS mentor_name,
      COALESCE(tr.team_size, 0) AS team_size,
      COALESCE(wr.pending_week_count, 0) AS pending_week_count,
      COALESCE(wr.missed_week_count, 0) AS missed_week_count,
      COALESCE(wr.rejected_week_count, 0) AS rejected_week_count,
      COALESCE(wr.overdue_pending_count, 0) AS overdue_pending_count,
      wr.next_pending_deadline,
      COALESCE(rr.review_pending_count, 0) AS review_pending_count,
      rr.oldest_review_submitted_at,
      rr.latest_submission_at,
      COALESCE(lr.risk_level, 'low') AS risk_level,
      COALESCE(lh.health_score, 0) AS health_score,
      CASE
        WHEN COALESCE(wr.missed_week_count, 0) > 0
          OR COALESCE(wr.overdue_pending_count, 0) > 0
          OR COALESCE(lr.risk_level, 'low') = 'high' THEN 'critical'
        WHEN COALESCE(rr.review_pending_count, 0) > 0
          OR COALESCE(wr.rejected_week_count, 0) > 0
          OR COALESCE(lr.risk_level, 'low') = 'medium' THEN 'warning'
        ELSE 'healthy'
      END AS compliance_status
      FROM projects p
      LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
      LEFT JOIN team_rollup tr ON tr.project_id = p.project_id
      LEFT JOIN week_rollup wr ON wr.project_id = p.project_id
      LEFT JOIN review_rollup rr ON rr.project_id = p.project_id
      LEFT JOIN latest_risk lr ON lr.project_id = p.project_id
      LEFT JOIN latest_health lh ON lh.project_id = p.project_id
      WHERE p.status IN ('APPROVED', 'ACTIVE', 'COMPLETED')
    )
  `;

  const params = [];
  const where = [];

  if (complianceStatus) {
    params.push(complianceStatus);
    where.push(`compliance_status = $${params.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const summaryQuery = `
    ${baseCte}
    SELECT
      COUNT(*)::int AS total_projects,
      COUNT(*) FILTER (WHERE compliance_status = 'critical')::int AS critical_projects,
      COUNT(*) FILTER (WHERE compliance_status = 'warning')::int AS warning_projects,
      COUNT(*) FILTER (WHERE compliance_status = 'healthy')::int AS healthy_projects,
      COUNT(*) FILTER (WHERE compliance_status IN ('critical', 'warning'))::int AS follow_up_required
    FROM compliance_rows
    ${whereClause}
  `;

  const dataParams = [...params];
  dataParams.push(limit);
  const limitParam = `$${dataParams.length}`;
  dataParams.push(offset);
  const offsetParam = `$${dataParams.length}`;

  const dataQuery = `
    ${baseCte}
    SELECT
      compliance_rows.*,
      COUNT(*) OVER()::int AS total_count
    FROM compliance_rows
    ${whereClause}
    ORDER BY
      CASE
        WHEN missed_week_count > 0
          OR overdue_pending_count > 0
          OR risk_level = 'high' THEN 1
        WHEN review_pending_count > 0
          OR rejected_week_count > 0
          OR risk_level = 'medium' THEN 2
        ELSE 3
      END,
      missed_week_count DESC,
      overdue_pending_count DESC,
      review_pending_count DESC,
      project_id ASC
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `;

  const [summaryResult, dataResult] = await Promise.all([
    pool.query(summaryQuery, params),
    pool.query(dataQuery, dataParams),
  ]);

  const summary = summaryResult.rows[0] || {
    total_projects: 0,
    critical_projects: 0,
    warning_projects: 0,
    healthy_projects: 0,
    follow_up_required: 0,
  };

  const items = dataResult.rows.map((row) => {
    const { total_count, ...rest } = row;
    return rest;
  });

  const total = dataResult.rows[0]?.total_count ?? 0;

  return { summary, items, total };
};

export const getWeekDraft = async ({ weekId, authorUserKey }) => {
  const q = `
    SELECT week_id, author_user_key, draft_data, saved_at
    FROM project_week_drafts
    WHERE week_id = $1 AND author_user_key = $2
  `;

  const { rows } = await pool.query(q, [weekId, authorUserKey]);
  return rows[0] || null;
};

export const upsertWeekDraft = async ({ weekId, authorUserKey, draftData }) => {
  const q = `
    INSERT INTO project_week_drafts (
      week_id,
      author_user_key,
      draft_data,
      saved_at
    )
    VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (week_id, author_user_key)
    DO UPDATE SET
      draft_data = EXCLUDED.draft_data,
      saved_at = CURRENT_TIMESTAMP
    RETURNING week_id, author_user_key, draft_data, saved_at
  `;

  const { rows } = await pool.query(q, [weekId, authorUserKey, JSON.stringify(draftData || {})]);
  return rows[0];
};

export const deleteWeekDraft = async ({ weekId, authorUserKey }) => {
  const q = `
    DELETE FROM project_week_drafts
    WHERE week_id = $1 AND author_user_key = $2
  `;

  await pool.query(q, [weekId, authorUserKey]);
};

export const getLatestProjectStatusLogs = async (projectIds) => {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return [];
  }

  // Some environments may not have this legacy table; keep this integration non-blocking.
  const regClassQuery = `SELECT to_regclass('public.project_status_logs') AS table_name`;
  const regClassResult = await pool.query(regClassQuery);
  if (!regClassResult.rows[0]?.table_name) {
    return [];
  }

  const q = `
    SELECT DISTINCT ON (psl.project_id)
      psl.project_id,
      psl.old_status,
      psl.new_status,
      psl.changed_by,
      psl.reason,
      psl.created_at
    FROM project_status_logs psl
    WHERE psl.project_id = ANY($1::varchar[])
    ORDER BY psl.project_id, psl.created_at DESC
  `;

  const { rows } = await pool.query(q, [projectIds]);
  return rows;
};

export const getProjectStatusHistoryFromTimeline = async ({ projectId, limit = 25 }) => {
  const q = `
    SELECT
      pat.timeline_id,
      pat.project_id,
      pat.week_id,
      pat.event_type,
      pat.actor_user_key,
      pat.actor_role,
      pat.meta,
      pat.created_at
    FROM project_activity_timeline pat
    WHERE pat.project_id = $1
      AND pat.event_type IN (
        'week_status_overridden',
        'week_marked_missed',
        'review_approved',
        'review_rejected',
        'submission_created',
        'submission_resubmitted',
        'admin_escalation_triggered',
        'admin_escalation_acknowledged',
        'admin_follow_up_note_added'
      )
    ORDER BY pat.created_at DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(q, [projectId, limit]);
  return rows;
};

export const getProjectStatusHistoryFromLegacyLogs = async ({ projectId, limit = 25 }) => {
  const regClassQuery = `SELECT to_regclass('public.project_status_logs') AS table_name`;
  const regClassResult = await pool.query(regClassQuery);
  if (!regClassResult.rows[0]?.table_name) {
    return [];
  }

  const q = `
    SELECT
      psl.id,
      psl.project_id,
      psl.old_status,
      psl.new_status,
      psl.changed_by,
      psl.reason,
      psl.created_at
    FROM project_status_logs psl
    WHERE psl.project_id = $1
    ORDER BY psl.created_at DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(q, [projectId, limit]);
  return rows;
};

export const getAdminEscalationQueue = async ({ pendingOverdueHours, reviewOverdueHours, criticalOverdueHours, limit = 15 }) => {
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
      WHERE p.status IN ('APPROVED', 'ACTIVE')
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
    ORDER BY
      CASE er.risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      er.overdue_hours DESC,
      er.project_id ASC,
      er.week_number ASC
    LIMIT $4
  `;

  const { rows } = await pool.query(q, [pendingOverdueHours, reviewOverdueHours, criticalOverdueHours, limit]);
  return rows;
};

export const getAdminRecipients = async () => {
  const q = `
    SELECT user_key
    FROM users
    WHERE LOWER(role) = 'admin'
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const getAdminMentorLoadTrends = async ({ limit = 20 } = {}) => {
  const q = `
    WITH mentor_projects AS (
      SELECT
        p.mentor_employee_id,
        p.project_id,
        p.title
      FROM projects p
      WHERE p.mentor_employee_id IS NOT NULL
        AND p.status IN ('APPROVED', 'ACTIVE', 'COMPLETED')
    ),
    latest_submission AS (
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
    mentor_rollup AS (
      SELECT
        mp.mentor_employee_id,
        prof.full_name AS mentor_name,
        COUNT(DISTINCT mp.project_id)::int AS assigned_projects,
        COUNT(DISTINCT pw.week_id) FILTER (WHERE pw.status IN ('submitted', 'under_review'))::int AS review_queue,
        COUNT(DISTINCT mp.project_id) FILTER (WHERE COALESCE(lr.risk_level, 'low') = 'high')::int AS high_risk_projects,
        ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ls.submitted_at)) / 3600.0)
          FILTER (WHERE pw.status IN ('submitted', 'under_review') AND ls.submitted_at IS NOT NULL), 2) AS avg_queue_age_hours,
        MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ls.submitted_at)) / 3600.0)
          FILTER (WHERE pw.status IN ('submitted', 'under_review') AND ls.submitted_at IS NOT NULL) AS oldest_queue_age_hours
      FROM mentor_projects mp
      LEFT JOIN mentor_profiles prof ON prof.employee_id = mp.mentor_employee_id
      LEFT JOIN project_weeks pw ON pw.project_id = mp.project_id
      LEFT JOIN latest_submission ls ON ls.week_id = pw.week_id
      LEFT JOIN latest_risk lr ON lr.project_id = mp.project_id
      GROUP BY mp.mentor_employee_id, prof.full_name
    )
    SELECT
      mentor_employee_id,
      mentor_name,
      assigned_projects,
      review_queue,
      high_risk_projects,
      COALESCE(avg_queue_age_hours, 0)::numeric(10,2) AS avg_queue_age_hours,
      COALESCE(oldest_queue_age_hours, 0)::numeric(10,2) AS oldest_queue_age_hours,
      CASE
        WHEN review_queue >= 6 OR COALESCE(oldest_queue_age_hours, 0) >= 72 THEN 'critical'
        WHEN review_queue >= 3 OR COALESCE(avg_queue_age_hours, 0) >= 36 THEN 'warning'
        ELSE 'healthy'
      END AS load_band
    FROM mentor_rollup
    ORDER BY
      CASE
        WHEN review_queue >= 6 OR COALESCE(oldest_queue_age_hours, 0) >= 72 THEN 1
        WHEN review_queue >= 3 OR COALESCE(avg_queue_age_hours, 0) >= 36 THEN 2
        ELSE 3
      END,
      review_queue DESC,
      avg_queue_age_hours DESC,
      assigned_projects DESC,
      mentor_employee_id ASC
    LIMIT $1
  `;

  const { rows } = await pool.query(q, [limit]);
  return rows;
};

export const getAdminDepartmentLeaderboard = async ({ limit = 20 } = {}) => {
  const q = `
    WITH project_departments AS (
      SELECT
        p.project_id,
        p.title,
        p.status AS project_status,
        COALESCE(t.department, 'UNSPECIFIED') AS department
      FROM projects p
      LEFT JOIN teams t ON t.team_id = p.project_id
      WHERE p.status IN ('APPROVED', 'ACTIVE', 'COMPLETED')
    ),
    latest_risk AS (
      SELECT DISTINCT ON (prs.project_id)
        prs.project_id,
        prs.risk_level
      FROM project_risk_snapshots prs
      ORDER BY prs.project_id, prs.calculated_at DESC
    ),
    latest_health AS (
      SELECT DISTINCT ON (phs.project_id)
        phs.project_id,
        phs.health_score
      FROM project_health_snapshots phs
      ORDER BY phs.project_id, phs.calculated_at DESC
    ),
    latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.project_id,
        ws.submitted_at
      FROM week_submissions ws
      ORDER BY ws.week_id, ws.revision_no DESC
    ),
    week_rollup AS (
      SELECT
        pd.department,
        COUNT(DISTINCT pd.project_id)::int AS total_projects,
        COUNT(DISTINCT pd.project_id) FILTER (WHERE COALESCE(lr.risk_level, 'low') = 'high')::int AS high_risk_projects,
        COUNT(*) FILTER (WHERE pw.status = 'missed')::int AS missed_weeks,
        COUNT(*) FILTER (
          WHERE pw.status = 'pending'
            AND pw.deadline_at IS NOT NULL
            AND pw.deadline_at < CURRENT_TIMESTAMP
        )::int AS overdue_pending_weeks,
        COUNT(*) FILTER (WHERE pw.status IN ('submitted', 'under_review'))::int AS review_queue,
        ROUND(AVG(lh.health_score), 2) AS avg_health_score,
        ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ls.submitted_at)) / 3600.0)
          FILTER (WHERE pw.status IN ('submitted', 'under_review') AND ls.submitted_at IS NOT NULL), 2) AS avg_review_age_hours
      FROM project_departments pd
      LEFT JOIN project_weeks pw ON pw.project_id = pd.project_id
      LEFT JOIN latest_risk lr ON lr.project_id = pd.project_id
      LEFT JOIN latest_health lh ON lh.project_id = pd.project_id
      LEFT JOIN latest_submission ls ON ls.week_id = pw.week_id
      GROUP BY pd.department
    )
    SELECT
      department,
      total_projects,
      high_risk_projects,
      missed_weeks,
      overdue_pending_weeks,
      review_queue,
      COALESCE(avg_health_score, 0)::numeric(10,2) AS avg_health_score,
      COALESCE(avg_review_age_hours, 0)::numeric(10,2) AS avg_review_age_hours,
      (high_risk_projects + overdue_pending_weeks + review_queue)::int AS pressure_score,
      CASE
        WHEN (high_risk_projects + overdue_pending_weeks + review_queue) >= 8 OR missed_weeks >= 3 THEN 'critical'
        WHEN (high_risk_projects + overdue_pending_weeks + review_queue) >= 4 OR missed_weeks >= 1 THEN 'warning'
        ELSE 'healthy'
      END AS department_band
    FROM week_rollup
    ORDER BY
      CASE
        WHEN (high_risk_projects + overdue_pending_weeks + review_queue) >= 8 OR missed_weeks >= 3 THEN 1
        WHEN (high_risk_projects + overdue_pending_weeks + review_queue) >= 4 OR missed_weeks >= 1 THEN 2
        ELSE 3
      END,
      pressure_score DESC,
      avg_health_score ASC,
      department ASC
    LIMIT $1
  `;

  const { rows } = await pool.query(q, [limit]);
  return rows;
};

export const getProgressReportRows = async ({
  projectId,
  teamId,
  weekStart,
  weekEnd,
} = {}) => {
  const q = `
    WITH latest_submission AS (
      SELECT DISTINCT ON (ws.week_id)
        ws.week_id,
        ws.submission_id,
        ws.revision_no,
        ws.submitted_by_user_key,
        ws.summary_of_work,
        ws.blockers,
        ws.next_week_plan,
        ws.github_link_snapshot,
        ws.submitted_at
      FROM week_submissions ws
      ORDER BY ws.week_id, ws.revision_no DESC
    ),
    latest_review AS (
      SELECT DISTINCT ON (wr.week_id)
        wr.week_id,
        wr.action,
        wr.review_comment,
        wr.reviewer_employee_id,
        wr.reviewed_at
      FROM week_reviews wr
      ORDER BY wr.week_id, wr.reviewed_at DESC
    ),
    latest_risk AS (
      SELECT DISTINCT ON (prs.project_id)
        prs.project_id,
        prs.risk_level,
        prs.calculated_at AS risk_calculated_at
      FROM project_risk_snapshots prs
      ORDER BY prs.project_id, prs.calculated_at DESC
    ),
    latest_health AS (
      SELECT DISTINCT ON (phs.project_id)
        phs.project_id,
        phs.health_score,
        phs.calculated_at AS health_calculated_at
      FROM project_health_snapshots phs
      ORDER BY phs.project_id, phs.calculated_at DESC
    ),
    member_rollup AS (
      SELECT
        tm.team_id,
        COUNT(*)::int AS team_size,
        STRING_AGG(sp.full_name, ' | ' ORDER BY sp.full_name) AS members
      FROM team_members tm
      LEFT JOIN student_profiles sp ON sp.enrollment_id = tm.enrollment_id
      GROUP BY tm.team_id
    )
    SELECT
      p.project_id,
      p.title,
      p.status AS project_status,
      COALESCE(t.department, 'UNSPECIFIED') AS department,
      p.mentor_employee_id,
      mp.full_name AS mentor_name,
      pw.week_id,
      pw.week_number,
      pw.phase_name,
      pw.status AS week_status,
      pw.starts_on,
      pw.deadline_at,
      ls.submission_id,
      ls.revision_no,
      ls.submitted_by_user_key,
      ls.submitted_at,
      ls.summary_of_work,
      ls.blockers,
      ls.next_week_plan,
      ls.github_link_snapshot,
      lr.action AS latest_review_action,
      lr.review_comment AS latest_review_comment,
      lr.reviewer_employee_id,
      lr.reviewed_at,
      COALESCE(rk.risk_level, 'low') AS risk_level,
      0::numeric(10,2) AS risk_score,
      COALESCE(hs.health_score, 0)::numeric(10,2) AS health_score,
      COALESCE(mr.team_size, 0)::int AS team_size,
      COALESCE(mr.members, '') AS team_members
    FROM projects p
    LEFT JOIN teams t ON t.team_id = p.project_id
    LEFT JOIN mentor_profiles mp ON mp.employee_id = p.mentor_employee_id
    LEFT JOIN project_weeks pw ON pw.project_id = p.project_id
    LEFT JOIN latest_submission ls ON ls.week_id = pw.week_id
    LEFT JOIN latest_review lr ON lr.week_id = pw.week_id
    LEFT JOIN latest_risk rk ON rk.project_id = p.project_id
    LEFT JOIN latest_health hs ON hs.project_id = p.project_id
    LEFT JOIN member_rollup mr ON mr.team_id = p.project_id
    WHERE p.status IN ('APPROVED', 'ACTIVE', 'COMPLETED')
      AND ($1::varchar IS NULL OR p.project_id = $1::varchar)
      AND ($2::varchar IS NULL OR p.project_id = $2::varchar)
      AND ($3::int IS NULL OR pw.week_number >= $3::int)
      AND ($4::int IS NULL OR pw.week_number <= $4::int)
    ORDER BY p.project_id ASC, pw.week_number ASC
  `;

  const { rows } = await pool.query(q, [
    projectId || null,
    teamId || null,
    weekStart ?? null,
    weekEnd ?? null,
  ]);

  return rows;
};
