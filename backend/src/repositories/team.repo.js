import pool from '../config/db.js';

/* =========================
   CREATE TEAM
========================= */
export const insertTeam = async (
  teamId,
  department,
  leaderEnrollmentId,
  maxTeamSize,
  teamName = null
) => {
  const query = `
    INSERT INTO teams (team_id, department, leader_enrollment_id, max_team_size, team_name)
    VALUES ($1, $2, $3, $4, $5)
  `;
  await pool.query(query, [
    teamId,
    department,
    leaderEnrollmentId,
    maxTeamSize,
    teamName,
  ]);
};

/* =========================
   TEAM MEMBERS
========================= */
export const addTeamMember = async (
  teamId,
  enrollmentId,
  isLeader = false
) => {
  const query = `
    INSERT INTO team_members (team_id, enrollment_id, is_leader)
    VALUES ($1, $2, $3)
  `;
  await pool.query(query, [teamId, enrollmentId, isLeader]);
};

export const isTeamLeader = async (teamId, enrollmentId) => {
  const q = `
    SELECT 1
    FROM team_members
    WHERE team_id = $1
      AND enrollment_id = $2
      AND is_leader = true
  `;
  const r = await pool.query(q, [teamId, enrollmentId]);
  return r.rowCount > 0;
};

export const isMemberExists = async (teamId, enrollmentId) => {
  const q = `
    SELECT 1
    FROM team_members
    WHERE team_id = $1
      AND enrollment_id = $2
  `;
  const r = await pool.query(q, [teamId, enrollmentId]);
  return r.rowCount > 0;
};

export const countTeamMembers = async (teamId) => {
  const q = `
    SELECT COUNT(*)::int AS count
    FROM team_members
    WHERE team_id = $1
  `;
  const r = await pool.query(q, [teamId]);
  return r.rows[0].count;
};

export const getTeamMembers = async (teamId) => {
  const q = `
    SELECT
      enrollment_id,
      is_leader
    FROM team_members
    WHERE team_id = $1
    ORDER BY is_leader DESC
  `;
  const r = await pool.query(q, [teamId]);
  return r.rows;
};

/* =========================
   TEAM FETCH
========================= */
export const findTeamById = async (teamId) => {
  const q = `
    SELECT
      t.team_id,
      t.department,
      t.leader_enrollment_id,
      t.max_team_size,
      t.created_at,
      t.team_name,
      p.title AS project_title
    FROM teams t
    LEFT JOIN projects p ON p.project_id = t.team_id
    WHERE t.team_id = $1
  `;
  const r = await pool.query(q, [teamId]);
  return r.rows[0];
};

/* =========================
   STUDENT ↔ TEAMS (CORE RULE)
========================= */

/**
 * Total teams student is part of
 * (created + joined)
 * MAX allowed = 3
 */
export const countTeamsOfStudent = async (enrollmentId) => {
  const q = `
    SELECT COUNT(DISTINCT team_id)::int AS count
    FROM team_members
    WHERE enrollment_id = $1
  `;
  const r = await pool.query(q, [enrollmentId]);
  return r.rows[0].count;
};

/**
 * All teams of a student
 * Used for "My Teams"
 */
export const getAllTeamsOfStudent = async (enrollmentId) => {
  const q = `
    SELECT DISTINCT
      t.team_id,
      t.department,
      t.leader_enrollment_id,
      t.max_team_size,
      t.created_at,
      t.team_name,
      p.title AS project_title
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.team_id
    LEFT JOIN projects p ON p.project_id = t.team_id
    WHERE tm.enrollment_id = $1
    ORDER BY t.created_at DESC
  `;
  const r = await pool.query(q, [enrollmentId]);
  return r.rows;
};

/* =========================
   TEAM → PROJECTS (SEARCH)
========================= */

/**
 * Get all projects of a team
 * (team_id == project_id design)
 */
export const getProjectsByTeamId = async (teamId) => {
  const q = `
    SELECT
      project_id,
      title,
      status,
      mentor_employee_id,
      created_at
    FROM projects
    WHERE project_id = $1
  `;
  const r = await pool.query(q, [teamId]);
  return r.rows;
};


/* =========================
   REMOVE TEAM MEMBER
========================= */
export const removeTeamMember = async (teamId, enrollmentId) => {
  const q = `
    DELETE FROM team_members
    WHERE team_id = $1
      AND enrollment_id = $2
      AND is_leader = false
  `;
  const r = await pool.query(q, [teamId, enrollmentId]);
  return r.rowCount > 0;
};


/* =========================
   DISBAND TEAM (REPO)
========================= */

export const deleteTeamMembers = async (teamId) => {
  const q = `DELETE FROM team_members WHERE team_id = $1`;
  await pool.query(q, [teamId]);
};

export const deleteTeamInvitations = async (teamId) => {
  const q = `DELETE FROM team_invitations WHERE team_id = $1`;
  await pool.query(q, [teamId]);
};

export const deleteTeam = async (teamId) => {
  const q = `DELETE FROM teams WHERE team_id = $1`;
  await pool.query(q, [teamId]);
};
