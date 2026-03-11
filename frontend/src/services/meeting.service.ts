import axios from '@/lib/axios';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export type Meeting = {
  id: number;
  mentor_id: string | number;
  title: string;
  agenda: string | null;
  meeting_type: string;
  meeting_platform: string | null;
  meeting_link: string | null;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  scope: 'all' | 'selected';
  projects: string[];
  teams: string[];
  participants: string[];
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
};

export type CreateMeetingPayload = {
  project_id?: string;
  project_ids?: string[];
  title: string;
  meeting_date: string;
  agenda?: string;
  meeting_type?: string;
  meeting_platform?: string;
  meeting_link?: string;
  start_time?: string;
  end_time?: string;
  scope?: 'all' | 'selected';
  teams?: string[];
  participants?: string[];
};

export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
  const res = await axios.post('/meetings', payload);
  return res.data?.data;
};

export const getMentorMeetings = async (mentorId: string): Promise<Meeting[]> => {
  const res = await axios.get(`/meetings/mentor/${mentorId}`);
  return res.data?.data || [];
};

export const getProjectMeetings = async (projectId: string) => {
  const res = await axios.get(`/projects/${projectId}/meetings`);
  return res.data?.data;
};

export const getMeetingDetails = async (meetingId: number) => {
  const res = await axios.get(`/meetings/${meetingId}`);
  return res.data?.data;
};

export const updateMeeting = async (
  meetingId: number,
  payload: Partial<CreateMeetingPayload>
): Promise<Meeting> => {
  const res = await axios.put(`/meetings/${meetingId}`, payload);
  return res.data?.data;
};

export const deleteMeeting = async (meetingId: number) => {
  await axios.delete(`/meetings/${meetingId}`);
};

export const submitMeetingMinutes = async (
  meetingId: number,
  payload: {
    discussion_summary?: string;
    key_points?: string;
    decisions?: string;
    action_items?: Array<{ task: string; assignee?: string; due_date?: string }>;
    next_meeting_date?: string;
  }
) => {
  const res = await axios.post(`/meetings/${meetingId}/minutes`, payload);
  return res.data?.data;
};

export const uploadMeetingAttachment = async (
  meetingId: number,
  payload: {
    file_name: string;
    file_url: string;
    file_type?: string;
  }
) => {
  const res = await axios.post(`/meetings/${meetingId}/attachments`, payload);
  return res.data?.data;
};

export const getMeetingAttachments = async (meetingId: number) => {
  const res = await axios.get(`/meetings/${meetingId}/attachments`);
  return res.data?.data || [];
};

export const updateMeetingStatus = async (meetingId: number, status: MeetingStatus): Promise<Meeting> => {
  const res = await axios.patch(`/meetings/${meetingId}/status`, { status });
  return res.data?.data;
};

export type MeetingMinute = {
  id: number;
  meeting_id: number;
  discussion_summary: string | null;
  key_points: string | null;
  decisions: string | null;
  action_items: Array<{ task: string; assignee?: string; due_date?: string }>;
  next_meeting_date: string | null;
  created_by: string | null;
  created_at: string;
};

export type StudentMeetingsResponse = {
  upcoming: Meeting[];
  past: Meeting[];
  all: Meeting[];
};

export const getStudentMeetings = async (): Promise<StudentMeetingsResponse> => {
  const res = await axios.get('/meetings/student/my-meetings');
  return res.data?.data || { upcoming: [], past: [], all: [] };
};

export const getMeetingMinutes = async (meetingId: number): Promise<MeetingMinute[]> => {
  const res = await axios.get(`/meetings/${meetingId}/minutes`);
  return res.data?.data || [];
};
