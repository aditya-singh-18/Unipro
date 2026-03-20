import {
  createDailyLogService,
  getDailyLogsService,
  deleteDailyLogService,
  calculateProgressScoreService,
  getProgressScoresService,
  getLatestProgressScoreService,
  createGithubCommitService,
  getGithubCommitsService,
  createMentorFeedbackService,
  getMentorFeedbackService,
  markFeedbackAsReadService,
  replyToFeedbackService,
} from '../services/protrackEnhancement.service.js';

const resolveStatusCode = (error, fallback = 400) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('not found')) return 404;
  if (
    message.includes('not authorized') ||
    message.includes('unauthorized') ||
    message.includes('not assigned') ||
    message.includes('invalid role') ||
    message.includes('only') ||
    message.includes('cannot')
  ) {
    return 403;
  }
  if (message.includes('required') || message.includes('invalid') || message.includes('must be')) {
    return 400;
  }

  return fallback;
};

// ============================================================
// DAILY LOGS CONTROLLERS
// ============================================================

export const createDailyLog = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
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
    } = req.body;

    const log = await createDailyLogService({
      userKey: req.user.user_key,
      role: req.user.role,
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
    });

    return res.status(201).json({
      success: true,
      message: 'Daily log created successfully',
      log,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyLogs = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, startDate, endDate, limit } = req.query;

    const logs = await getDailyLogsService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteDailyLog = async (req, res) => {
  try {
    const { logId } = req.params;

    const result = await deleteDailyLogService({
      userKey: req.user.user_key,
      role: req.user.role,
      logId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// PROGRESS SCORES CONTROLLERS
// ============================================================

export const calculateProgressScore = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, weekNumber } = req.body;

    const score = await calculateProgressScoreService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      weekNumber: Number(weekNumber),
    });

    return res.status(201).json({
      success: true,
      message: 'Progress score calculated successfully',
      score,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProgressScores = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, weekNumber } = req.query;

    const scores = await getProgressScoresService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      weekNumber: weekNumber ? Number(weekNumber) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: scores.length,
      scores,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getLatestProgressScore = async (req, res) => {
  try {
    const { projectId, studentUserKey } = req.params;

    const score = await getLatestProgressScoreService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
    });

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'No progress score found for this student',
      });
    }

    return res.status(200).json({
      success: true,
      score,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GITHUB COMMITS CONTROLLERS
// ============================================================

export const createGithubCommit = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      studentUserKey,
      sha,
      message,
      committedAt,
      branch,
      additions,
      deletions,
      isMergeCommit,
    } = req.body;

    const commit = await createGithubCommitService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      sha,
      message,
      committedAt,
      branch,
      additions,
      deletions,
      isMergeCommit,
    });

    if (!commit) {
      return res.status(200).json({
        success: true,
        message: 'Commit already exists',
        commit: null,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'GitHub commit created successfully',
      commit,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getGithubCommits = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, startDate, endDate, limit } = req.query;

    const commits = await getGithubCommitsService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: commits.length,
      commits,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// MENTOR FEEDBACK CONTROLLERS
// ============================================================

export const createMentorFeedback = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, referenceType, referenceId, message, rating } = req.body;

    const feedback = await createMentorFeedbackService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      referenceType,
      referenceId,
      message,
      rating,
    });

    return res.status(201).json({
      success: true,
      message: 'Mentor feedback created successfully',
      feedback,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMentorFeedback = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentUserKey, mentorEmployeeId, limit } = req.query;

    const feedbackList = await getMentorFeedbackService({
      userKey: req.user.user_key,
      role: req.user.role,
      projectId,
      studentUserKey,
      mentorEmployeeId,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: feedbackList.length,
      feedback: feedbackList,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const markFeedbackAsRead = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await markFeedbackAsReadService({
      userKey: req.user.user_key,
      role: req.user.role,
      feedbackId,
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback marked as read',
      feedback,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};

export const replyToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { studentReply } = req.body;

    const feedback = await replyToFeedbackService({
      userKey: req.user.user_key,
      role: req.user.role,
      feedbackId,
      studentReply,
    });

    return res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      feedback,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};
