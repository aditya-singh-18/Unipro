import {
  insertMeeting,
  getMeetingsByMentorId,
  getMeetingsVisibleToMentor,
  getMeetingsByProjectId,
  getMeetingById,
  getProjectIdsAssignedToMentor,
  getTeamIdsOfStudent,
  updateMeetingById,
  deleteMeetingById,
  insertMeetingMinutes,
  getMeetingMinutesByMeetingId,
  insertMeetingAttachment,
  getMeetingAttachmentsByMeetingId,
  updateMeetingStatusById,
  getMeetingsVisibleToStudent,
} from '../repositories/meeting.repo.js';

const VALID_SCOPES = new Set(['all', 'selected']);
const VALID_STATUS = new Set(['scheduled', 'completed', 'cancelled']);

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
};

const hasIntersection = (left = [], right = []) => {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right.map((item) => String(item)));
  return left.some((item) => rightSet.has(String(item)));
};

const canAccessMeetingByScope = async ({ meeting, requesterUserKey, requesterRole }) => {
  if (!meeting) return false;

  if (requesterRole === 'ADMIN') return true;

  if (String(meeting.mentor_id) === String(requesterUserKey)) {
    return true;
  }

  const meetingProjectIds = normalizeIdList(meeting.projects);
  const meetingTeamIds = normalizeIdList(meeting.teams);
  const meetingParticipantIds = normalizeIdList(meeting.participants);

  if (requesterRole === 'MENTOR') {
    const assignedProjectIds = await getProjectIdsAssignedToMentor(requesterUserKey);
    return hasIntersection(meetingProjectIds, assignedProjectIds) || hasIntersection(meetingTeamIds, assignedProjectIds);
  }

  if (requesterRole === 'STUDENT') {
    const teamIds = await getTeamIdsOfStudent(requesterUserKey);
    return (
      hasIntersection(meetingProjectIds, teamIds) ||
      hasIntersection(meetingTeamIds, teamIds) ||
      meetingParticipantIds.includes(String(requesterUserKey))
    );
  }

  return false;
};

export const createMeetingService = async ({
  mentorId,
  projectId,
  projectIds,
  title,
  meetingDate,
  agenda,
  meetingType,
  meetingPlatform,
  meetingLink,
  scope,
  teams,
  participants,
  startTime,
  endTime,
}) => {
  if (!mentorId || !title || !meetingDate) {
    throw new Error('mentor_id, title and meeting_date are required');
  }

  const normalizedScope = scope || 'selected';
  if (!VALID_SCOPES.has(normalizedScope)) {
    throw new Error("scope must be 'all' or 'selected'");
  }

  const normalizedProjectIds = normalizeIdList(projectIds);

  const projectList =
    normalizedProjectIds.length > 0
      ? normalizedProjectIds
      : projectId
      ? [String(projectId)]
      : [];

  if (projectList.length === 0) {
    throw new Error('At least one project must be selected');
  }

  const mentorProjectIds = await getProjectIdsAssignedToMentor(mentorId);
  if (!projectList.every((selectedProjectId) => mentorProjectIds.includes(String(selectedProjectId)))) {
    throw new Error('You can schedule meetings only for projects assigned to you');
  }

  const normalizedTeams = normalizeIdList(teams);

  return insertMeeting({
    mentorId,
    title: title.trim(),
    agenda,
    meetingType,
    meetingPlatform,
    meetingLink,
    meetingDate,
    startTime,
    endTime,
    scope: normalizedScope,
    projects: projectList,
    teams: normalizedTeams.length > 0 ? normalizedTeams : projectList,
    participants: normalizeIdList(participants),
    status: 'scheduled',
  });
};

export const getMentorMeetingsService = async ({ mentorId, requesterRole }) => {
  if (!mentorId) throw new Error('mentorId is required');

  // Admin can inspect creator-specific timeline directly.
  if (requesterRole === 'ADMIN') {
    return getMeetingsByMentorId(mentorId);
  }

  const assignedProjectIds = await getProjectIdsAssignedToMentor(mentorId);
  return getMeetingsVisibleToMentor({ mentorId, projectIds: assignedProjectIds });
};

export const getProjectMeetingsService = async ({
  projectId,
  requesterUserKey,
  requesterRole,
}) => {
  if (!projectId) throw new Error('projectId is required');

  if (requesterRole === 'MENTOR') {
    const assignedProjectIds = await getProjectIdsAssignedToMentor(requesterUserKey);
    if (!assignedProjectIds.includes(String(projectId))) {
      throw new Error('You are not authorized to view this project meetings');
    }
  }

  if (requesterRole === 'STUDENT') {
    const teamIds = await getTeamIdsOfStudent(requesterUserKey);
    if (!teamIds.includes(String(projectId))) {
      throw new Error('You are not authorized to view this project meetings');
    }
  }

  const meetings = await getMeetingsByProjectId(projectId);
  const now = new Date();

  const upcoming = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.meeting_date);
    return meetingDate >= now;
  });

  const past = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.meeting_date);
    return meetingDate < now;
  });

  return { upcoming, past, all: meetings };
};

export const getMeetingDetailsService = async ({
  meetingId,
  requesterUserKey,
  requesterRole,
}) => {
  if (!meetingId) throw new Error('meetingId is required');

  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw new Error('Meeting not found');

  const canAccess = await canAccessMeetingByScope({
    meeting,
    requesterUserKey,
    requesterRole,
  });

  if (!canAccess) {
    throw new Error('You are not authorized to view this meeting');
  }

  const [meeting_minutes, meeting_attachments] = await Promise.all([
    getMeetingMinutesByMeetingId(meetingId),
    getMeetingAttachmentsByMeetingId(meetingId),
  ]);

  return {
    ...meeting,
    meeting_minutes,
    meeting_attachments,
  };
};

export const updateMeetingService = async ({
  meetingId,
  requesterMentorId,
  title,
  agenda,
  meetingDate,
  startTime,
  endTime,
  meetingLink,
  meetingPlatform,
  projectIds,
}) => {
  if (!meetingId) throw new Error('meetingId is required');

  const existingMeeting = await getMeetingById(meetingId);
  if (!existingMeeting) throw new Error('Meeting not found');

  if (String(existingMeeting.mentor_id) !== String(requesterMentorId)) {
    throw new Error('Only the meeting creator can update this meeting');
  }

  return updateMeetingById({
    meetingId,
    title,
    agenda,
    meetingDate,
    startTime,
    endTime,
    meetingLink,
    meetingPlatform,
    projects: projectIds,
  });
};

export const deleteMeetingService = async ({ meetingId, requesterMentorId }) => {
  if (!meetingId) throw new Error('meetingId is required');

  const existingMeeting = await getMeetingById(meetingId);
  if (!existingMeeting) throw new Error('Meeting not found');

  if (String(existingMeeting.mentor_id) !== String(requesterMentorId)) {
    throw new Error('Only the meeting creator can delete this meeting');
  }

  return deleteMeetingById(meetingId);
};

export const submitMeetingMinutesService = async ({
  meetingId,
  discussionSummary,
  keyPoints,
  decisions,
  actionItems,
  nextMeetingDate,
  createdBy,
}) => {
  if (!meetingId) throw new Error('meetingId is required');

  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw new Error('Meeting not found');

  return insertMeetingMinutes({
    meetingId,
    discussionSummary,
    keyPoints,
    decisions,
    actionItems,
    nextMeetingDate,
    createdBy,
  });
};

export const uploadMeetingAttachmentService = async ({
  meetingId,
  fileName,
  fileUrl,
  fileType,
  uploadedBy,
}) => {
  if (!meetingId) throw new Error('meetingId is required');
  if (!fileName || !fileUrl) {
    throw new Error('file_name and file_url are required');
  }

  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw new Error('Meeting not found');

  return insertMeetingAttachment({
    meetingId,
    fileName,
    fileUrl,
    fileType,
    uploadedBy,
  });
};

export const getMeetingAttachmentsService = async ({ meetingId }) => {
  if (!meetingId) throw new Error('meetingId is required');
  return getMeetingAttachmentsByMeetingId(meetingId);
};

export const updateMeetingStatusService = async ({
  meetingId,
  requesterMentorId,
  status,
}) => {
  if (!meetingId) throw new Error('meetingId is required');
  if (!status || !VALID_STATUS.has(status)) {
    throw new Error("status must be one of: scheduled, completed, cancelled");
  }

  const existingMeeting = await getMeetingById(meetingId);
  if (!existingMeeting) throw new Error('Meeting not found');

  if (String(existingMeeting.mentor_id) !== String(requesterMentorId)) {
    throw new Error('Only the meeting creator can update meeting status');
  }

  return updateMeetingStatusById({
    meetingId,
    status,
  });
};

export const getStudentMeetingsService = async ({ enrollmentId }) => {
  if (!enrollmentId) throw new Error('enrollmentId is required');

  const teamIds = await getTeamIdsOfStudent(enrollmentId);

  const meetings = await getMeetingsVisibleToStudent({ teamIds, enrollmentId });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = meetings.filter((m) => new Date(m.meeting_date) >= now);
  const past = meetings.filter((m) => new Date(m.meeting_date) < now);

  return { upcoming, past, all: meetings };
};

export const getMeetingMinutesService = async ({ meetingId }) => {
  if (!meetingId) throw new Error('meetingId is required');
  return getMeetingMinutesByMeetingId(meetingId);
};
