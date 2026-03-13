import pool from '../config/db.js';

let mentorProfileColumns = null;

const getMentorProfileColumns = async () => {
  if (mentorProfileColumns) {
    return mentorProfileColumns;
  }

  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'mentor_profiles'
  `;

  const { rows } = await pool.query(query);
  mentorProfileColumns = new Set(rows.map((row) => row.column_name));
  return mentorProfileColumns;
};

const getMentorAssignmentSelectFields = async (alias = 'mp') => {
  const columns = await getMentorProfileColumns();

  return {
    availableForAssignment: columns.has('available_for_assignment')
      ? `${alias}.available_for_assignment`
      : 'TRUE AS available_for_assignment',
    maxActiveProjects: columns.has('max_active_projects')
      ? `${alias}.max_active_projects`
      : '5 AS max_active_projects',
    assignmentPriority: columns.has('assignment_priority')
      ? `${alias}.assignment_priority`
      : '100 AS assignment_priority',
    lastAssignedAt: columns.has('last_assigned_at')
      ? `${alias}.last_assigned_at`
      : 'NULL::timestamp AS last_assigned_at',
  };
};

const getMentorProfileRecord = async (employeeId) => {
  const assignmentFields = await getMentorAssignmentSelectFields('mp');

  const mentorQuery = `
    SELECT 
      mp.employee_id,
      mp.full_name,
      mp.official_email,
      mp.department,
      mp.designation,
      mp.contact_number,
      mp.is_active,
      mp.primary_track,
      ${assignmentFields.availableForAssignment},
      ${assignmentFields.maxActiveProjects},
      ${assignmentFields.assignmentPriority},
      ${assignmentFields.lastAssignedAt},
      COALESCE(mp.secondary_tracks, '[]'::jsonb) AS secondary_tracks,
      mp.created_at,
      mp.updated_at
    FROM mentor_profiles mp
    WHERE mp.employee_id = $1
  `;

  const mentorResult = await pool.query(mentorQuery, [employeeId]);

  if (mentorResult.rowCount === 0) {
    throw { status: 404, message: 'Mentor profile not found' };
  }

  return mentorResult.rows[0];
};

/* =========================
   PROFILE
========================= */
export const getMentorProfileService = async (employeeId) => {
  const profile = await getMentorProfileRecord(employeeId);

  const skills = await getMentorSkillsService(employeeId);

  return {
    ...profile,
    skills,
  };
};

export const getMentorProfileForStudentService = async (studentEnrollmentId, mentorEmployeeId) => {
  if (!studentEnrollmentId || !mentorEmployeeId) {
    throw { status: 400, message: 'studentEnrollmentId and mentorEmployeeId are required' };
  }

  const accessQuery = `
    SELECT 1
    FROM projects p
    JOIN team_members tm
      ON tm.team_id = p.project_id
    WHERE tm.enrollment_id = $1
      AND p.mentor_employee_id = $2
    LIMIT 1
  `;

  const accessResult = await pool.query(accessQuery, [studentEnrollmentId, mentorEmployeeId]);
  if (accessResult.rowCount === 0) {
    throw { status: 403, message: 'You are not authorized to view this mentor profile' };
  }

  const profile = await getMentorProfileRecord(mentorEmployeeId);
  const skills = await getMentorSkillsService(mentorEmployeeId);

  return {
    ...profile,
    skills,
  };
};

export const updateMentorProfileService = async (employeeId, payload) => {
  const columns = await getMentorProfileColumns();
  const {
    department,
    designation,
    contact_number,
    primary_track,
    secondary_tracks,
    available_for_assignment,
    max_active_projects,
    assignment_priority,
  } = payload;

  const availableForAssignmentValue = columns.has('available_for_assignment')
    ? available_for_assignment ?? null
    : null;
  const maxActiveProjectsValue = columns.has('max_active_projects')
    ? max_active_projects ?? null
    : null;
  const assignmentPriorityValue = columns.has('assignment_priority')
    ? assignment_priority ?? null
    : null;
  const availableForAssignmentSet = columns.has('available_for_assignment')
    ? 'available_for_assignment = COALESCE($6, available_for_assignment),'
    : '';
  const maxActiveProjectsSet = columns.has('max_active_projects')
    ? 'max_active_projects = COALESCE($7, max_active_projects),'
    : '';
  const assignmentPrioritySet = columns.has('assignment_priority')
    ? 'assignment_priority = COALESCE($8, assignment_priority),'
    : '';
  const assignmentFields = await getMentorAssignmentSelectFields();

  const query = `
    UPDATE mentor_profiles
    SET
      department = COALESCE($1, department),
      designation = COALESCE($2, designation),
      contact_number = COALESCE($3, contact_number),
      primary_track = COALESCE($4, primary_track),
      secondary_tracks = COALESCE($5::jsonb, secondary_tracks),
      ${availableForAssignmentSet}
      ${maxActiveProjectsSet}
      ${assignmentPrioritySet}
      updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = $9
    RETURNING
      employee_id,
      full_name,
      official_email,
      department,
      designation,
      contact_number,
      is_active,
      primary_track,
      ${assignmentFields.availableForAssignment},
      ${assignmentFields.maxActiveProjects},
      ${assignmentFields.assignmentPriority},
      ${assignmentFields.lastAssignedAt},
      COALESCE(secondary_tracks, '[]'::jsonb) AS secondary_tracks,
      created_at,
      updated_at
  `;

  const safeSecondaryTracks =
    secondary_tracks === undefined ? null : JSON.stringify(secondary_tracks);

  const { rows, rowCount } = await pool.query(query, [
    department ?? null,
    designation ?? null,
    contact_number ?? null,
    primary_track ?? null,
    safeSecondaryTracks,
    availableForAssignmentValue,
    maxActiveProjectsValue,
    assignmentPriorityValue,
    employeeId,
  ]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Mentor profile not found' };
  }

  return rows[0];
};

/* =========================
   SKILLS
========================= */
export const getMentorSkillsService = async (employeeId) => {
  const query = `
    SELECT
      id,
      mentor_id,
      tech_stack,
      track,
      skill_type,
      proficiency_level,
      created_at
    FROM mentor_skills
    WHERE mentor_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query, [employeeId]);
  return rows;
};

export const addMentorSkillService = async (
  employeeId,
  tech_stack,
  track,
  skill_type = 'CUSTOM',
  proficiency_level = 'INTERMEDIATE'
) => {
  if (!tech_stack || !track) {
    throw { status: 400, message: 'tech_stack and track are required' };
  }

  const normalizedTechStack = tech_stack.trim();
  const normalizedTrack = track.trim();

  const duplicateCheckQuery = `
    SELECT id
    FROM mentor_skills
    WHERE mentor_id = $1
      AND LOWER(TRIM(tech_stack)) = LOWER(TRIM($2))
      AND LOWER(TRIM(track)) = LOWER(TRIM($3))
    LIMIT 1
  `;

  const { rowCount: duplicateCount } = await pool.query(duplicateCheckQuery, [
    employeeId,
    normalizedTechStack,
    normalizedTrack,
  ]);

  if (duplicateCount > 0) {
    throw {
      status: 409,
      message: 'This tech stack is already added for the selected track.',
    };
  }

  const query = `
    INSERT INTO mentor_skills (
      mentor_id,
      tech_stack,
      track,
      skill_type,
      proficiency_level
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      mentor_id,
      tech_stack,
      track,
      skill_type,
      proficiency_level,
      created_at
  `;

  const { rows } = await pool.query(query, [
    employeeId,
    normalizedTechStack,
    normalizedTrack,
    skill_type,
    proficiency_level,
  ]);

  return rows[0];
};

export const updateMentorSkillService = async (
  employeeId,
  id,
  payload
) => {
  const { tech_stack, track, skill_type, proficiency_level } = payload;

  const query = `
    UPDATE mentor_skills
    SET
      tech_stack = COALESCE($1, tech_stack),
      track = COALESCE($2, track),
      skill_type = COALESCE($3, skill_type),
      proficiency_level = COALESCE($4, proficiency_level)
    WHERE id = $5 AND mentor_id = $6
    RETURNING
      id,
      mentor_id,
      tech_stack,
      track,
      skill_type,
      proficiency_level,
      created_at
  `;

  const { rowCount, rows } = await pool.query(query, [
    tech_stack ?? null,
    track ?? null,
    skill_type ?? null,
    proficiency_level ?? null,
    id,
    employeeId,
  ]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Skill not found' };
  }

  return rows[0];
};

export const deleteMentorSkillService = async (employeeId, id) => {
  const query = `
    DELETE FROM mentor_skills
    WHERE id = $1 AND mentor_id = $2
    RETURNING id, mentor_id, tech_stack, track, skill_type, proficiency_level
  `;

  const { rowCount, rows } = await pool.query(query, [id, employeeId]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Skill not found' };
  }

  return rows[0];
};

/* =========================
   ADMIN: ACTIVE MENTORS
========================= */
export const getActiveMentorsService = async () => {
  const assignmentFields = await getMentorAssignmentSelectFields('mp');

  const query = `
    SELECT
      mp.employee_id,
      mp.full_name,
      mp.official_email,
      mp.department,
      mp.designation,
      mp.contact_number,
      mp.is_active,
      mp.primary_track,
      ${assignmentFields.availableForAssignment},
      ${assignmentFields.maxActiveProjects},
      ${assignmentFields.assignmentPriority},
      ${assignmentFields.lastAssignedAt},
      COALESCE(mp.secondary_tracks, '[]'::jsonb) AS secondary_tracks,
      mp.created_at,
      COUNT(DISTINCT p.project_id) as assigned_projects,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ms.id,
            'tech_stack', ms.tech_stack,
            'track', ms.track,
            'skill_type', ms.skill_type,
            'proficiency_level', ms.proficiency_level
          )
        ) FILTER (WHERE ms.id IS NOT NULL),
        '[]'::json
      ) AS skills
    FROM mentor_profiles mp
    LEFT JOIN projects p
      ON mp.employee_id = p.mentor_employee_id
      AND p.status IN ('ASSIGNED_TO_MENTOR', 'APPROVED', 'ACTIVE', 'COMPLETED')
    LEFT JOIN mentor_skills ms
      ON mp.employee_id = ms.mentor_id
    WHERE mp.is_active = true
    GROUP BY mp.employee_id
    ORDER BY mp.full_name ASC
  `;

  const { rows } = await pool.query(query);
  return rows.map((row) => ({
    ...row,
    assigned_projects: Number(row.assigned_projects || 0),
  }));
};
