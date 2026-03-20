import pool from '../config/db.js'; // ← tum already use kar rahe ho
import { logQueryResult } from '../utils/dbInspector.js';
import { generateUniqueUserKey } from '../utils/userKeyGenerator.js';
import { validateAndHashPassword } from '../utils/passwordPolicy.js';
import { parsePagination } from '../utils/pagination.js';
import crypto from 'crypto';

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

const ALLOWED_ROLES = new Set(['STUDENT', 'MENTOR', 'ADMIN']);

const isValidEmail = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const isValidName = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^[A-Za-z .'-]{2,100}$/.test(value.trim());
};

const isValidPhone = (value) => {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  return /^\+?[0-9]{10,15}$/.test(value.trim());
};

const isStrongPassword = (value) => {
  if (!value || typeof value !== 'string') return false;
  if (value.length < 8 || value.length > 128) return false;

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return hasLower && hasUpper && hasDigit && hasSpecial;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

/* =========================
   ADMIN: REGISTER USER
========================= */
export const adminRegisterUserService = async ({ payload, actorUser, actorIp }) => {
  // SECURITY: user_key is generated server-side and client-supplied values are ignored.
  const role = normalizeText(payload?.role).toUpperCase();
  const email = normalizeText(payload?.email).toLowerCase();
  const password = payload?.password;
  const profile = payload?.profile || {};

  if (!role || !email || !password) {
    throw { status: 400, message: 'role, email and password are required' };
  }

  if (!ALLOWED_ROLES.has(role)) {
    throw { status: 400, message: 'Invalid role' };
  }

  if (role === 'ADMIN' && actorUser?.is_super_admin !== true) {
    throw {
      status: 403,
      message: 'Only super admin can create admin users',
    };
  }

  if (!isValidEmail(email)) {
    throw { status: 400, message: 'Invalid email format' };
  }

  if (!isStrongPassword(password)) {
    throw {
      status: 400,
      message: 'Password must be 8+ chars with upper, lower, number and special character'
    };
  }

  const fullName = normalizeText(profile.full_name);
  const department = normalizeText(profile.department);
  const designation = normalizeText(profile.designation);
  const contactNumber = normalizeText(profile.contact_number);
  const yearValue = Number.parseInt(normalizeText(profile.year), 10);
  const division = normalizeText(profile.division);
  const rollNumber = normalizeText(profile.roll_number);

  if (!isValidName(fullName)) {
    throw { status: 400, message: 'Invalid full_name. Use 2-100 alphabetic characters' };
  }

  if (!department) {
    throw { status: 400, message: 'Department is required' };
  }

  if (!isValidPhone(contactNumber)) {
    throw { status: 400, message: 'Invalid contact_number format' };
  }

  if (role === 'STUDENT') {
    if (!Number.isInteger(yearValue) || yearValue < 1 || yearValue > 6) {
      throw { status: 400, message: 'Student year must be an integer between 1 and 6' };
    }

    if (!division || division.length > 10) {
      throw { status: 400, message: 'Student division is required and must be <= 10 chars' };
    }

    if (!rollNumber || rollNumber.length > 40) {
      throw { status: 400, message: 'Student roll_number is required and must be <= 40 chars' };
    }
  }

  if (role === 'MENTOR' || role === 'ADMIN') {
    if (!designation || designation.length > 100) {
      throw {
        status: 400,
        message: 'Designation is required for mentor/admin and must be <= 100 chars'
      };
    }
  }

  const generatedUserKey = await generateUniqueUserKey(role, pool, department, yearValue);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationTokenHash = crypto
    .createHash('sha256')
    .update(emailVerificationToken)
    .digest('hex');

  const existingUser = await pool.query(
    'SELECT user_key, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );

  if (existingUser.rowCount > 0) {
    throw { status: 409, message: 'User with same user_key or email already exists' };
  }

  const password_hash = await validateAndHashPassword(password);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (role === 'ADMIN') {
      await client.query(
        `
          INSERT INTO admin_system_settings_audit_log (actor_user_key, action_type, section_name, before_data, after_data)
          VALUES ($1, 'create_admin_user_attempt', 'admin_user_registration', NULL, $2::jsonb)
        `,
        [
          actorUser?.user_key || null,
          JSON.stringify({
            target_email: email,
            target_role: role,
            actor_ip: actorIp || null,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    }

    await client.query(
      `
        INSERT INTO users (user_key, role, email, password_hash)
        VALUES ($1, $2, $3, $4)
      `,
      [generatedUserKey, role, email, password_hash]
    );

    await client.query(
      `
        UPDATE users
        SET
          email_verified = FALSE,
          email_verify_token = $2,
          email_verify_token_expires = NOW() + INTERVAL '24 hours'
        WHERE user_key = $1
      `,
      [generatedUserKey, emailVerificationTokenHash]
    );

    // TODO: Send email with verification link: /api/auth/verify-email?token=<plain_token>
    console.log('[SECURITY] Email verification pending for user:', generatedUserKey);

    if (role === 'STUDENT') {
      await client.query(
        `
          INSERT INTO student_profiles (
            enrollment_id,
            full_name,
            student_email,
            department,
            year,
            division,
            roll_number,
            contact_number
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          generatedUserKey,
          fullName,
          email,
          department,
          yearValue,
          division,
          rollNumber,
          contactNumber || null
        ]
      );
    }

    if (role === 'MENTOR') {
      await client.query(
        `
          INSERT INTO mentor_profiles (
            employee_id,
            full_name,
            official_email,
            department,
            designation,
            contact_number
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          generatedUserKey,
          fullName,
          email,
          department,
          designation,
          contactNumber || null
        ]
      );
    }

    if (role === 'ADMIN') {
      await client.query(
        `
          INSERT INTO admin_profiles (
            employee_id,
            full_name,
            official_email,
            department,
            designation,
            contact_number
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          generatedUserKey,
          fullName,
          email,
          department,
          designation,
          contactNumber || null
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    message: 'User registered successfully',
    user_key: generatedUserKey,
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
export const getAllStudentsService = async (page = 1, limit = 10, search = '') => {
  const { page: safePage, limit: safeLimit, offset } = parsePagination({ page, limit }, { maxLimit: 100 });
  const normalizedSearch = normalizeText(search);
  const searchLike = `%${normalizedSearch}%`;

  const query = `
    SELECT
      u.user_key,
      u.email,
      u.is_active,
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
      AND (
        $3 = ''
        OR u.user_key ILIKE $4
        OR u.email ILIKE $4
        OR COALESCE(sp.full_name, '') ILIKE $4
        OR COALESCE(sp.department, '') ILIKE $4
        OR COALESCE(sp.roll_number, '') ILIKE $4
      )
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
    WHERE u.role = 'STUDENT'
      AND (
        $1 = ''
        OR u.user_key ILIKE $2
        OR u.email ILIKE $2
        OR COALESCE(sp.full_name, '') ILIKE $2
        OR COALESCE(sp.department, '') ILIKE $2
        OR COALESCE(sp.roll_number, '') ILIKE $2
      )
  `;

  try {
    const result = await pool.query(query, [safeLimit, offset, normalizedSearch, searchLike]);
    const countResult = await pool.query(countQuery, [normalizedSearch, searchLike]);

    const responseData = {
      students: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: safePage,
      limit: safeLimit
    };

    // Log query result for debugging
    await logQueryResult('getAllStudents', {
      params: { page: safePage, limit: safeLimit, offset },
      rowCount: result.rows.length,
      total: responseData.total
    });

    return responseData;
  } catch (error) {
    console.error('❌ Error in getAllStudentsService:', error);
    await logQueryResult('getAllStudents_error', {
      error: error.message,
      stack: error.stack,
      params: { page: safePage, limit: safeLimit, offset }
    });
    throw error;
  }
};

export const getAllMentorsService = async (page = 1, limit = 10, search = '') => {
  const { page: safePage, limit: safeLimit, offset } = parsePagination({ page, limit }, { maxLimit: 100 });
  const normalizedSearch = normalizeText(search);
  const searchLike = `%${normalizedSearch}%`;

  const query = `
    SELECT
      u.user_key,
      u.email,
      u.is_active,
      u.created_at,
      mp.full_name,
      mp.official_email,
      mp.department,
      mp.designation
    FROM users u
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    WHERE u.role = 'MENTOR'
      AND (
        $3 = ''
        OR u.user_key ILIKE $4
        OR u.email ILIKE $4
        OR COALESCE(mp.full_name, '') ILIKE $4
        OR COALESCE(mp.department, '') ILIKE $4
        OR COALESCE(mp.designation, '') ILIKE $4
      )
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    WHERE u.role = 'MENTOR'
      AND (
        $1 = ''
        OR u.user_key ILIKE $2
        OR u.email ILIKE $2
        OR COALESCE(mp.full_name, '') ILIKE $2
        OR COALESCE(mp.department, '') ILIKE $2
        OR COALESCE(mp.designation, '') ILIKE $2
      )
  `;

  try {
    const result = await pool.query(query, [safeLimit, offset, normalizedSearch, searchLike]);
    const countResult = await pool.query(countQuery, [normalizedSearch, searchLike]);

    const responseData = {
      mentors: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: safePage,
      limit: safeLimit
    };

    // Log query result for debugging
    await logQueryResult('getAllMentors', {
      params: { page: safePage, limit: safeLimit, offset },
      rowCount: result.rows.length,
      total: responseData.total
    });

    return responseData;
  } catch (error) {
    console.error('❌ Error in getAllMentorsService:', error);
    await logQueryResult('getAllMentors_error', {
      error: error.message,
      stack: error.stack,
      params: { page: safePage, limit: safeLimit, offset }
    });
    throw error;
  }
};

/* =========================
   USER MANAGEMENT: GET ALL USERS
========================= */
export const getAllUsersService = async (page = 1, limit = 10, search = '') => {
  const { page: safePage, limit: safeLimit, offset } = parsePagination({ page, limit }, { maxLimit: 100 });
  const normalizedSearch = normalizeText(search);
  const searchLike = `%${normalizedSearch}%`;

  const query = `
    SELECT
      u.user_key,
      u.role,
      u.email,
      u.is_active,
      u.created_at,
      COALESCE(sp.full_name, mp.full_name, ap.full_name) as full_name,
      COALESCE(sp.department, mp.department, ap.department) as department
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    LEFT JOIN admin_profiles ap ON u.user_key = ap.employee_id
    WHERE (
      $3 = ''
      OR u.user_key ILIKE $4
      OR u.email ILIKE $4
      OR u.role ILIKE $4
      OR COALESCE(sp.full_name, mp.full_name, ap.full_name, '') ILIKE $4
      OR COALESCE(sp.department, mp.department, ap.department, '') ILIKE $4
      OR COALESCE(sp.student_email, mp.official_email, ap.official_email, '') ILIKE $4
      OR COALESCE(mp.designation, ap.designation, '') ILIKE $4
      OR COALESCE(sp.roll_number, '') ILIKE $4
    )
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
    LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
    LEFT JOIN admin_profiles ap ON u.user_key = ap.employee_id
    WHERE (
      $1 = ''
      OR u.user_key ILIKE $2
      OR u.email ILIKE $2
      OR u.role ILIKE $2
      OR COALESCE(sp.full_name, mp.full_name, ap.full_name, '') ILIKE $2
      OR COALESCE(sp.department, mp.department, ap.department, '') ILIKE $2
      OR COALESCE(sp.student_email, mp.official_email, ap.official_email, '') ILIKE $2
      OR COALESCE(mp.designation, ap.designation, '') ILIKE $2
      OR COALESCE(sp.roll_number, '') ILIKE $2
    )
  `;

  const result = await pool.query(query, [safeLimit, offset, normalizedSearch, searchLike]);
  const countResult = await pool.query(countQuery, [normalizedSearch, searchLike]);

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].total, 10),
    page: safePage,
    limit: safeLimit
  };
};

/* =========================
   USER MANAGEMENT: USER DETAIL
========================= */
export const getUserDetailService = async (userKey) => {
  const query = `
    SELECT
      u.user_key,
      u.role,
      u.email,
      u.is_active,
      u.created_at,
      sp.full_name AS sp_full_name,
      sp.student_email,
      sp.department AS sp_department,
      sp.year,
      sp.division,
      sp.roll_number,
      sp.contact_number AS sp_contact_number,
      sp.status,
      sp.bio,
      mp.full_name AS mp_full_name,
      mp.official_email,
      mp.department AS mp_department,
      mp.designation AS mp_designation,
      mp.contact_number AS mp_contact_number,
      mp.is_active AS mp_is_active,
      ap.full_name AS ap_full_name,
      ap.official_email AS ap_official_email,
      ap.department AS ap_department,
      ap.designation AS ap_designation,
      ap.contact_number AS ap_contact_number,
      ap.is_active AS ap_is_active
    FROM users u
    LEFT JOIN student_profiles sp ON sp.enrollment_id = u.user_key
    LEFT JOIN mentor_profiles mp ON mp.employee_id = u.user_key
    LEFT JOIN admin_profiles ap ON ap.employee_id = u.user_key
    WHERE u.user_key = $1
    LIMIT 1
  `;

  const { rows, rowCount } = await pool.query(query, [normalizeText(userKey)]);

  if (!rowCount) {
    throw { status: 404, message: 'User not found' };
  }

  const row = rows[0];
  let profile = {};

  if (row.role === 'STUDENT') {
    profile = {
      full_name: row.sp_full_name,
      student_email: row.student_email,
      department: row.sp_department,
      year: row.year,
      division: row.division,
      roll_number: row.roll_number,
      contact_number: row.sp_contact_number,
      status: row.status,
      bio: row.bio
    };
  }

  if (row.role === 'MENTOR') {
    profile = {
      full_name: row.mp_full_name,
      official_email: row.official_email,
      department: row.mp_department,
      designation: row.mp_designation,
      contact_number: row.mp_contact_number,
      profile_is_active: row.mp_is_active
    };
  }

  if (row.role === 'ADMIN') {
    profile = {
      full_name: row.ap_full_name,
      official_email: row.ap_official_email,
      department: row.ap_department,
      designation: row.ap_designation,
      contact_number: row.ap_contact_number,
      profile_is_active: row.ap_is_active
    };
  }

  return {
    user_key: row.user_key,
    role: row.role,
    email: row.email,
    is_active: row.is_active,
    created_at: row.created_at,
    profile
  };
};

/* =========================
   USER MANAGEMENT: UPDATE USER STATUS
========================= */
export const updateUserStatusService = async ({
  actorUserKey,
  targetUserKey,
  isActive
}) => {
  const normalizedTargetUserKey = normalizeText(targetUserKey);

  if (typeof isActive !== 'boolean') {
    throw { status: 400, message: 'is_active must be boolean' };
  }

  if (!normalizedTargetUserKey) {
    throw { status: 400, message: 'user_key is required' };
  }

  if (actorUserKey === normalizedTargetUserKey && isActive === false) {
    throw { status: 400, message: 'You cannot block your own account' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT user_key, role FROM users WHERE user_key = $1 LIMIT 1',
      [normalizedTargetUserKey]
    );

    if (userResult.rowCount === 0) {
      throw { status: 404, message: 'User not found' };
    }

    const targetUser = userResult.rows[0];

    if (targetUser.role === 'ADMIN' && isActive === false) {
      const activeAdminsResult = await client.query(
        "SELECT COUNT(*)::int AS total FROM users WHERE role = 'ADMIN' AND COALESCE(is_active, true) = true"
      );

      if (activeAdminsResult.rows[0].total <= 1) {
        throw { status: 400, message: 'At least one active admin is required' };
      }
    }

    const updatedUser = await client.query(
      `
        UPDATE users
        SET is_active = $1
        WHERE user_key = $2
        RETURNING user_key, role, email, is_active, created_at
      `,
      [isActive, normalizedTargetUserKey]
    );

    if (targetUser.role === 'MENTOR') {
      await client.query(
        'UPDATE mentor_profiles SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
        [isActive, normalizedTargetUserKey]
      );
    }

    if (targetUser.role === 'ADMIN') {
      await client.query(
        'UPDATE admin_profiles SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
        [isActive, normalizedTargetUserKey]
      );
    }

    await client.query('COMMIT');
    return updatedUser.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/* =========================
   USER MANAGEMENT: UPDATE USER PROFILE
========================= */
export const updateUserProfileService = async ({
  targetUserKey,
  payload
}) => {
  const normalizedTargetUserKey = normalizeText(targetUserKey);
  const body = payload || {};

  if (!normalizedTargetUserKey) {
    throw { status: 400, message: 'user_key is required' };
  }

  const hasField = (key) => Object.prototype.hasOwnProperty.call(body, key);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT
          u.user_key,
          u.role,
          u.email,
          sp.enrollment_id AS sp_profile_key,
          sp.full_name AS sp_full_name,
          sp.department AS sp_department,
          sp.year AS sp_year,
          sp.division AS sp_division,
          sp.roll_number AS sp_roll_number,
          sp.contact_number AS sp_contact_number,
          sp.status AS sp_status,
          sp.bio AS sp_bio,
          mp.employee_id AS mp_profile_key,
          mp.full_name AS mp_full_name,
          mp.department AS mp_department,
          mp.designation AS mp_designation,
          mp.contact_number AS mp_contact_number,
          ap.employee_id AS ap_profile_key,
          ap.full_name AS ap_full_name,
          ap.department AS ap_department,
          ap.designation AS ap_designation,
          ap.contact_number AS ap_contact_number
        FROM users u
        LEFT JOIN student_profiles sp ON sp.enrollment_id = u.user_key
        LEFT JOIN mentor_profiles mp ON mp.employee_id = u.user_key
        LEFT JOIN admin_profiles ap ON ap.employee_id = u.user_key
        WHERE u.user_key = $1
        LIMIT 1
      `,
      [normalizedTargetUserKey]
    );

    if (currentResult.rowCount === 0) {
      throw { status: 404, message: 'User not found' };
    }

    const current = currentResult.rows[0];
    let nextEmail = normalizeText(current.email).toLowerCase();

    if (hasField('email')) {
      nextEmail = normalizeText(body.email).toLowerCase();
      if (!isValidEmail(nextEmail)) {
        throw { status: 400, message: 'Invalid email format' };
      }

      const duplicateEmailCheck = await client.query(
        'SELECT user_key FROM users WHERE LOWER(email) = LOWER($1) AND user_key <> $2 LIMIT 1',
        [nextEmail, normalizedTargetUserKey]
      );

      if (duplicateEmailCheck.rowCount > 0) {
        throw { status: 409, message: 'Email already in use by another user' };
      }
    }

    if (current.role === 'STUDENT') {
      const fullName = hasField('full_name')
        ? normalizeText(body.full_name)
        : normalizeText(current.sp_full_name);
      const department = hasField('department')
        ? normalizeText(body.department)
        : normalizeText(current.sp_department);
      const year = hasField('year')
        ? Number.parseInt(normalizeText(body.year), 10)
        : Number.parseInt(current.sp_year, 10);
      const division = hasField('division')
        ? normalizeText(body.division)
        : normalizeText(current.sp_division);
      const rollNumber = hasField('roll_number')
        ? normalizeText(body.roll_number)
        : normalizeText(current.sp_roll_number);
      const contactNumber = hasField('contact_number')
        ? normalizeText(body.contact_number)
        : normalizeText(current.sp_contact_number);
      const status = hasField('status')
        ? normalizeText(body.status)
        : normalizeText(current.sp_status);
      const bio = hasField('bio')
        ? normalizeText(body.bio)
        : normalizeText(current.sp_bio);

      if (!isValidName(fullName)) {
        throw { status: 400, message: 'Invalid full_name. Use 2-100 alphabetic characters' };
      }

      if (!department) {
        throw { status: 400, message: 'Department is required' };
      }

      if (!Number.isInteger(year) || year < 1 || year > 6) {
        throw { status: 400, message: 'Student year must be an integer between 1 and 6' };
      }

      if (!division || division.length > 10) {
        throw { status: 400, message: 'Student division is required and must be <= 10 chars' };
      }

      if (!rollNumber || rollNumber.length > 40) {
        throw { status: 400, message: 'Student roll_number is required and must be <= 40 chars' };
      }

      if (!isValidPhone(contactNumber)) {
        throw { status: 400, message: 'Invalid contact_number format' };
      }

      await client.query(
        'UPDATE users SET email = $1 WHERE user_key = $2',
        [nextEmail, normalizedTargetUserKey]
      );

      const studentUpdateResult = await client.query(
        `
          UPDATE student_profiles
          SET
            full_name = $1,
            student_email = $2,
            department = $3,
            year = $4,
            division = $5,
            roll_number = $6,
            contact_number = $7,
            status = $8,
            bio = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE enrollment_id = $10
          RETURNING enrollment_id
        `,
        [
          fullName,
          nextEmail,
          department,
          year,
          division,
          rollNumber,
          contactNumber || null,
          status || null,
          bio || null,
          normalizedTargetUserKey
        ]
      );

      if (studentUpdateResult.rowCount === 0) {
        await client.query(
          `
            INSERT INTO student_profiles (
              enrollment_id,
              full_name,
              student_email,
              department,
              year,
              division,
              roll_number,
              contact_number,
              status,
              bio
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            normalizedTargetUserKey,
            fullName,
            nextEmail,
            department,
            year,
            division,
            rollNumber,
            contactNumber || null,
            status || null,
            bio || null
          ]
        );
      }
    }

    if (current.role === 'MENTOR') {
      const fullName = hasField('full_name')
        ? normalizeText(body.full_name)
        : normalizeText(current.mp_full_name);
      const department = hasField('department')
        ? normalizeText(body.department)
        : normalizeText(current.mp_department);
      const designation = hasField('designation')
        ? normalizeText(body.designation)
        : normalizeText(current.mp_designation);
      const contactNumber = hasField('contact_number')
        ? normalizeText(body.contact_number)
        : normalizeText(current.mp_contact_number);

      if (!isValidName(fullName)) {
        throw { status: 400, message: 'Invalid full_name. Use 2-100 alphabetic characters' };
      }

      if (!department) {
        throw { status: 400, message: 'Department is required' };
      }

      if (!designation || designation.length > 100) {
        throw {
          status: 400,
          message: 'Designation is required and must be <= 100 chars'
        };
      }

      if (!isValidPhone(contactNumber)) {
        throw { status: 400, message: 'Invalid contact_number format' };
      }

      await client.query(
        'UPDATE users SET email = $1 WHERE user_key = $2',
        [nextEmail, normalizedTargetUserKey]
      );

      const mentorUpdateResult = await client.query(
        `
          UPDATE mentor_profiles
          SET
            full_name = $1,
            official_email = $2,
            department = $3,
            designation = $4,
            contact_number = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = $6
          RETURNING employee_id
        `,
        [
          fullName,
          nextEmail,
          department,
          designation,
          contactNumber || null,
          normalizedTargetUserKey
        ]
      );

      if (mentorUpdateResult.rowCount === 0) {
        await client.query(
          `
            INSERT INTO mentor_profiles (
              employee_id,
              full_name,
              official_email,
              department,
              designation,
              contact_number
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            normalizedTargetUserKey,
            fullName,
            nextEmail,
            department,
            designation,
            contactNumber || null
          ]
        );
      }
    }

    if (current.role === 'ADMIN') {
      const fullName = hasField('full_name')
        ? normalizeText(body.full_name)
        : normalizeText(current.ap_full_name);
      const department = hasField('department')
        ? normalizeText(body.department)
        : normalizeText(current.ap_department);
      const designation = hasField('designation')
        ? normalizeText(body.designation)
        : normalizeText(current.ap_designation);
      const contactNumber = hasField('contact_number')
        ? normalizeText(body.contact_number)
        : normalizeText(current.ap_contact_number);

      if (!isValidName(fullName)) {
        throw { status: 400, message: 'Invalid full_name. Use 2-100 alphabetic characters' };
      }

      if (!department) {
        throw { status: 400, message: 'Department is required' };
      }

      if (!designation || designation.length > 100) {
        throw {
          status: 400,
          message: 'Designation is required and must be <= 100 chars'
        };
      }

      if (!isValidPhone(contactNumber)) {
        throw { status: 400, message: 'Invalid contact_number format' };
      }

      await client.query(
        'UPDATE users SET email = $1 WHERE user_key = $2',
        [nextEmail, normalizedTargetUserKey]
      );

      const adminUpdateResult = await client.query(
        `
          UPDATE admin_profiles
          SET
            full_name = $1,
            official_email = $2,
            department = $3,
            designation = $4,
            contact_number = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = $6
          RETURNING employee_id
        `,
        [
          fullName,
          nextEmail,
          department,
          designation,
          contactNumber || null,
          normalizedTargetUserKey
        ]
      );

      if (adminUpdateResult.rowCount === 0) {
        await client.query(
          `
            INSERT INTO admin_profiles (
              employee_id,
              full_name,
              official_email,
              department,
              designation,
              contact_number
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            normalizedTargetUserKey,
            fullName,
            nextEmail,
            department,
            designation,
            contactNumber || null
          ]
        );
      }
    }

    await client.query('COMMIT');
    return await getUserDetailService(normalizedTargetUserKey);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
