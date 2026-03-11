import pool from '../config/db.js';

export const generateTeamId = async (department) => {
  // 1. Get next number from DB sequence
  const result = await pool.query(
    `SELECT nextval('team_seq') AS seq`
  );

  const seqNumber = result.rows[0].seq; // e.g. 1, 2, 15

  // 2. Zero padding (6 digits)
  const paddedNumber = String(seqNumber).padStart(6, '0');

  // 3. Combine department + padded number
  // CSE + 000001 => CSE000001
  return `${department}${paddedNumber}`;
};
