import { isMemberExists } from '../repositories/team.repo.js';
import { getProjectById } from '../repositories/tracker.repo.js';
import {
  createDailyLog,
  getDailyLogsByProject,
  getDailyLogById,
  deleteDailyLog,
  upsertProgressScore,
  getProgressScoresByProject,
  getLatestProgressScore,
  createGithubCommit,
  getGithubCommitsByProject,
  getGithubCommitBySha,
  createMentorFeedback,
  getMentorFeedbackByProject,
  getMentorFeedbackById,
  markMentorFeedbackAsRead,
  addStudentReplyToFeedback,
} from '../repositories/tracker.repo.js';
import { sanitizeUrl } from '../middlewares/sanitize.middleware.js';

// ============================================================
// ASSERTION HELPERS
// ============================================================

const assertProjectExists = async (projectId) => {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
};

const assertProjectAccess = async ({ projectId, userKey, role }) => {
  const upperRole = role?.toUpperCase();

  if (upperRole === 'ADMIN') {
    return;
  }

  if (upperRole === 'MENTOR') {
    const project = await assertProjectExists(projectId);
    if (project.mentor_employee_id !== userKey) {
      throw new Error('You are not assigned to this project');
    }
    return;
  }

  if (upperRole === 'STUDENT') {
    const isMember = await isMemberExists(projectId, userKey);
    if (!isMember) {
      throw new Error('You are not authorized to access this project tracker');
    }
    return;
  }

  throw new Error('Invalid role');
};

// ============================================================
// DAILY LOGS SERVICE
// ============================================================

export const createDailyLogService = async ({
  userKey,
  role,
  projectId,
  taskId,
  weekId,
  logDate,
  whatIDid,
  whatIWillDo,
  blockers,
  tag,
  commitCount,
  commitLink,
  hoursSpent,
}) => {
  // Validate required fields
  if (!projectId || !whatIDid || !whatIWillDo) {
    throw new Error('projectId, whatIDid, and whatIWillDo are required');
  }

  if (String(whatIDid || '').trim().length < 10) {
    throw new Error('whatIDid must be at least 10 characters long');
  }

  // Verify project access
  await assertProjectAccess({ projectId, userKey, role });

  // Validate tag
  const validTags = ['progress', 'done', 'fix', 'review', 'blocker', 'meeting'];
  const normalizedTag = String(tag || 'progress').toLowerCase();
  if (!validTags.includes(normalizedTag)) {
    throw new Error(`Invalid tag. Must be one of: ${validTags.join(', ')}`);
  }

  // Sanitize commit link if provided
  let sanitizedCommitLink = null;
  if (commitLink) {
    sanitizedCommitLink = sanitizeUrl(commitLink);
    if (!sanitizedCommitLink) {
      throw new Error('Invalid commit link URL');
    }
  }

  // Parse log date
  const parsedLogDate = logDate ? new Date(logDate) : new Date();
  if (isNaN(parsedLogDate.getTime())) {
    throw new Error('Invalid log date');
  }

  // Validate hours spent
  let parsedHoursSpent = null;
  if (hoursSpent !== null && hoursSpent !== undefined) {
    parsedHoursSpent = Number(hoursSpent);
    if (isNaN(parsedHoursSpent) || parsedHoursSpent < 0 || parsedHoursSpent > 24) {
      throw new Error('hoursSpent must be between 0 and 24');
    }
  }

  // Check if log is late (created after log_date)
  const now = new Date();
  const logDateOnly = new Date(parsedLogDate.toDateString());
  const nowDateOnly = new Date(now.toDateString());
  const isLate = nowDateOnly > logDateOnly;

  const log = await createDailyLog({
    studentUserKey: userKey,
    projectId,
    taskId: taskId || null,
    weekId: weekId || null,
    logDate: parsedLogDate.toISOString().split('T')[0],
    whatIDid: String(whatIDid).trim(),
    whatIWillDo: String(whatIWillDo).trim(),
    blockers: blockers ? String(blockers).trim() : null,
    tag: normalizedTag,
    commitCount: commitCount ? Number(commitCount) : 0,
    commitLink: sanitizedCommitLink,
    hoursSpent: parsedHoursSpent,
    isLate,
    aiSummary: null, // To be populated by AI service later
  });

  return log;
};

export const getDailyLogsService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  startDate,
  endDate,
  limit,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // If student, can only see their own logs
  let filterStudentKey = studentUserKey;
  if (role?.toUpperCase() === 'STUDENT') {
    filterStudentKey = userKey;
  }

  const logs = await getDailyLogsByProject({
    projectId,
    studentUserKey: filterStudentKey,
    startDate,
    endDate,
    limit: limit || 50,
  });

  return logs;
};

export const deleteDailyLogService = async ({ userKey, role, logId }) => {
  if (!logId) {
    throw new Error('logId is required');
  }

  const log = await getDailyLogById(logId);
  if (!log) {
    throw new Error('Daily log not found');
  }

  await assertProjectAccess({ projectId: log.project_id, userKey, role });

  // Students can only delete their own logs
  if (role?.toUpperCase() === 'STUDENT' && log.student_user_key !== userKey) {
    throw new Error('You can only delete your own logs');
  }

  await deleteDailyLog(logId);

  return { success: true, message: 'Daily log deleted successfully' };
};

// ============================================================
// PROGRESS SCORES SERVICE
// ============================================================

export const calculateProgressScoreService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  weekNumber,
}) => {
  if (!projectId || !studentUserKey || !weekNumber) {
    throw new Error('projectId, studentUserKey, and weekNumber are required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // Only mentors and admins can trigger score calculation
  if (role?.toUpperCase() === 'STUDENT') {
    throw new Error('Students cannot manually trigger score calculation');
  }

  // TODO: Implement actual score calculation logic
  // For now, return placeholder scores
  const gitScore = 20; // out of 30
  const taskScore = 25; // out of 35
  const submissionScore = 20; // out of 25
  const logScore = 8; // out of 10
  const totalScore = gitScore + taskScore + submissionScore + logScore;
  const progressPct = Math.min(100, Math.round((totalScore / 100) * 100));

  const score = await upsertProgressScore({
    studentUserKey,
    projectId,
    weekNumber,
    gitScore,
    taskScore,
    submissionScore,
    logScore,
    totalScore,
    progressPct,
    streakDays: 0,
    riskLevel: totalScore < 50 ? 'high' : totalScore < 70 ? 'medium' : 'low',
    daysSinceCommit: 0,
    overdueTaskCount: 0,
  });

  return score;
};

export const getProgressScoresService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  weekNumber,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // If student, can only see their own scores
  let filterStudentKey = studentUserKey;
  if (role?.toUpperCase() === 'STUDENT') {
    filterStudentKey = userKey;
  }

  const scores = await getProgressScoresByProject({
    projectId,
    studentUserKey: filterStudentKey,
    weekNumber,
  });

  return scores;
};

export const getLatestProgressScoreService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // If student, can only see their own scores
  let filterStudentKey = studentUserKey;
  if (role?.toUpperCase() === 'STUDENT') {
    filterStudentKey = userKey;
  }

  if (!filterStudentKey) {
    throw new Error('studentUserKey is required');
  }

  const score = await getLatestProgressScore({
    studentUserKey: filterStudentKey,
    projectId,
  });

  return score;
};

// ============================================================
// GITHUB COMMITS SERVICE
// ============================================================

export const createGithubCommitService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  sha,
  message,
  committedAt,
  branch,
  additions,
  deletions,
  isMergeCommit,
}) => {
  if (!projectId || !sha || !committedAt) {
    throw new Error('projectId, sha, and committedAt are required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // Only mentors and admins can add commits
  if (role?.toUpperCase() === 'STUDENT') {
    throw new Error('Students cannot manually add commits');
  }

  // Validate SHA format (40 hex characters)
  if (!/^[a-f0-9]{40}$/i.test(sha)) {
    throw new Error('Invalid commit SHA format');
  }

  // Check if commit already exists
  const existing = await getGithubCommitBySha(sha);
  if (existing) {
    return existing;
  }

  const commit = await createGithubCommit({
    studentUserKey: studentUserKey || userKey,
    projectId,
    sha,
    message,
    committedAt: new Date(committedAt).toISOString(),
    branch,
    additions: additions || 0,
    deletions: deletions || 0,
    isMergeCommit: isMergeCommit || false,
  });

  return commit;
};

export const getGithubCommitsService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  startDate,
  endDate,
  limit,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // If student, can only see their own commits
  let filterStudentKey = studentUserKey;
  if (role?.toUpperCase() === 'STUDENT') {
    filterStudentKey = userKey;
  }

  const commits = await getGithubCommitsByProject({
    projectId,
    studentUserKey: filterStudentKey,
    startDate,
    endDate,
    limit: limit || 100,
  });

  return commits;
};

// ============================================================
// MENTOR FEEDBACK SERVICE
// ============================================================

export const createMentorFeedbackService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  referenceType,
  referenceId,
  message,
  rating,
}) => {
  if (!projectId || !studentUserKey || !message) {
    throw new Error('projectId, studentUserKey, and message are required');
  }

  if (String(message || '').trim().length < 5) {
    throw new Error('message must be at least 5 characters long');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // Only mentors can create feedback
  if (role?.toUpperCase() !== 'MENTOR') {
    throw new Error('Only mentors can create feedback');
  }

  // Validate reference type
  if (referenceType) {
    const validTypes = ['submission', 'task', 'general'];
    if (!validTypes.includes(referenceType)) {
      throw new Error(`Invalid referenceType. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  // Validate rating
  if (rating !== null && rating !== undefined) {
    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('rating must be between 1 and 5');
    }
  }

  const feedback = await createMentorFeedback({
    mentorEmployeeId: userKey,
    studentUserKey,
    projectId,
    referenceType,
    referenceId,
    message: String(message).trim(),
    rating,
  });

  return feedback;
};

export const getMentorFeedbackService = async ({
  userKey,
  role,
  projectId,
  studentUserKey,
  mentorEmployeeId,
  limit,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  // If student, can only see their own feedback
  let filterStudentKey = studentUserKey;
  let filterMentorId = mentorEmployeeId;

  if (role?.toUpperCase() === 'STUDENT') {
    filterStudentKey = userKey;
    filterMentorId = null; // Students see all mentors' feedback for them
  } else if (role?.toUpperCase() === 'MENTOR') {
    filterMentorId = userKey; // Mentors see only their own feedback
  }

  const feedbackList = await getMentorFeedbackByProject({
    projectId,
    studentUserKey: filterStudentKey,
    mentorEmployeeId: filterMentorId,
    limit: limit || 50,
  });

  return feedbackList;
};

export const markFeedbackAsReadService = async ({ userKey, role, feedbackId }) => {
  if (!feedbackId) {
    throw new Error('feedbackId is required');
  }

  const feedback = await getMentorFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error('Feedback not found');
  }

  await assertProjectAccess({ projectId: feedback.project_id, userKey, role });

  // Only the student who received the feedback can mark it as read
  if (role?.toUpperCase() === 'STUDENT' && feedback.student_user_key !== userKey) {
    throw new Error('You can only mark your own feedback as read');
  }

  if (role?.toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can mark feedback as read');
  }

  const updated = await markMentorFeedbackAsRead(feedbackId);

  return updated;
};

export const replyToFeedbackService = async ({ userKey, role, feedbackId, studentReply }) => {
  if (!feedbackId || !studentReply) {
    throw new Error('feedbackId and studentReply are required');
  }

  if (String(studentReply || '').trim().length < 1) {
    throw new Error('studentReply cannot be empty');
  }

  const feedback = await getMentorFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error('Feedback not found');
  }

  await assertProjectAccess({ projectId: feedback.project_id, userKey, role });

  // Only the student who received the feedback can reply
  if (role?.toUpperCase() === 'STUDENT' && feedback.student_user_key !== userKey) {
    throw new Error('You can only reply to your own feedback');
  }

  if (role?.toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can reply to feedback');
  }

  const updated = await addStudentReplyToFeedback({
    feedbackId,
    studentReply: String(studentReply).trim(),
  });

  return updated;
};
