import axios from '@/lib/axios';

// ============================================================
// DAILY LOGS TYPES
// ============================================================

export type DailyLog = {
  log_id: string;
  student_user_key: string;
  project_id: string;
  task_id: number | null;
  week_id: number | null;
  log_date: string;
  what_i_did: string;
  what_i_will_do: string;
  blockers: string | null;
  tag: 'progress' | 'done' | 'fix' | 'review' | 'blocker' | 'meeting';
  commit_count: number;
  commit_link: string | null;
  hours_spent: number | null;
  is_late: boolean;
  ai_summary: string | null;
  created_at: string;
};

export type CreateDailyLogPayload = {
  taskId?: number;
  weekId?: number;
  logDate?: string;
  whatIDid: string;
  whatIWillDo: string;
  blockers?: string;
  tag?: 'progress' | 'done' | 'fix' | 'review' | 'blocker' | 'meeting';
  commitCount?: number;
  commitLink?: string;
  hoursSpent?: number;
};

// ============================================================
// PROGRESS SCORES TYPES
// ============================================================

export type ProgressScore = {
  score_id: string;
  student_user_key: string;
  project_id: string;
  week_number: number;
  git_score: number;
  task_score: number;
  submission_score: number;
  log_score: number;
  total_score: number;
  progress_pct: number;
  streak_days: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  days_since_commit: number;
  overdue_task_count: number;
  calculated_at: string;
};

export type CalculateProgressScorePayload = {
  studentUserKey: string;
  weekNumber: number;
};

// ============================================================
// GITHUB COMMITS TYPES
// ============================================================

export type GithubCommit = {
  commit_id: string;
  student_user_key: string;
  project_id: string;
  sha: string;
  message: string | null;
  committed_at: string;
  branch: string | null;
  additions: number;
  deletions: number;
  is_merge_commit: boolean;
  created_at: string;
};

export type CreateGithubCommitPayload = {
  studentUserKey?: string;
  sha: string;
  message?: string;
  committedAt: string;
  branch?: string;
  additions?: number;
  deletions?: number;
  isMergeCommit?: boolean;
};

// ============================================================
// MENTOR FEEDBACK TYPES
// ============================================================

export type MentorFeedback = {
  feedback_id: string;
  mentor_employee_id: string;
  student_user_key: string;
  project_id: string;
  reference_type: 'submission' | 'task' | 'general' | null;
  reference_id: string | null;
  message: string;
  rating: number | null;
  is_read: boolean;
  student_reply: string | null;
  created_at: string;
};

export type CreateMentorFeedbackPayload = {
  studentUserKey: string;
  referenceType?: 'submission' | 'task' | 'general';
  referenceId?: string;
  message: string;
  rating?: number;
};

export type ReplyToFeedbackPayload = {
  studentReply: string;
};

// ============================================================
// DAILY LOGS SERVICE
// ============================================================

export const createDailyLog = async (
  projectId: string,
  payload: CreateDailyLogPayload
): Promise<DailyLog> => {
  const response = await axios.post(`/tracker/projects/${projectId}/daily-logs`, payload);
  return response.data.log;
};

export const getDailyLogs = async (
  projectId: string,
  options?: {
    studentUserKey?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<DailyLog[]> => {
  const params = new URLSearchParams();
  if (options?.studentUserKey) params.append('studentUserKey', options.studentUserKey);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = queryString
    ? `/tracker/projects/${projectId}/daily-logs?${queryString}`
    : `/tracker/projects/${projectId}/daily-logs`;

  const response = await axios.get(url);
  return response.data.logs || [];
};

export const deleteDailyLog = async (logId: string): Promise<void> => {
  await axios.delete(`/tracker/daily-logs/${logId}`);
};

// ============================================================
// PROGRESS SCORES SERVICE
// ============================================================

export const calculateProgressScore = async (
  projectId: string,
  payload: CalculateProgressScorePayload
): Promise<ProgressScore> => {
  const response = await axios.post(
    `/tracker/projects/${projectId}/progress-scores/calculate`,
    payload
  );
  return response.data.score;
};

export const getProgressScores = async (
  projectId: string,
  options?: {
    studentUserKey?: string;
    weekNumber?: number;
  }
): Promise<ProgressScore[]> => {
  const params = new URLSearchParams();
  if (options?.studentUserKey) params.append('studentUserKey', options.studentUserKey);
  if (options?.weekNumber) params.append('weekNumber', String(options.weekNumber));

  const queryString = params.toString();
  const url = queryString
    ? `/tracker/projects/${projectId}/progress-scores?${queryString}`
    : `/tracker/projects/${projectId}/progress-scores`;

  const response = await axios.get(url);
  return response.data.scores || [];
};

export const getLatestProgressScore = async (
  projectId: string,
  studentUserKey: string
): Promise<ProgressScore | null> => {
  try {
    const response = await axios.get(
      `/tracker/projects/${projectId}/progress-scores/latest/${studentUserKey}`
    );
    return response.data.score || null;
  } catch (error) {
    return null;
  }
};

// ============================================================
// GITHUB COMMITS SERVICE
// ============================================================

export const createGithubCommit = async (
  projectId: string,
  payload: CreateGithubCommitPayload
): Promise<GithubCommit | null> => {
  const response = await axios.post(`/tracker/projects/${projectId}/github-commits`, payload);
  return response.data.commit || null;
};

export const getGithubCommits = async (
  projectId: string,
  options?: {
    studentUserKey?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<GithubCommit[]> => {
  const params = new URLSearchParams();
  if (options?.studentUserKey) params.append('studentUserKey', options.studentUserKey);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = queryString
    ? `/tracker/projects/${projectId}/github-commits?${queryString}`
    : `/tracker/projects/${projectId}/github-commits`;

  const response = await axios.get(url);
  return response.data.commits || [];
};

// ============================================================
// MENTOR FEEDBACK SERVICE
// ============================================================

export const createMentorFeedback = async (
  projectId: string,
  payload: CreateMentorFeedbackPayload
): Promise<MentorFeedback> => {
  const response = await axios.post(`/tracker/projects/${projectId}/mentor-feedback`, payload);
  return response.data.feedback;
};

export const getMentorFeedback = async (
  projectId: string,
  options?: {
    studentUserKey?: string;
    mentorEmployeeId?: string;
    limit?: number;
  }
): Promise<MentorFeedback[]> => {
  const params = new URLSearchParams();
  if (options?.studentUserKey) params.append('studentUserKey', options.studentUserKey);
  if (options?.mentorEmployeeId) params.append('mentorEmployeeId', options.mentorEmployeeId);
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = queryString
    ? `/tracker/projects/${projectId}/mentor-feedback?${queryString}`
    : `/tracker/projects/${projectId}/mentor-feedback`;

  const response = await axios.get(url);
  return response.data.feedback || [];
};

export const markFeedbackAsRead = async (feedbackId: string): Promise<MentorFeedback> => {
  const response = await axios.patch(`/tracker/mentor-feedback/${feedbackId}/read`);
  return response.data.feedback;
};

export const replyToFeedback = async (
  feedbackId: string,
  payload: ReplyToFeedbackPayload
): Promise<MentorFeedback> => {
  const response = await axios.patch(`/tracker/mentor-feedback/${feedbackId}/reply`, payload);
  return response.data.feedback;
};
