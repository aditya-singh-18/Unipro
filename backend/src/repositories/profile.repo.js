import pool from '../config/db.js';

/* =========================
   GET PROFILE BY ROLE
========================= */
export const getProfileByRole = async (userKey, role) => {
  let query;

  if (role === 'STUDENT') {
    query = `
      SELECT *
      FROM student_profiles
      WHERE enrollment_id = $1
    `;
  } else if (role === 'MENTOR') {
    query = `
      SELECT *
      FROM mentor_profiles
      WHERE employee_id = $1
    `;
  } else if (role === 'ADMIN') {
    query = `
      SELECT *
      FROM admin_profiles
      WHERE employee_id = $1
    `;
  } else {
    throw new Error('Invalid role');
  }

  const { rows } = await pool.query(query, [userKey]);
  return rows[0];
};

/* =========================
   GET STUDENT SOCIAL LINKS
========================= */
export const getStudentSocialLinks = async (enrollmentId) => {
  const q = `
    SELECT platform, link
    FROM student_social_links
    WHERE enrollment_id = $1
    ORDER BY created_at ASC
  `;

  const { rows } = await pool.query(q, [enrollmentId]);
  return rows;
};

/* =========================
   UPDATE STUDENT SOCIAL LINKS
   (DELETE + INSERT strategy)
========================= */
export const updateStudentSocialLinks = async (enrollmentId, socialLinks) => {
  for (const { platform, link } of socialLinks) {
    await pool.query(
      `
      INSERT INTO student_social_links (enrollment_id, platform, link)
      VALUES ($1, $2, $3)
      ON CONFLICT (enrollment_id, platform)
      DO UPDATE SET
        link = EXCLUDED.link
      `,
      [enrollmentId, platform, link]
    );
  }
};


/* =========================
   UPDATE PROFILE BY ROLE
   (MENTOR / ADMIN ONLY)
========================= */
export const updateProfileByRole = async (userKey, role, data) => {
  let query;
  let values;

  if (role === 'MENTOR') {
    query = `
      UPDATE mentor_profiles
      SET
        full_name = $2,
        expertise = $3,
        phone = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
      RETURNING *
    `;
    values = [userKey, data.full_name, data.expertise, data.phone];
  }

  if (role === 'ADMIN') {
    query = `
      UPDATE admin_profiles
      SET
        full_name = $2,
        phone = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
      RETURNING *
    `;
    values = [userKey, data.full_name, data.phone];
  }

  if (!query) {
    throw new Error('Profile update not allowed for this role');
  }

  const { rows } = await pool.query(query, values);
  return rows[0];
};
/* =========================
   DELETE STUDENT SOCIAL LINK
   (HARD DELETE – DB compatible)
========================= */
export const deleteStudentSocialLink = async (enrollmentId, platform) => {
  const q = `
    DELETE FROM student_social_links
    WHERE enrollment_id = $1
      AND platform = $2
  `;
  await pool.query(q, [enrollmentId, platform]);
};


export const softDeleteSocialLink = async (enrollmentId, platform) => {
  const q = `
    UPDATE student_social_links
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP
    WHERE enrollment_id = $1
      AND platform = $2
      AND is_deleted = false
  `;
  await pool.query(q, [enrollmentId, platform]);
};

export const undoDeleteSocialLink = async (enrollmentId, platform) => {
  const q = `
    UPDATE student_social_links
    SET is_deleted = false,
        deleted_at = NULL
    WHERE enrollment_id = $1
      AND platform = $2
      AND is_deleted = true
      AND deleted_at >= NOW() - INTERVAL '10 seconds'
  `;
  const r = await pool.query(q, [enrollmentId, platform]);
  return r.rowCount > 0;
};
