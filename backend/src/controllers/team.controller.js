import {
  createTeamService,
  getMyTeamsService,
  searchTeamByIdService,
} from '../services/team.service.js';
import { removeTeamMemberService } from '../services/team.service.js';
import { cancelPendingInvitationService } from '../services/team.service.js';
import { leaveTeamService } from '../services/team.service.js';
import { disbandTeamService } from '../services/team.service.js';

/* =========================
   CREATE TEAM
========================= */
export const createTeam = async (req, res) => {
  try {
    const { department, maxTeamSize } = req.body;
    const leaderEnrollmentId = req.user.user_key;

    const team = await createTeamService({
      department,
      maxTeamSize,
      leaderEnrollmentId,
    });

    return res.status(201).json({
      message: 'Team created successfully',
      team,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

/* =========================
   GET MY TEAMS (ALL)
========================= */
export const getMyTeams = async (req, res) => {
  try {
    const enrollmentId = req.user.user_key;

    const teams = await getMyTeamsService(enrollmentId);

    return res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   BLOCK DIRECT ADD MEMBER
========================= */
export const addTeamMember = async (req, res) => {
  return res.status(403).json({
    message: 'Direct add-member is disabled. Use invitation flow.',
  });
};

/* =========================
   SEARCH TEAM BY TEAM ID
========================= */
export const searchTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    const result = await searchTeamByIdService(teamId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================
   REMOVE TEAM MEMBER (LEADER ONLY)
========================= */
export const removeTeamMember = async (req, res) => {
  try {
    const { teamId, memberEnrollmentId } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await removeTeamMemberService({
      teamId,
      memberEnrollmentId,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   CANCEL PENDING INVITATION (LEADER ONLY)
========================= */
export const cancelPendingInvitation = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await cancelPendingInvitationService({
      inviteId,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================
   LEAVE TEAM
========================= */
export const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await leaveTeamService({
      teamId,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'You have left the team successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================
   DISBAND TEAM
========================= */

export const disbandTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await disbandTeamService({
      teamId,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Team disbanded successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
