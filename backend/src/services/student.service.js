import pool from "../config/db.js";

// GET profile with bio
export const getStudentProfileService = async (enrollmentId) => {
  const query = `
    SELECT 
      enrollment_id,
      full_name,
      student_email,
      department,
      year,
      division,
      roll_number,
      contact_number,
      status,
      bio,
      created_at,
      updated_at
    FROM student_profiles
    WHERE enrollment_id = $1
  `;

  const { rows } = await pool.query(query, [enrollmentId]);

  if (rows.length === 0) {
    throw { status: 404, message: "Student profile not found" };
  }

  return rows[0];
};

// UPDATE bio
export const updateStudentBioService = async (enrollmentId, bio) => {
  const query = `
    UPDATE student_profiles
    SET bio = $1
    WHERE enrollment_id = $2
    RETURNING enrollment_id, full_name, bio
  `;

  const { rowCount, rows } = await pool.query(query, [bio, enrollmentId]);

  if (rowCount === 0) {
    throw { status: 404, message: "Student profile not found" };
  }

  return rows[0];
};

// GET skills
export const getStudentSkillsService = async (enrollmentId) => {
  const query = `
    SELECT id, skill_name, created_at
    FROM student_skills
    WHERE enrollment_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [enrollmentId]);
  return rows;
};

// ADD skill
export const addStudentSkillService = async (enrollmentId, skill_name) => {
  // Check for duplicates
  const checkQuery = `
    SELECT id FROM student_skills
    WHERE enrollment_id = $1 AND LOWER(skill_name) = LOWER($2)
  `;

  const checkResult = await pool.query(checkQuery, [enrollmentId, skill_name]);

  if (checkResult.rows.length > 0) {
    throw { status: 400, message: "Skill already exists" };
  }

  const query = `
    INSERT INTO student_skills (enrollment_id, skill_name)
    VALUES ($1, $2)
    RETURNING id, skill_name, created_at
  `;

  const { rows } = await pool.query(query, [enrollmentId, skill_name]);
  return rows[0];
};

// DELETE skill
export const deleteStudentSkillService = async (enrollmentId, id) => {
  const query = `
    DELETE FROM student_skills
    WHERE id = $1 AND enrollment_id = $2
    RETURNING id, skill_name
  `;

  const { rowCount, rows } = await pool.query(query, [id, enrollmentId]);

  if (rowCount === 0) {
    throw { status: 404, message: "Skill not found" };
  }

  return rows[0];
};
