import pool from '../config/db.js';

export const createAuditLog = async ({
  projectId,
  actorUserKey,
  action,
  reason,
  oldStatus,
  newStatus,
}) => {
  const q = `
    INSERT INTO admin_override_logs (
      project_id,
      admin_user_key,
      action,
      reason,
      old_status,
      new_status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  await pool.query(q, [
    projectId,
    actorUserKey,
    action,
    reason,
    oldStatus,
    newStatus,
  ]);
};

export const getAuditLogs = async () => {
  const q = `
    SELECT *
    FROM admin_override_logs
    ORDER BY created_at DESC
  `;
  const r = await pool.query(q);
  return r.rows;
};
