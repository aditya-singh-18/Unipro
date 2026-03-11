import { sendInviteService } from '../services/invitation.service.js';
import { listInvitationsService } from '../services/invitation.service.js';
import { respondToInviteService } from '../services/invitation.service.js';

export const sendInvite = async (req, res) => {
  try {
    const { teamId, invitedEnrollmentId } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await sendInviteService({
      teamId,
      invitedEnrollmentId,
      requesterEnrollmentId,
    });

    return res.status(201).json({
      message: 'Invitation sent successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const listInvitations = async (req, res) => {
  try {
    const enrollmentId = req.user.user_key; // from JWT

    const invitations = await listInvitationsService({ enrollmentId });

    return res.status(200).json({
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const respondToInvite = async (req, res) => {
  try {
    const { inviteId, action } = req.body;
    const responderEnrollmentId = req.user.user_key;

    const result = await respondToInviteService({
      inviteId,
      action,
      responderEnrollmentId,
    });

    return res.status(200).json({
      message: `Invitation ${result.status.toLowerCase()}`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
