import { generateTeamId } from '../utils/teamIdGenerator.js';
import pool from '../config/db.js';

import {
  insertTeam,
  addTeamMember,
  countTeamsOfStudent,
  getAllTeamsOfStudent,
  getTeamMembers,
  deleteTeam,
  countTeamMemberChanges,
  logTeamMemberChange,
  updateTeamLeaderEnrollment,
  updateTeamMemberLeaderFlag,
} from '../repositories/team.repo.js';
import {
  findTeamById,
  getProjectsByTeamId,
} from '../repositories/team.repo.js';

import { isTeamLeader, isMemberExists, removeTeamMember, deleteTeamMembers, deleteTeamInvitations } from '../repositories/team.repo.js';
import { findProjectById } from '../repositories/project.repo.js';
import { cancelPendingInvite, getInvitationById } from '../repositories/invitation.repo.js';
import { findUserByIdentifier, findUserByEnrollmentId } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';
import { getAdminSystemSettingsService, getPublicSystemAccessService } from './systemSettings.service.js';

const isTeamMembershipLocked = async (teamId, settings) => {
  const project = await findProjectById(teamId);
  if (!project) {
    return false;
  }

  const status = String(project.status || '').toUpperCase();

  if (settings.auto_lock_team_after_project_approval && ['APPROVED', 'ACTIVE'].includes(status)) {
    return true;
  }

  const lockAfterWeek = Number(settings.lock_team_after_week || 0);
  if (lockAfterWeek > 0) {
    const progress = await pool.query(
      `
      SELECT COALESCE(MAX(week_number), 0)::int AS max_progressed_week
      FROM project_weeks
      WHERE project_id = $1
        AND status <> 'pending'
      `,
      [teamId]
    );

    const maxProgressedWeek = Number(progress.rows[0]?.max_progressed_week || 0);
    if (maxProgressedWeek >= lockAfterWeek) {
      return true;
    }
  }

  return false;
};

/* =========================
   CREATE TEAM SERVICE
========================= */
export const createTeamService = async ({
  department,
  maxTeamSize,
  teamName,
  leaderEnrollmentId,
}) => {
  const access = await getPublicSystemAccessService();
  const systemSettings = await getAdminSystemSettingsService();

  if (!access.allow_team_creation) {
    throw new Error('Team creation is currently disabled by admin');
  }

  if (!department || !maxTeamSize || !teamName) {
    throw new Error('Department, teamName and maxTeamSize are required');
  }

  const normalizedTeamName = String(teamName).trim();
  if (!normalizedTeamName) {
    throw new Error('Team name cannot be empty');
  }
  if (normalizedTeamName.length > 80) {
    throw new Error('Team name must be at most 80 characters');
  }

  const requestedTeamSize = Number(maxTeamSize);
  if (!Number.isInteger(requestedTeamSize) || requestedTeamSize < 1) {
    throw new Error('maxTeamSize must be a positive integer');
  }

  if (!systemSettings.allow_solo_projects && requestedTeamSize < 2) {
    throw new Error('Solo projects are disabled. Team size must be at least 2.');
  }

  if (requestedTeamSize < Number(systemSettings.min_team_size)) {
    throw new Error(`Team size cannot be less than ${systemSettings.min_team_size}`);
  }

  if (requestedTeamSize > Number(systemSettings.max_team_size)) {
    throw new Error(`Team size cannot exceed ${systemSettings.max_team_size}`);
  }

  const totalTeams = await countTeamsOfStudent(leaderEnrollmentId);
  if (totalTeams >= Number(systemSettings.max_teams_per_student)) {
    throw new Error(`You can be part of maximum ${systemSettings.max_teams_per_student} teams`);
  }

  // 🔑 Generate team_id (department based sequence)
  const teamId = await generateTeamId(department);

  // 🏗️ Create team
  await insertTeam(
    teamId,
    department,
    leaderEnrollmentId,
    requestedTeamSize,
    normalizedTeamName
  );

  // 👑 Add leader as team member
  await addTeamMember(teamId, leaderEnrollmentId, true);

  // 🔔 Notify leader
  const leaderUser = await findUserByEnrollmentId(leaderEnrollmentId);
  if (leaderUser && leaderUser.user_key) {
    await pushNotification({
      userKey: leaderUser.user_key,
      role: 'student',
      title: '🎉 Team Created Successfully',
      message: `Team ${teamId} has been created. You can now invite members!`,
    });
  }

  return {
    team_id: teamId,
    team_name: normalizedTeamName,
    department,
    max_team_size: requestedTeamSize,
  };
};

/* =========================
   GET MY TEAMS (CREATED + JOINED)
========================= */
export const getMyTeamsService = async (enrollmentId) => {
  const teams = await getAllTeamsOfStudent(enrollmentId);

  if (teams.length === 0) {
    return [];
  }

  const enrichedTeams = [];

  for (const team of teams) {
    const members = await getTeamMembers(team.team_id);

    enrichedTeams.push({
      team_id: team.team_id,
      team_name: team.team_name,
      department: team.department,
      max_team_size: team.max_team_size,
      leader_enrollment_id: team.leader_enrollment_id,
      is_leader: team.leader_enrollment_id === enrollmentId,
      has_project: Boolean(team.project_title),
      project_title: team.project_title,
      created_at: team.created_at,
      members,
    });
  }

  return enrichedTeams;
};


/* =========================
   SEARCH TEAM BY TEAM ID
========================= */
export const searchTeamByIdService = async (teamId) => {
  if (!teamId) {
    throw new Error('teamId is required');
  }

  // 🔍 Team
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 👥 Members
  const members = await getTeamMembers(teamId);

  // 📦 Projects (team_id == project_id)
  const projects = await getProjectsByTeamId(teamId);

  return {
    team: {
      team_id: team.team_id,
      team_name: team.team_name,
      department: team.department,
      max_team_size: team.max_team_size,
      leader_enrollment_id: team.leader_enrollment_id,
      project_title: team.project_title,
      created_at: team.created_at,
    },
    members,
    projects,
  };
};


/* =========================
   REMOVE TEAM MEMBER (LEADER ONLY)
========================= */
export const removeTeamMemberService = async ({
  teamId,
  memberEnrollmentId,
  requesterEnrollmentId,
}) => {
  const systemSettings = await getAdminSystemSettingsService();
  if (!systemSettings.allow_member_removal) {
    throw new Error('Member removal is currently disabled by admin');
  }

  if (!teamId || !memberEnrollmentId) {
    throw new Error('teamId and memberEnrollmentId are required');
  }

  // 🔒 Team exists
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Team lock policy
  const teamLocked = await isTeamMembershipLocked(teamId, systemSettings);
  if (teamLocked) {
    throw new Error('Team is locked by current admin policy');
  }

  // 🔒 Only leader
  const isLeader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (!isLeader) {
    throw new Error('Only team leader can remove members');
  }

  // ❌ Leader cannot remove himself
  if (memberEnrollmentId === requesterEnrollmentId) {
    throw new Error('Leader cannot remove himself');
  }

  // 🔍 Member exists
  const exists = await isMemberExists(teamId, memberEnrollmentId);
  if (!exists) {
    throw new Error('Member not found in team');
  }

  const maxMemberChanges = Number(systemSettings.max_member_change_allowed || 0);
  const usedMemberChanges = await countTeamMemberChanges(teamId);
  if (usedMemberChanges >= maxMemberChanges) {
    throw new Error(`Maximum member changes reached (${maxMemberChanges})`);
  }

  // 🧹 Remove member
  const removed = await removeTeamMember(teamId, memberEnrollmentId);
  if (!removed) {
    throw new Error('Failed to remove member');
  }

  await logTeamMemberChange({
    teamId,
    enrollmentId: memberEnrollmentId,
    action: 'REMOVE',
    actedBy: requesterEnrollmentId,
  });

  // 🔔 Notify removed member
  const removedUser = await findUserByEnrollmentId(memberEnrollmentId);
  if (removedUser && removedUser.user_key) {
    await pushNotification({
      userKey: removedUser.user_key,
      role: 'student',
      title: '❌ Removed from Team',
      message: `You have been removed from team ${teamId}`,
    });
  }

  return {
    team_id: teamId,
    removed_member: memberEnrollmentId,
  };
};

/* =========================
   CANCEL PENDING INVITATION (LEADER ONLY)
========================= */
export const cancelPendingInvitationService = async ({
  inviteId,
  requesterEnrollmentId,
}) => {
  if (!inviteId) {
    throw new Error('inviteId is required');
  }

  const systemSettings = await getAdminSystemSettingsService();

  // 🔍 Invite exists
  const invite = await getInvitationById(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }

  // 🔒 Team exists
  const team = await findTeamById(invite.team_id);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Team lock policy
  const teamLocked = await isTeamMembershipLocked(invite.team_id, systemSettings);
  if (teamLocked) {
    throw new Error('Team is locked by current admin policy');
  }

  // 🔒 Only leader
  const leader = await isTeamLeader(invite.team_id, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can cancel invitation');
  }

  // ❌ Only pending
  if (invite.status !== 'PENDING') {
    throw new Error('Only pending invitations can be cancelled');
  }

  // 🧹 Cancel invite
  const cancelled = await cancelPendingInvite(
    invite.id,
    invite.team_id
  );

  if (!cancelled) {
    throw new Error('Failed to cancel invitation');
  }

  return {
    team_id: invite.team_id,
    cancelled_invite_id: invite.id,
  };
};



/* =========================
   LEAVE TEAM (STUDENT)
========================= */
export const leaveTeamService = async ({
  teamId,
  requesterEnrollmentId,
}) => {
  const systemSettings = await getAdminSystemSettingsService();
  if (!systemSettings.allow_member_removal) {
    throw new Error('Leaving team is currently disabled by admin');
  }

  if (!teamId) {
    throw new Error('teamId is required');
  }

  // 🔒 Team exists
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Team lock policy
  const teamLocked = await isTeamMembershipLocked(teamId, systemSettings);
  if (teamLocked) {
    throw new Error('Cannot leave team because it is locked by current admin policy');
  }

  // 🔒 Member check
  const isMember = await isMemberExists(teamId, requesterEnrollmentId);
  if (!isMember) {
    throw new Error('You are not a member of this team');
  }

  // ❌ Leader cannot leave
  const leader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (leader) {
    throw new Error('Leader cannot leave the team. Disband instead.');
  }

  const maxMemberChanges = Number(systemSettings.max_member_change_allowed || 0);
  const usedMemberChanges = await countTeamMemberChanges(teamId);
  if (usedMemberChanges >= maxMemberChanges) {
    throw new Error(`Maximum member changes reached (${maxMemberChanges})`);
  }

  // 🧹 Remove member
  const removed = await removeTeamMember(
    teamId,
    requesterEnrollmentId
  );

  if (!removed) {
    throw new Error('Failed to leave team');
  }

  await logTeamMemberChange({
    teamId,
    enrollmentId: requesterEnrollmentId,
    action: 'REMOVE',
    actedBy: requesterEnrollmentId,
  });

  // 🔔 Notify team leader
  const leaderUser = await findUserByEnrollmentId(team.leader_enrollment_id);
  if (leaderUser && leaderUser.user_key) {
    await pushNotification({
      userKey: leaderUser.user_key,
      role: 'student',
      title: '👋 Member Left Team',
      message: `A member has left team ${teamId}`,
    });
  }

  return {
    team_id: teamId,
    left_by: requesterEnrollmentId,
  };
};


/* =========================
   DISBAND TEAM SERVICE
========================= */

export const disbandTeamService = async ({
  teamId,
  requesterEnrollmentId,
}) => {
  if (!teamId) {
    throw new Error('teamId is required');
  }

  const systemSettings = await getAdminSystemSettingsService();

  // 🔍 Team exists
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Only leader
  const leader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can disband the team');
  }

  // 🔒 Team lock policy
  const teamLocked = await isTeamMembershipLocked(teamId, systemSettings);
  if (teamLocked) {
    throw new Error('Team cannot be disbanded because it is locked by current admin policy');
  }

  // 🧨 TRANSACTION (SAFE)
  await pool.query('BEGIN');

  try {
    await deleteTeamInvitations(teamId);
    await deleteTeamMembers(teamId);
    await deleteTeam(teamId);

    await pool.query('COMMIT');

    return {
      team_id: teamId,
      status: 'DISBANDED',
    };
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
};

export const changeTeamLeaderService = async ({
  teamId,
  newLeaderEnrollmentId,
  requesterEnrollmentId,
}) => {
  const systemSettings = await getAdminSystemSettingsService();

  if (!systemSettings.team_leader_required) {
    throw new Error('Team leader requirement is disabled by admin; leader change is not applicable');
  }

  if (!systemSettings.allow_leader_change) {
    throw new Error('Leader change is currently disabled by admin');
  }

  if (!teamId || !newLeaderEnrollmentId) {
    throw new Error('teamId and newLeaderEnrollmentId are required');
  }

  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  const teamLocked = await isTeamMembershipLocked(teamId, systemSettings);
  if (teamLocked) {
    throw new Error('Team is locked by current admin policy');
  }

  const isCurrentLeader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (!isCurrentLeader) {
    throw new Error('Only current team leader can transfer leadership');
  }

  if (newLeaderEnrollmentId === requesterEnrollmentId) {
    throw new Error('New leader must be different from current leader');
  }

  const newLeaderExists = await isMemberExists(teamId, newLeaderEnrollmentId);
  if (!newLeaderExists) {
    throw new Error('New leader must be an existing team member');
  }

  await pool.query('BEGIN');

  try {
    await updateTeamMemberLeaderFlag(teamId, requesterEnrollmentId, false);
    await updateTeamMemberLeaderFlag(teamId, newLeaderEnrollmentId, true);
    await updateTeamLeaderEnrollment(teamId, newLeaderEnrollmentId);

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  const oldLeaderUser = await findUserByEnrollmentId(requesterEnrollmentId);
  if (oldLeaderUser?.user_key) {
    await pushNotification({
      userKey: oldLeaderUser.user_key,
      role: 'student',
      title: 'Leadership Transferred',
      message: `You transferred leadership of team ${teamId} to ${newLeaderEnrollmentId}.`,
    });
  }

  const newLeaderUser = await findUserByEnrollmentId(newLeaderEnrollmentId);
  if (newLeaderUser?.user_key) {
    await pushNotification({
      userKey: newLeaderUser.user_key,
      role: 'student',
      title: 'You Are Team Leader Now',
      message: `You are now the leader of team ${teamId}.`,
    });
  }

  return {
    team_id: teamId,
    previous_leader: requesterEnrollmentId,
    new_leader: newLeaderEnrollmentId,
  };
};
