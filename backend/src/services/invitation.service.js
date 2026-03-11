import pool from '../config/db.js';

import {
  hasPendingInvite,
  createOrResetInvite,
  getInvitationsForStudent,
  getInvitationById,
  updateInvitationStatus,
} from '../repositories/invitation.repo.js';

import {
  findTeamById,
  isTeamLeader,
  countTeamMembers,
  isMemberExists,
  addTeamMember,
} from '../repositories/team.repo.js';
import { findUserByIdentifier, findUserByEnrollmentId } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';

/**
 * SEND INVITE
 */
export const sendInviteService = async ({
  teamId,
  invitedEnrollmentId,
  requesterEnrollmentId,
}) => {
  if (!teamId || !invitedEnrollmentId) {
    throw new Error('teamId and invitedEnrollmentId are required');
  }

  const team = await findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // 🔒 Only leader can invite
  const leader = await isTeamLeader(teamId, requesterEnrollmentId);
  if (!leader) {
    throw new Error('Only team leader can send invites');
  }

  // 🟡 Self-invite block
  if (invitedEnrollmentId === requesterEnrollmentId) {
    throw new Error('You cannot invite yourself');
  }

  // ❌ Already member?
  const alreadyMember = await isMemberExists(teamId, invitedEnrollmentId);
  if (alreadyMember) {
    throw new Error('Student is already a team member');
  }
  const userExists = await findUserByIdentifier(invitedEnrollmentId);
  if (!userExists) {
    throw new Error('Student not registered');
  }
  // ❌ Team full?
  const currentCount = await countTeamMembers(teamId);
  if (currentCount >= team.max_team_size) {
    throw new Error('Team is already full');
  }

  // ❌ Duplicate pending invite?
  const pending = await hasPendingInvite(teamId, invitedEnrollmentId);
  if (pending) {
    throw new Error('Invite already sent');
  }

  // ✅ Create or reset invite
  await createOrResetInvite({
    teamId,
    invitedEnrollmentId,
    invitedByEnrollmentId: requesterEnrollmentId,
  });

  // 🔔 Notify invited student
  const invitedUser = await findUserByEnrollmentId(invitedEnrollmentId);
  if (invitedUser && invitedUser.user_key) {
    console.log('📢 Sending invitation notification to:', invitedUser.user_key);
    await pushNotification({
      userKey: invitedUser.user_key,
      role: 'student',
      title: '🎉 Team Invitation Received',
      message: `You have been invited to join team ${teamId}`,
    });
  } else {
    console.warn('⚠️ Could not find user with enrollmentId:', invitedEnrollmentId);
  }

  return {
    team_id: teamId,
    invited_enrollment_id: invitedEnrollmentId,
    status: 'PENDING',
  };
};

/**
 * LIST INVITATIONS
 */
export const listInvitationsService = async ({ enrollmentId }) => {
  return await getInvitationsForStudent(enrollmentId);
};

/**
 * RESPOND TO INVITE
 */
export const respondToInviteService = async ({
  inviteId,
  action,
  responderEnrollmentId,
}) => {
  if (!inviteId || !action) {
    throw new Error('inviteId and action are required');
  }

  const invite = await getInvitationById(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }

  // 🔒 Only invited student can respond
  if (invite.invited_enrollment_id !== responderEnrollmentId) {
    throw new Error('Not authorized to respond to this invite');
  }

  // ❌ Already handled
  if (invite.status !== 'PENDING') {
    throw new Error('Invitation already processed');
  }

  // ❌ Reject flow
  if (action === 'REJECT') {
    await updateInvitationStatus(inviteId, 'REJECTED');

    // 🔔 Notify team leader about rejection
    const leaderUser = await findUserByEnrollmentId(invite.invited_by_enrollment_id);
    if (leaderUser && leaderUser.user_key) {
      console.log('📢 Sending rejection notification to leader:', leaderUser.user_key);
      await pushNotification({
        userKey: leaderUser.user_key,
        role: 'student',
        title: '❌ Invitation Rejected',
        message: `Your invitation to join team ${invite.team_id} was rejected`,
      });
    }

    return { status: 'REJECTED' };
  }

  // ✅ Accept flow (TRANSACTION SAFE)
  // ✅ Accept flow (UPDATED: max 3 teams allowed)
if (action === 'ACCEPT') {
  await pool.query('BEGIN');

  try {
    // 🔢 Count how many teams student is already part of
    const teamCountResult = await pool.query(
      `
      SELECT COUNT(DISTINCT team_id)::int AS team_count
      FROM team_members
      WHERE enrollment_id = $1
      `,
      [responderEnrollmentId]
    );

    const teamCount = teamCountResult.rows[0].team_count;

    // ❌ Max 3 teams allowed (solo handled separately in project module)
    if (teamCount >= 3) {
      throw new Error(
        'You have already joined maximum allowed teams (3)'
      );
    }

    // 🔢 Check team capacity
    const teamResult = await pool.query(
      `SELECT max_team_size FROM teams WHERE team_id = $1`,
      [invite.team_id]
    );

    const maxTeamSize = teamResult.rows[0].max_team_size;

    const currentCount = await countTeamMembers(invite.team_id);
    if (currentCount >= maxTeamSize) {
      throw new Error('Team is already full');
    }

    // ➕ Add member
    await addTeamMember(invite.team_id, responderEnrollmentId, false);

    // ✅ Update invitation status
    await updateInvitationStatus(inviteId, 'ACCEPTED');

    // 🔔 Notify team leader about acceptance
    const leaderUser = await findUserByEnrollmentId(invite.invited_by_enrollment_id);
    if (leaderUser && leaderUser.user_key) {
      console.log('📢 Sending acceptance notification to leader:', leaderUser.user_key);
      await pushNotification({
        userKey: leaderUser.user_key,
        role: 'student',
        title: '✅ Invitation Accepted',
        message: `Your invitation to team ${invite.team_id} was accepted`,
      });
    }

    await pool.query('COMMIT');

    return {
      status: 'ACCEPTED',
      team_id: invite.team_id,
      current_team_count: teamCount + 1,
      max_allowed_teams: 3,
    };
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

  throw new Error('Invalid action');
};
