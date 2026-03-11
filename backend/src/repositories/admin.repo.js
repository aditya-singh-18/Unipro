import pool from '../config/db.js';

/* =========================
   GET ADMIN PROFILE
========================= */
export const getAdminProfileByEmployeeId = async (employeeId) => {
  const q = `
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

  const { rows } = await pool.query(q, [employeeId]);
  return rows[0];
};

/* =========================
   INSERT USER (COMMON)
========================= */
export const insertUser = async ({
  user_key,
  role,
  email,
  password_hash
}) => {
  const q = `
    INSERT INTO users (
      user_key,
      role,
      email,
      password_hash
    )
    VALUES ($1, $2, $3, $4)
  `;

  await pool.query(q, [
    user_key,
    role,
    email,
    password_hash
  ]);
};

/* =========================
   INSERT STUDENT PROFILE
========================= */
export const insertStudentProfile = async ({
  enrollment_id,
  full_name,
  student_email,
  department,
  year,
  division,
  roll_number
}) => {
  const q = `
    INSERT INTO student_profiles (
      enrollment_id,
      full_name,
      student_email,
      department,
      year,
      division,
      roll_number
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  await pool.query(q, [
    enrollment_id,
    full_name,
    student_email,
    department,
    year,
    division,
    roll_number
  ]);
};

/* =========================
   INSERT MENTOR PROFILE
========================= */
export const insertMentorProfile = async ({
  employee_id,
  full_name,
  official_email,
  department,
  designation
}) => {
  const q = `
    INSERT INTO mentor_profiles (
      employee_id,
      full_name,
      official_email,
      department,
      designation
    )
    VALUES ($1, $2, $3, $4, $5)
  `;

  await pool.query(q, [
    employee_id,
    full_name,
    official_email,
    department,
    designation
  ]);
};
export const insertAdminProfile = async ({
  employee_id,
  full_name,
  official_email,
  department,
  designation
}) => {
  const q = `
    INSERT INTO admin_profiles (
      employee_id,
      full_name,
      official_email,
      department,
      designation
    )
    VALUES ($1, $2, $3, $4, $5)
  `;

  await pool.query(q, [
    employee_id,
    full_name,
    official_email,
    department,
    designation
  ]);
};
