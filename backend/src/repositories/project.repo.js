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

/* =========================
   FIND PROJECT
========================= */
export const findProjectById = async (projectId) => {
  const q = `SELECT * FROM projects WHERE project_id = $1`;
  const r = await pool.query(q, [projectId]);
  return r.rows[0];
};

/* =========================
   CREATE PROJECT (STUDENT)
========================= */
export const insertProject = async ({
  projectId,
  title,
  description,
  track,
  techStack, // array of strings
  githubRepoUrl,
}) => {
  const canUseRepoColumn = await hasGithubRepoUrlColumn();

  if (canUseRepoColumn) {
    const q = `
      INSERT INTO projects (
        project_id,
        title,
        description,
        track,
        tech_stack,
        github_repo_url
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `;
    await pool.query(q, [
      projectId,
      title,
      description,
      track,
      JSON.stringify(techStack),
      githubRepoUrl || null,
    ]);
    return;
  }

  const q = `
    INSERT INTO projects (
      project_id,
      title,
      description,
      track,
      tech_stack
    )
    VALUES ($1, $2, $3, $4, $5::jsonb)
  `;
  await pool.query(q, [
    projectId,
    title,
    description,
    track,
    JSON.stringify(techStack),
  ]);
};


/* =========================
   ADMIN: ASSIGN MENTOR
========================= */
export const assignMentorToProject = async ({
  projectId,
  mentorEmployeeId,
}) => {
  const q = `
    UPDATE projects
    SET
      mentor_employee_id = $2,
      status = 'ASSIGNED_TO_MENTOR',
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;
  await pool.query(q, [projectId, mentorEmployeeId]);
};

/* =========================
   MENTOR: REJECT PROJECT
========================= */
export const updateProjectStatusWithFeedback = async ({
  projectId,
  status,
  mentorFeedback,
}) => {
  const q = `
    UPDATE projects
    SET
      status = $2,
      mentor_feedback = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;
  await pool.query(q, [projectId, status, mentorFeedback || null]);
};

/* =========================
   SAVE TO REJECTION HISTORY
========================= */
export const insertRejectionHistory = async ({
  projectId,
  mentorId,
  rejectionReason,
  mentorFeedback,
}) => {
  const q = `
    INSERT INTO project_rejection_history (
      project_id,
      mentor_id,
      rejection_reason,
      mentor_feedback,
      rejected_at,
      resubmitted
    )
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, false)
    RETURNING rejection_id
  `;
  const result = await pool.query(q, [
    projectId,
    mentorId,
    rejectionReason || 'No reason provided',
    mentorFeedback || null,
  ]);
  return result.rows[0];
};

/* =========================
   UPDATE RESUBMITTED STATUS IN HISTORY
========================= */
export const markAsResubmitted = async (projectId) => {
  const q = `
    UPDATE project_rejection_history
    SET
      resubmitted = true,
      resubmitted_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
      AND resubmitted = false
  `;
  await pool.query(q, [projectId]);
};

/* =========================
   MENTOR: APPROVE PROJECT
   (sets approved_at)
========================= */
export const approveProjectByMentor = async (projectId) => {
  const q = `
    UPDATE projects
    SET
      status = 'APPROVED',
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;
  await pool.query(q, [projectId]);
};

/* =========================
   MENTOR: REVOKE APPROVAL
   (within 24h window)
========================= */
export const revokeMentorApproval = async (projectId) => {
  const q = `
    UPDATE projects
    SET
      status = 'ASSIGNED_TO_MENTOR',
      approved_at = NULL,
      mentor_feedback = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;
  await pool.query(q, [projectId]);
};

/* =========================
   ADMIN: VIEW PENDING PROJECTS
========================= */
export const getPendingProjects = async () => {
  const q = `
    SELECT
      project_id,
      title,
      description,
      tech_stack,
      status,
      created_at
    FROM projects
    WHERE status = 'PENDING'
    ORDER BY created_at DESC
  `;
  const r = await pool.query(q);
  return r.rows;
};

/* =========================
   MENTOR: VIEW ASSIGNED PROJECTS
========================= */
export const getProjectsAssignedToMentor = async (mentorEmployeeId) => {
  const q = `
    SELECT
      project_id,
      title,
      description,
      tech_stack,
      status,
      created_at,
      approved_at
    FROM projects
    WHERE mentor_employee_id = $1
      AND status IN ('ASSIGNED_TO_MENTOR', 'RESUBMITTED', 'APPROVED', 'ACTIVE', 'COMPLETED')
    ORDER BY created_at DESC
  `;
  const r = await pool.query(q, [mentorEmployeeId]);
  return r.rows;
};

/* =========================
   MENTOR: GET REJECTED PROJECTS FROM HISTORY
========================= */
export const getRejectedProjectsFromHistory = async (mentorId) => {
  const q = `
    SELECT 
      prh.rejection_id,
      prh.project_id,
      p.title,
      p.description,
      p.tech_stack,
      p.status as current_status,
      prh.rejection_reason,
      prh.mentor_feedback,
      prh.rejected_at,
      prh.resubmitted,
      prh.resubmitted_at,
      prh.created_at
    FROM project_rejection_history prh
    INNER JOIN projects p ON prh.project_id = p.project_id
    WHERE prh.mentor_id = $1
    ORDER BY prh.rejected_at DESC
  `;
  const r = await pool.query(q, [mentorId]);
  return r.rows;
};

/* =========================
   MENTOR: REVOKE REJECTION DECISION
========================= */
export const revokeRejectedProjectDecision = async ({ projectId, mentorId }) => {
  const q = `
    UPDATE projects p
    SET
      status = 'ASSIGNED_TO_MENTOR',
      updated_at = CURRENT_TIMESTAMP
    FROM project_rejection_history prh
    WHERE p.project_id = $1
      AND p.project_id = prh.project_id
      AND prh.mentor_id = $2
      AND p.status = 'REJECTED'
    RETURNING p.project_id, p.status
  `;

  const r = await pool.query(q, [projectId, mentorId]);
  return r.rows[0] || null;
};

/* =========================
   STUDENT: RESUBMIT PROJECT
========================= */
export const resubmitProject = async ({
  projectId,
  title,
  description,
  track,
  techStack,
  githubRepoUrl,
}) => {
  const canUseRepoColumn = await hasGithubRepoUrlColumn();

  if (canUseRepoColumn) {
    const q = `
      UPDATE projects
      SET
        title = $2,
        description = $3,
        track = $4,
        tech_stack = $5::jsonb,
        github_repo_url = COALESCE($6, github_repo_url),
        status = 'RESUBMITTED',
        mentor_feedback = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1
    `;

    await pool.query(q, [
      projectId,
      title,
      description,
      track,
      JSON.stringify(techStack),
      githubRepoUrl || null,
    ]);
    return;
  }

  const q = `
    UPDATE projects
    SET
      title = $2,
      description = $3,
      track = $4,
      tech_stack = $5::jsonb,
      status = 'RESUBMITTED',
      mentor_feedback = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;

  await pool.query(q, [
    projectId,
    title,
    description,
    track,
    JSON.stringify(techStack),
  ]);
};

/* =========================
   STUDENT: EDIT PROJECT (before approval)
========================= */
export const editProjectBeforeApproval = async ({
  projectId,
  title,
  description,
  track,
  techStack,
  githubRepoUrl,
}) => {
  const canUseRepoColumn = await hasGithubRepoUrlColumn();

  if (canUseRepoColumn) {
    const q = `
      UPDATE projects
      SET
        title = $2,
        description = $3,
        track = $4,
        tech_stack = $5::jsonb,
        github_repo_url = COALESCE($6, github_repo_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1
    `;

    await pool.query(q, [
      projectId,
      title,
      description,
      track,
      JSON.stringify(techStack),
      githubRepoUrl || null,
    ]);
    return;
  }

  const q = `
    UPDATE projects
    SET
      title = $2,
      description = $3,
      track = $4,
      tech_stack = $5::jsonb,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;

  await pool.query(q, [
    projectId,
    title,
    description,
    track,
    JSON.stringify(techStack),
  ]);
};

/* =========================
   ADMIN: MANUAL ACTIVATE PROJECT
========================= */
export const activateProject = async (projectId) => {
  const q = `
    UPDATE projects
    SET
      status = 'ACTIVE',
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = $1
  `;
  await pool.query(q, [projectId]);
};

/* =========================
   AUTO ACTIVATE (AFTER 24h)
========================= */
export const autoActivateApprovedProjects = async () => {
  const q = `
    UPDATE projects
    SET
      status = 'ACTIVE',
      updated_at = CURRENT_TIMESTAMP
    WHERE
      status = 'APPROVED'
      AND approved_at <= NOW() - INTERVAL '24 HOURS'
  `;
  await pool.query(q);
};

// =========================
// STUDENT: GET MY PROJECTS
// =========================
export const getProjectsOfStudent = async (enrollmentId) => {
  const q = `
    SELECT DISTINCT
      p.project_id,
      p.title,
      p.status,
      to_jsonb(p)->>'github_repo_url' AS github_repo_url,
      p.mentor_employee_id,
      p.mentor_feedback,
      p.approved_at,
      p.created_at
    FROM projects p
    JOIN team_members tm
      ON tm.team_id = p.project_id
    WHERE tm.enrollment_id = $1
    ORDER BY p.created_at DESC
  `;

  const r = await pool.query(q, [enrollmentId]);
  return r.rows;
};

// =========================
// PROJECT DETAIL
// =========================
export const findProjectDetailById = async (projectId) => {
  const q = `
    SELECT
      p.project_id,
      p.title,
      p.description,
      p.track,
      p.tech_stack,
      to_jsonb(p)->>'github_repo_url' AS github_repo_url,
      p.status,
      p.mentor_employee_id,
      p.mentor_feedback,
      p.approved_at,
      p.created_at
    FROM projects p
    WHERE p.project_id = $1
  `;

  const r = await pool.query(q, [projectId]);
  return r.rows[0];
};

/* =========================
   HELPER: CHECK PROJECT EXISTS
========================= */
export const projectExists = async (teamId) => {
  const q = `
    SELECT 1
    FROM projects
    WHERE project_id = $1
    LIMIT 1
  `;
  const r = await pool.query(q, [teamId]);
  return r.rowCount > 0;
};
