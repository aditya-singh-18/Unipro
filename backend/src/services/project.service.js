import pool from '../config/db.js';
import {
  findProjectById,
  insertProject,
  assignMentorToProject,
  updateProjectStatusWithFeedback,
  insertRejectionHistory,
  markAsResubmitted,
  approveProjectByMentor,
  revokeMentorApproval,
  getPendingProjects,
  getProjectsAssignedToMentor,
  getRejectedProjectsFromHistory,
  revokeRejectedProjectDecision,
  resubmitProject,
  editProjectBeforeApproval,
  activateProject,
} from '../repositories/project.repo.js';

import { findTeamById, isTeamLeader } from '../repositories/team.repo.js';

import { getProjectsOfStudent } from '../repositories/project.repo.js';
import { findProjectDetailById } from '../repositories/project.repo.js';
import {
  getTeamMembers,
  isMemberExists,
} from '../repositories/team.repo.js';
import { findUserByIdentifier, findUserByEnrollmentId } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';



/* =========================
   CREATE PROJECT (STUDENT)
========================= */
export const createProjectService = async ({
  teamId,
  title,
  description,
  track,
  techStack,
  githubRepoUrl,
  requesterEnrollmentId,
}) => {
  // 🔒 BASIC VALIDATION (UPDATED)
  if (!teamId || !title || !description || !track) {
    throw new Error(
      'teamId, title, description and track are required'
    );
  }

  // 🔒 TEAM MUST EXIST
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 ONLY TEAM LEADER CAN CREATE PROJECT
  const leader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can create project');
  }

  // 🔒 ONLY ONE PROJECT PER TEAM
  const existingProject = await findProjectById(teamId);
  if (existingProject) {
    throw new Error('Project already submitted for this team');
  }

  // ✅ CREATE PROJECT
  await insertProject({
    projectId: teamId,
    title,
    description,
    track,        // ✅ now guaranteed non-null
    techStack,
    githubRepoUrl,
  });

  // 🔔 Notify all team members
  const members = await getTeamMembers(teamId);
  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user && user.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title: '🚀 Project Created',
        message: `Project "${title}" has been submitted for review`,
      });
    }
  }

  return {
    project_id: teamId,
    status: 'PENDING',
  };
};


/* =========================
   STUDENT: PROJECT DETAIL
========================= */
export const getProjectDetailService = async ({
  projectId,
  enrollmentId,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const project = await findProjectDetailById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // 🔒 SECURITY: student must be part of this team
  const isMember = await isMemberExists(projectId, enrollmentId);
  if (!isMember) {
    throw new Error('You are not authorized to view this project');
  }

  const team = await findTeamById(projectId);
  const members = await getTeamMembers(projectId);

  return {
    project,
    team: {
      team_id: team.team_id,
      team_name: team.team_name,
      department: team.department,
      leader_enrollment_id: team.leader_enrollment_id,
      members,
    },
  };
};

/* =========================
   ADMIN: VIEW PENDING PROJECTS
========================= */
export const getPendingProjectsService = async () => {
  return await getPendingProjects();
};

/* =========================
   ADMIN: ASSIGN MENTOR
========================= */
export const adminAssignMentorService = async ({
  projectId,
  mentorEmployeeId,
}) => {
  if (!projectId || !mentorEmployeeId) {
    throw new Error('projectId and mentorEmployeeId are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'PENDING') {
    throw new Error(
      `Mentor cannot be assigned in status ${project.status}`
    );
  }

  await assignMentorToProject({
    projectId,
    mentorEmployeeId,
  });

  // 🔔 Notify team members about mentor assignment
  const members = await getTeamMembers(projectId);
  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user && user.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title: '👨‍🏫 Mentor Assigned',
        message: `Your project has been assigned to a mentor for review`,
      });
    }
  }

  // 🔔 Notify the mentor
  const mentor = await findUserByIdentifier(mentorEmployeeId);
  if (mentor) {
    await pushNotification({
      userKey: mentor.user_key,
      role: 'mentor',
      title: '📝 New Project Assigned',
      message: `You have been assigned a new project to review`,
    });
  }

  return {
    project_id: projectId,
    mentor_employee_id: mentorEmployeeId,
    status: 'ASSIGNED_TO_MENTOR',
  };
};

/* =========================
   MENTOR: VIEW ASSIGNED PROJECTS
========================= */
export const getMentorAssignedProjectsService = async (mentorEmployeeId) => {
  if (!mentorEmployeeId) {
    throw new Error('mentorEmployeeId is required');
  }

  // Assigned flow only: ASSIGNED_TO_MENTOR, RESUBMITTED, APPROVED
  return await getProjectsAssignedToMentor(mentorEmployeeId);
};

/* =========================
   MENTOR: REJECTED PROJECT HISTORY
========================= */
export const getMentorRejectedProjectsHistoryService = async (mentorEmployeeId) => {
  if (!mentorEmployeeId) {
    throw new Error('mentorEmployeeId is required');
  }

  return await getRejectedProjectsFromHistory(mentorEmployeeId);
};

/* =========================
   MENTOR: REVOKE REJECTION DECISION
========================= */
export const revokeRejectedProjectDecisionService = async ({
  projectId,
  mentorEmployeeId,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const updated = await revokeRejectedProjectDecision({
    projectId,
    mentorId: mentorEmployeeId,
  });

  if (!updated) {
    throw new Error('Rejection revoke not allowed for this project');
  }

  return updated;
};

/* =========================
   HELPER: 24 HOUR CHECK
========================= */
const isWithin24Hours = (approvedAt) => {
  if (!approvedAt) return true;

  const approvedTime = new Date(approvedAt).getTime();
  return Date.now() - approvedTime < 24 * 60 * 60 * 1000;
};

/* =========================
   MENTOR: APPROVE / REJECT
========================= */
export const mentorReviewProjectService = async ({
  projectId,
  action, // APPROVE | REJECT | REVOKE
  mentorFeedback,
  mentorEmployeeId,
}) => {
  if (!projectId || !action) {
    throw new Error('projectId and action are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.mentor_employee_id !== mentorEmployeeId) {
    throw new Error('Not authorized to review this project');
  }

  const allowedStatuses = ['ASSIGNED_TO_MENTOR', 'RESUBMITTED', 'APPROVED'];
  if (!allowedStatuses.includes(project.status)) {
    throw new Error(
      `Project cannot be reviewed in status ${project.status}`
    );
  }

  // ⏳ 24h window enforcement
  if (
    project.status === 'APPROVED' &&
    !isWithin24Hours(project.approved_at)
  ) {
    throw new Error(
      '24-hour approval window expired. Contact admin.'
    );
  }

  // 🔄 REVOKE (within 24h of approval)
  if (action === 'REVOKE') {
    if (project.status !== 'APPROVED') {
      throw new Error('Only approved projects can be revoked');
    }

    if (!isWithin24Hours(project.approved_at)) {
      throw new Error('24-hour approval window expired. Contact admin.');
    }

    await revokeMentorApproval(projectId);

    // 🔔 Notify team members about revocation
    const members = await getTeamMembers(projectId);
    for (const member of members) {
      const user = await findUserByEnrollmentId(member.enrollment_id);
      if (user && user.user_key) {
        await pushNotification({
          userKey: user.user_key,
          role: 'student',
          title: '⚠️ Approval Revoked',
          message: `Your project approval has been revoked and is under review again.`,
        });
      }
    }

    return {
      project_id: projectId,
      status: 'ASSIGNED_TO_MENTOR',
      message: 'Approval revoked; project returned to review',
    };
  }

  // ❌ REJECT
  if (action === 'REJECT') {
    if (!mentorFeedback) {
      throw new Error('mentorFeedback is required for rejection');
    }

    // Save to rejection history table
    await insertRejectionHistory({
      projectId,
      mentorId: mentorEmployeeId,
      rejectionReason: mentorFeedback, // Using feedback as reason
      mentorFeedback,
    });

    // Update project status
    await updateProjectStatusWithFeedback({
      projectId,
      status: 'REJECTED',
      mentorFeedback,
    });

    // 🔔 Notify team members about rejection
    const members = await getTeamMembers(projectId);
    for (const member of members) {
      const user = await findUserByEnrollmentId(member.enrollment_id);
      if (user && user.user_key) {
        await pushNotification({
          userKey: user.user_key,
          role: 'student',
          title: '❌ Project Rejected',
          message: `Your project has been rejected. Please review the feedback and resubmit.`,
        });
      }
    }

    return {
      project_id: projectId,
      status: 'REJECTED',
    };
  }

  // ✅ APPROVE
  if (action === 'APPROVE') {
    await approveProjectByMentor(projectId);

    // 🔔 Notify team members about approval
    const members = await getTeamMembers(projectId);
    for (const member of members) {
      const user = await findUserByEnrollmentId(member.enrollment_id);
      if (user && user.user_key) {
        await pushNotification({
          userKey: user.user_key,
          role: 'student',
          title: '✅ Project Approved!',
          message: `Congratulations! Your project has been approved by your mentor.`,
        });
      }
    }

    return {
      project_id: projectId,
      status: 'APPROVED',
      message: 'Approved. Will auto-activate after 24 hours',
    };
  }

  throw new Error('Invalid action');
};

/* =========================
   STUDENT: RESUBMIT PROJECT
========================= */
export const resubmitProjectService = async ({
  projectId,
  title,
  description,
  track,
  techStack,
  githubRepoUrl,
  requestMentorChange,
  requesterEnrollmentId,
}) => {
  if (!projectId || !title || !description) {
    throw new Error('projectId, title and description are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'REJECTED') {
    throw new Error('Only rejected projects can be resubmitted');
  }

  const leader = await isTeamLeader(projectId, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can resubmit project');
  }

  // Mark previous rejection as resubmitted in history
  await markAsResubmitted(projectId);

  await resubmitProject({
    projectId,
    title,
    description,
    track,
    techStack,
    githubRepoUrl,
  });

  // If student requests mentor change, set status to PENDING for admin reassignment
  const newStatus = requestMentorChange ? 'PENDING' : 'RESUBMITTED';

  // Update status based on mentor change request
  if (requestMentorChange) {
    await pool.query(
      'UPDATE projects SET status = $1, mentor_employee_id = NULL WHERE project_id = $2',
      [newStatus, projectId]
    );
  }

  // 🔔 Notify based on resubmission type
  if (requestMentorChange) {
    // Notify admin about reassignment needed
    const admins = await pool.query(
      `SELECT user_key FROM users WHERE role = 'admin'`
    );
    for (const admin of admins.rows) {
      await pushNotification({
        userKey: admin.user_key,
        role: 'admin',
        title: '🔄 Project Resubmitted - Mentor Change Requested',
        message: `Project ${projectId} has been resubmitted and needs a new mentor assignment.`,
      });
    }
  } else {
    // Notify original mentor
    const mentor = await findUserByIdentifier(project.mentor_employee_id);
    if (mentor) {
      await pushNotification({
        userKey: mentor.user_key,
        role: 'mentor',
        title: '🔄 Project Resubmitted',
        message: `A project you previously reviewed has been resubmitted for your review.`,
      });
    }
  }

  // Notify team members
  const members = await getTeamMembers(projectId);
  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user && user.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title: '📤 Project Resubmitted',
        message: `Your project has been successfully resubmitted for review.`,
      });
    }
  }

  return {
    project_id: projectId,
    status: newStatus,
    mentor_change_requested: requestMentorChange || false,
  };
};

/* =========================
   STUDENT: EDIT PROJECT (before approval)
========================= */
export const editProjectService = async ({
  projectId,
  title,
  description,
  track,
  techStack,
  githubRepoUrl,
  requesterEnrollmentId,
}) => {
  if (!projectId || !title || !description || !track) {
    throw new Error('projectId, title, description and track are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // 🔒 Only allow editing if not APPROVED or ACTIVE
  if (project.status === 'APPROVED' || project.status === 'ACTIVE') {
    throw new Error('Cannot edit project after it is approved by mentor');
  }

  // 🔒 Only team leader can edit
  const leader = await isTeamLeader(projectId, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can edit project');
  }

  await editProjectBeforeApproval({
    projectId,
    title,
    description,
    track,
    techStack,
    githubRepoUrl,
  });

  return {
    project_id: projectId,
    message: 'Project updated successfully',
  };
};

/* =========================
   STUDENT: MY PROJECTS
========================= */
export const getMyProjectsService = async (enrollmentId) => {
  if (!enrollmentId) {
    throw new Error('enrollmentId is required');
  }

  return await getProjectsOfStudent(enrollmentId);
};


/* =========================
   ADMIN: MANUAL ACTIVATE
========================= */
export const activateProjectService = async ({ projectId }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'APPROVED') {
    throw new Error(
      `Project cannot be activated in status ${project.status}`
    );
  }

  await activateProject(projectId);

  // 🔔 Notify team members about activation
  const members = await getTeamMembers(projectId);
  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user && user.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title: '🎉 Project Activated!',
        message: `Your project is now active! You can start working on it.`,
      });
    }
  }

  return {
    project_id: projectId,
    status: 'ACTIVE',
  };
};
