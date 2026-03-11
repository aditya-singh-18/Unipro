import {
  createMeetingService,
  getMentorMeetingsService,
  getProjectMeetingsService,
  getMeetingDetailsService,
  updateMeetingService,
  deleteMeetingService,
  submitMeetingMinutesService,
  uploadMeetingAttachmentService,
  getMeetingAttachmentsService,
  updateMeetingStatusService,
  getStudentMeetingsService,
  getMeetingMinutesService,
} from '../services/meeting.service.js';

export const createMeeting = async (req, res) => {
  try {
    const mentorId = req.user.user_key;

    const meeting = await createMeetingService({
      mentorId,
      projectId: req.body.project_id,
      projectIds: req.body.project_ids,
      title: req.body.title,
      meetingDate: req.body.meeting_date,
      agenda: req.body.agenda,
      meetingType: req.body.meeting_type,
      meetingPlatform: req.body.meeting_platform,
      meetingLink: req.body.meeting_link,
      scope: req.body.scope,
      teams: req.body.teams,
      participants: req.body.participants,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
    });

    return res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMentorMeetings = async (req, res) => {
  try {
    const requesterId = req.user.user_key;
    const requesterRole = req.user.role;
    const { mentorId } = req.params;

    if (requesterRole !== 'ADMIN' && String(requesterId) !== String(mentorId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own meetings',
      });
    }

    const meetings = await getMentorMeetingsService({
      mentorId,
      requesterRole,
    });

    return res.status(200).json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    const statusCode = error.message?.includes('not authorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectMeetings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const meetings = await getProjectMeetingsService({
      projectId,
      requesterUserKey: req.user.user_key,
      requesterRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    const statusCode = error.message?.includes('not authorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMeetingDetails = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await getMeetingDetailsService({
      meetingId,
      requesterUserKey: req.user.user_key,
      requesterRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    let statusCode = 400;
    if (error.message === 'Meeting not found') statusCode = 404;
    if (error.message?.includes('not authorized')) statusCode = 403;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const requesterMentorId = req.user.user_key;

    const meeting = await updateMeetingService({
      meetingId,
      requesterMentorId,
      title: req.body.title,
      agenda: req.body.agenda,
      meetingDate: req.body.meeting_date,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
      meetingLink: req.body.meeting_link,
      meetingPlatform: req.body.meeting_platform,
      projectIds: req.body.project_ids,
    });

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const requesterMentorId = req.user.user_key;

    await deleteMeetingService({ meetingId, requesterMentorId });

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitMeetingMinutes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const createdBy = req.user.user_key;

    const minutes = await submitMeetingMinutesService({
      meetingId,
      discussionSummary: req.body.discussion_summary,
      keyPoints: req.body.key_points,
      decisions: req.body.decisions,
      actionItems: req.body.action_items,
      nextMeetingDate: req.body.next_meeting_date,
      createdBy,
    });

    return res.status(201).json({
      success: true,
      data: minutes,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadMeetingAttachment = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const uploadedBy = req.user.user_key;

    const attachment = await uploadMeetingAttachmentService({
      meetingId,
      fileName: req.body.file_name,
      fileUrl: req.body.file_url,
      fileType: req.body.file_type,
      uploadedBy,
    });

    return res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMeetingAttachments = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const attachments = await getMeetingAttachmentsService({ meetingId });

    return res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const requesterMentorId = req.user.user_key;

    const meeting = await updateMeetingStatusService({
      meetingId,
      requesterMentorId,
      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStudentMeetings = async (req, res) => {
  try {
    const enrollmentId = req.user.user_key;

    const meetings = await getStudentMeetingsService({ enrollmentId });

    return res.status(200).json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMeetingMinutes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const minutes = await getMeetingMinutesService({ meetingId });
    return res.status(200).json({ success: true, data: minutes });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
