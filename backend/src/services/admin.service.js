import pool from '../config/db.js'; // ← tum already use kar rahe ho
import { logQueryResult } from '../utils/dbInspector.js';

// ADMIN PROFILE
export const getAdminProfileService = async (employeeId) => {
  const query = `
    SELECT
      employee_id,
      full_name,
      official_email,
      department,
      designation,
      contact_number,
      is_active,
      created_at,
      updated_at
    FROM admin_profiles
    WHERE employee_id = $1
  `;

  const result = await pool.query(query, [employeeId]);

  if (result.rowCount === 0) {
    throw { status: 404, message: 'Admin profile not found' };
  }

  return result.rows[0];
};

// ADMIN SKILLS – GET
export const getAdminSkillsService = async (employeeId) => {
  const query = `
    SELECT id, skill_name, skill_type
    FROM admin_skills
    WHERE employee_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [employeeId]);
  return rows;
};

// ADMIN SKILLS – ADD
export const addAdminSkillService = async (
  employeeId,
  skill_name,
  skill_type = 'CUSTOM'
) => {
  const query = `
    INSERT INTO admin_skills (employee_id, skill_name, skill_type)
    VALUES ($1, $2, $3)
    RETURNING id, skill_name, skill_type
  `;

  const { rows } = await pool.query(query, [
    employeeId,
    skill_name,
    skill_type
  ]);

  return rows[0];
};

// ADMIN SKILLS – UPDATE
export const updateAdminSkillService = async (
  employeeId,
  id,
  skill_name
) => {
  const query = `
    UPDATE admin_skills
    SET skill_name = $1
    WHERE id = $2 AND employee_id = $3
    RETURNING id, skill_name, skill_type
  `;

  const { rowCount, rows } = await pool.query(query, [
    skill_name,
    id,
    employeeId
  ]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Skill not found' };
  }

  return rows[0];
};
// UPDATE ADMIN PROFILE
export const updateAdminProfileService = async (
  employeeId,
  full_name,
  department,
  designation,
  contact_number
) => {
  const query = `
    UPDATE admin_profiles
    SET
      full_name = $1,
      department = $2,
      designation = $3,
      contact_number = $4,
      updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = $5
    RETURNING
      employee_id,
      full_name,
      official_email,
      department,
      designation,
      contact_number,
      is_active,
      updated_at
  `;

  const { rowCount, rows } = await pool.query(query, [
    full_name,
    department,
    designation,
    contact_number,
    employeeId
  ]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Admin profile not found' };
  }

  return rows[0];
};

// DELETE ADMIN SKILL
export const deleteAdminSkillService = async (employeeId, id) => {
  const query = `
    DELETE FROM admin_skills
    WHERE id = $1 AND employee_id = $2
  `;

  const { rowCount } = await pool.query(query, [id, employeeId]);

  if (rowCount === 0) {
    throw { status: 404, message: 'Skill not found' };
  }
};

import bcrypt from 'bcryptjs';

import { getAdminProfileByEmployeeId } from '../repositories/admin.repo.js';
import {
  insertUser,
  insertStudentProfile,
  insertMentorProfile,
  insertAdminProfile
} from '../repositories/admin.repo.js';

/* =========================
   ADMIN: REGISTER USER
========================= */
export const adminRegisterUserService = async (payload) => {
  const {
    user_key,
    role,
    email,
    password,
    profile
  } = payload;

  if (!user_key || !role || !email || !password) {
    throw new Error('Missing required fields');
  }

  const password_hash = await bcrypt.hash(password, 10);

  /* 1️⃣ USERS TABLE */
  await insertUser({
    user_key,
    role,
    email,
    password_hash
  });

  /* 2️⃣ ROLE PROFILES */
  if (role === 'STUDENT') {
    await insertStudentProfile({
      enrollment_id: user_key,
      student_email: email,
      ...profile
    });
  }

  if (role === 'MENTOR') {
    await insertMentorProfile({
      employee_id: user_key,
      official_email: email,
      ...profile
    });
  }

  if (role === 'ADMIN') {
    await insertAdminProfile({
      employee_id: user_key,
      official_email: email,
      ...profile
    });
  }

  return {
    message: 'User registered successfully',
    user_key,
    role
  };
};

/* =========================
   USER MANAGEMENT: GET STATISTICS
========================= */
export const getUserStatisticsService = async () => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'MENTOR') as total_mentors,
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') as total_admins,
      (SELECT COUNT(*) FROM users) as total_users
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

/* =========================
   USER MANAGEMENT: GET ALL STUDENTS
========================= */
export const getAllStudentsService = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      u.user_key,
      u.email,
      u.created_at,
      sp.full_name,
      sp.student_email,
      sp.department,
      sp.year,
      sp.division,
      sp.roll_number
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
    WHERE u.role = 'STUDENT'
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'STUDENT'`;

  try {
    const result = await pool.query(query, [limit, offset]);
    const countResult = await pool.query(countQuery);

    const responseData = {
      students: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit
    };

    // Log query result for debugging
    await logQueryResult('getAllStudents', {
      params: { page, limit, offset },
      rowCount: result.rows.length,
      total: responseData.total
    });

    return responseData;
  } catch (error) {
    console.error('❌ Error in getAllStudentsService:', error);
    await logQueryResult('getAllStudents_error', {
      error: error.message,
      stack: error.stack,
      params: { page, limit, offset }
    });
    throw error;
  }
};

/* =========================
   USER MANAGEMENT: GET ALL MENTORS
========================= */
export const getAllMentorsService = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      u.user_key,
      u.email,
      u.created_at,
      mp.full_name,
      mp.official_email,
      mp.department,
      mp.designation
    FROM users u
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    WHERE u.role = 'MENTOR'
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'MENTOR'`;

  try {
    const result = await pool.query(query, [limit, offset]);
    const countResult = await pool.query(countQuery);

    const responseData = {
      mentors: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit
    };

    // Log query result for debugging
    await logQueryResult('getAllMentors', {
      params: { page, limit, offset },
      rowCount: result.rows.length,
      total: responseData.total
    });

    return responseData;
  } catch (error) {
    console.error('❌ Error in getAllMentorsService:', error);
    await logQueryResult('getAllMentors_error', {
      error: error.message,
      stack: error.stack,
      params: { page, limit, offset }
    });
    throw error;
  }
};

/* =========================
   USER MANAGEMENT: GET ALL USERS
========================= */
export const getAllUsersService = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      u.user_key,
      u.role,
      u.email,
      u.created_at,
      COALESCE(sp.full_name, mp.full_name, ap.full_name) as full_name,
      COALESCE(sp.department, mp.department, ap.department) as department
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    LEFT JOIN admin_profiles ap ON u.user_key = ap.employee_id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `SELECT COUNT(*) as total FROM users`;

  const result = await pool.query(query, [limit, offset]);
  const countResult = await pool.query(countQuery);

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].total, 10),
    page,
    limit
  };
};
