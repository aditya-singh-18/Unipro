import { findProjectById } from '../repositories/project.repo.js';
import { logAdminOverride } from '../repositories/adminOverride.repo.js';
import pool from '../config/db.js';

export const adminOverrideService = async ({
  projectId,
  action,
  reason,
  mentorEmployeeId,
  adminUserKey,
}) => {
  if (!projectId || !action || !reason) {
    throw new Error('projectId, action and reason are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const oldStatus = project.status;
  let newStatus = oldStatus;

  // 🔥 OVERRIDE ACTIONS
  switch (action) {
    case 'FORCE_APPROVE':
      newStatus = 'APPROVED';
      await pool.query(
        `UPDATE projects SET status='APPROVED', approved_at=CURRENT_TIMESTAMP WHERE project_id=$1`,
        [projectId]
      );
      break;

    case 'FORCE_ACTIVATE':
      newStatus = 'ACTIVE';
      await pool.query(
        `UPDATE projects SET status='ACTIVE' WHERE project_id=$1`,
        [projectId]
      );
      break;

    case 'FORCE_REJECT':
      newStatus = 'REJECTED';
      await pool.query(
        `UPDATE projects SET status='REJECTED' WHERE project_id=$1`,
        [projectId]
      );
      break;

    case 'CHANGE_MENTOR':
      if (!mentorEmployeeId) {
        throw new Error('mentorEmployeeId required for CHANGE_MENTOR');
      }
      await pool.query(
        `UPDATE projects SET mentor_employee_id=$2 WHERE project_id=$1`,
        [projectId, mentorEmployeeId]
      );
      break;

    default:
      throw new Error('Invalid override action');
  }

  // 🧾 LOG EVERYTHING
  await logAdminOverride({
    projectId,
    adminUserKey,
    action,
    reason,
    oldStatus,
    newStatus,
  });

  return {
    project_id: projectId,
    old_status: oldStatus,
    new_status: newStatus,
    action,
  };
};
