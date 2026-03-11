import pool from '../config/db.js';

export const logAdminOverride = async ({
  projectId,
  adminUserKey,
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
    adminUserKey,
    action,
    reason,
    oldStatus,
    newStatus,
  ]);
};
