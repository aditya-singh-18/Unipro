import { generateTeamId } from '../utils/teamIdGenerator.js';
import pool from '../config/db.js';

import {
  insertTeam,
  addTeamMember,
  countTeamsOfStudent,
  getAllTeamsOfStudent,
  getTeamMembers,
  deleteTeam,
} from '../repositories/team.repo.js';
import {
  findTeamById,
  getProjectsByTeamId,
} from '../repositories/team.repo.js';

import { isTeamLeader, isMemberExists, removeTeamMember, deleteTeamMembers, deleteTeamInvitations } from '../repositories/team.repo.js';
import { projectExists } from '../repositories/project.repo.js';
import { cancelPendingInvite, getInvitationById } from '../repositories/invitation.repo.js';
import { findUserByIdentifier, findUserByEnrollmentId } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';

/* =========================
   CREATE TEAM SERVICE
========================= */
export const createTeamService = async ({
  department,
  maxTeamSize,
  teamName,
  leaderEnrollmentId,
}) => {
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

  // 🔒 HARD RULE: max 3 teams per student (created + joined)
  const totalTeams = await countTeamsOfStudent(leaderEnrollmentId);
  if (totalTeams >= 3) {
    throw new Error('You can be part of maximum 3 teams');
  }

  // 🔑 Generate team_id (department based sequence)
  const teamId = await generateTeamId(department);

  // 🏗️ Create team
  await insertTeam(
    teamId,
    department,
    leaderEnrollmentId,
    maxTeamSize,
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
    max_team_size: maxTeamSize,
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
  if (!teamId || !memberEnrollmentId) {
    throw new Error('teamId and memberEnrollmentId are required');
  }

  // 🔒 Team exists
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Project lock
  const projectLocked = await projectExists(teamId);
  if (projectLocked) {
    throw new Error('Team is locked after project submission');
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

  // 🧹 Remove member
  const removed = await removeTeamMember(teamId, memberEnrollmentId);
  if (!removed) {
    throw new Error('Failed to remove member');
  }

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

  // 🔒 Project lock
  const projectLocked = await projectExists(invite.team_id);
  if (projectLocked) {
    throw new Error('Team is locked after project submission');
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
  if (!teamId) {
    throw new Error('teamId is required');
  }

  // 🔒 Team exists
  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Project lock
  const locked = await projectExists(teamId);
  if (locked) {
    throw new Error('Cannot leave team after project submission');
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

  // 🧹 Remove member
  const removed = await removeTeamMember(
    teamId,
    requesterEnrollmentId
  );

  if (!removed) {
    throw new Error('Failed to leave team');
  }

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

  // 🔒 Project lock
  const locked = await projectExists(teamId);
  if (locked) {
    throw new Error('Team cannot be disbanded after project submission');
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
