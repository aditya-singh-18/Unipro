import pool from '../config/db.js';

export const getMentorProfileByEmployeeId = async (employeeId) => {
  const q = `
    SELECT
      mp.employee_id,
      mp.full_name,
      mp.official_email,
      mp.department,
      mp.designation,
      mp.bio,
      ms.skill
    FROM mentor_profiles mp
    LEFT JOIN mentor_skills ms
      ON mp.employee_id = ms.employee_id
    WHERE mp.employee_id = $1
  `;

  const r = await pool.query(q, [employeeId]);
  return r.rows;
};
