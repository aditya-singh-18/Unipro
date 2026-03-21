import path from 'path';
import { fileURLToPath } from 'url';
import {
  bootstrapProjectWeeksService,
  getProjectWeeksService,
  getMentorReviewQueueService,
  updateWeekStatusService,
  createWeekSubmissionService,
  getWeekDraftService,
  saveWeekDraftService,
  getWeekSubmissionsService,
  createSubmissionFileService,
  getSubmissionFilesService,
  reviewSubmissionService,
  getWeekReviewsService,
  createTaskService,
  getProjectTasksService,
  updateTaskStatusService,
  getProjectTimelineService,
  getCurrentRiskService,
  recalculateRiskService,
  getCurrentHealthService,
  recalculateHealthService,
  getStudentDashboardService,
  getMentorDashboardService,
  getAdminDashboardService,
  getAdminComplianceBoardService,
  getProjectStatusHistoryService,
  getAdminEscalationBoardService,
  getAdminMentorLoadTrendsService,
  getAdminDepartmentLeaderboardService,
  getGovernanceExportService,
  getProgressReportExportService,
  applyAdminEscalationBatchActionService,
} from '../services/tracker.service.js';
import {
  getTrackerPolicySettingsService,
  updateTrackerPolicySettingsService,
} from '../services/trackerPolicy.service.js';
import {
  getMentorEffectivenessGridService,
  getMentorEffectivenessDetailService,
  exportMentorEffectivenessServiceCSV,
  exportMentorEffectivenessServiceJSON,
} from '../services/mentorEffectiveness.service.js';
import {
  getStudentLearningRosterService,
  getStudentLearningDetailService,
  exportStudentLearningServiceCSV,
  exportStudentLearningServiceJSON,
} from '../services/studentLearning.service.js';
import {
  getEscalationDetailService,
  updateEscalationFollowUpService,
} from '../services/escalationFollowUp.service.js';
import {
  createDailyLogEntryService,
  getDailyLogsService,
  getTodayDailyLogService,
  getDailyLogSummaryService,
  getMyScoresService,
  getProjectScoresService,
  recalculateProjectScoreService,
  createMentorFeedbackService,
  getMyMentorFeedbackService,
  replyToMentorFeedbackService,
  markMentorFeedbackReadService,
  ingestGithubWebhookService,
  getProjectGithubCommitsService,
  updateProjectGithubConfigService,
  updateUserGithubUsernameService,
  getMyGithubIdentityService,
  createGithubOAuthStartUrlService,
  completeGithubOAuthCallbackService,
} from '../services/protrackEnhancement.service.js';

const __filename = fileURLToPath(import.meta.url);

export const uploadSubmissionFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      fileName: req.file.originalname,
      fileUrl,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resolveTrackerStatusCode = (error, fallback = 400) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('not found')) return 404;
  if (
    message.includes('not authorized') ||
    message.includes('unauthorized') ||
    message.includes('not assigned') ||
    message.includes('invalid role')
  ) {
    return 403;
  }
  if (
    message.includes('current state') ||
    message.includes('invalid task transition') ||
    message.includes('deadline has passed') ||
    message.includes('locked') ||
    message.includes('allowed only') ||
    message.includes('conflict')
  ) {
    return 409;
  }

  return fallback;
};

export const bootstrapProjectWeeks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { totalWeeks, startDate, phasePlan } = req.body;

    const weeks = await bootstrapProjectWeeksService({
      projectId,
      totalWeeks,
      startDate,
      phasePlan,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Project weeks bootstrapped successfully',
      count: weeks.length,
      weeks,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectWeeks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const requesterId = req.user.user_key;

    const weeks = await getProjectWeeksService({
      projectId,
      userKey: requesterId,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: weeks.length,
      weeks,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMentorReviewQueue = async (req, res) => {
  try {
    const { sortBy, order, riskLevel, page, pageSize } = req.query;

    const queue = await getMentorReviewQueueService({
      mentorEmployeeId: req.user.user_key,
      role: req.user.role,
      sortBy,
      order,
      riskLevel,
      page,
      pageSize,
    });

    return res.status(200).json({
      success: true,
      queue: queue.items,
      pagination: {
        page: queue.page,
        pageSize: queue.pageSize,
        total: queue.total,
      },
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateWeekStatus = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { status, reason } = req.body;

    const week = await updateWeekStatusService({
      weekId: Number(weekId),
      status,
      reason,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Week status updated successfully',
      week,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const createWeekSubmission = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { summaryOfWork, blockers, nextWeekPlan, githubLinkSnapshot, githubRepoUrl } = req.body;

    const submission = await createWeekSubmissionService({
      weekId: Number(weekId),
      summaryOfWork,
      blockers,
      nextWeekPlan,
      githubLinkSnapshot,
      githubRepoUrl,
      userKey: req.user.user_key,
      role: req.user.role,
      isResubmission: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Weekly submission created',
      submission,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWeekDraft = async (req, res) => {
  try {
    const { weekId } = req.params;

    const draft = await getWeekDraftService({
      weekId: Number(weekId),
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      draft,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const saveWeekDraft = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { summaryOfWork, blockers, nextWeekPlan, githubLinkSnapshot } = req.body;

    const draft = await saveWeekDraftService({
      weekId: Number(weekId),
      summaryOfWork,
      blockers,
      nextWeekPlan,
      githubLinkSnapshot,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Draft saved',
      draft,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const resubmitWeekSubmission = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { summaryOfWork, blockers, nextWeekPlan, githubLinkSnapshot, githubRepoUrl } = req.body;

    const submission = await createWeekSubmissionService({
      weekId: Number(weekId),
      summaryOfWork,
      blockers,
      nextWeekPlan,
      githubLinkSnapshot,
      githubRepoUrl,
      userKey: req.user.user_key,
      role: req.user.role,
      isResubmission: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Weekly submission resubmitted',
      submission,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWeekSubmissions = async (req, res) => {
  try {
    const { weekId } = req.params;

    const submissions = await getWeekSubmissionsService({
      weekId: Number(weekId),
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const createSubmissionFile = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { fileName, fileUrl, mimeType, fileSizeBytes } = req.body;

    const file = await createSubmissionFileService({
      submissionId: Number(submissionId),
      fileName,
      fileUrl,
      mimeType,
      fileSizeBytes,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Submission file saved successfully',
      file,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSubmissionFiles = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const files = await getSubmissionFilesService({
      submissionId: Number(submissionId),
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { action, reviewComment } = req.body;

    const review = await reviewSubmissionService({
      submissionId: Number(submissionId),
      action,
      reviewComment,
      reviewerEmployeeId: req.user.user_key,
      role: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Submission reviewed successfully',
      review,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWeekReviews = async (req, res) => {
  try {
    const { weekId } = req.params;

    const reviews = await getWeekReviewsService({
      weekId: Number(weekId),
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const createProjectTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { weekId, title, description, priority, assignedToUserKey, dueDate } = req.body;

    const task = await createTaskService({
      projectId,
      weekId,
      title,
      description,
      priority,
      assignedToUserKey,
      dueDate,
      createdByUserKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignedTo, weekId } = req.query;
    const requesterId = req.user.user_key;

    const tasks = await getProjectTasksService({
      projectId,
      status,
      assignedTo,
      weekId,
      userKey: requesterId,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await updateTaskStatusService({
      taskId: Number(taskId),
      status,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page, pageSize, eventType } = req.query;

    const timeline = await getProjectTimelineService({
      projectId,
      eventType,
      page,
      pageSize,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCurrentRisk = async (req, res) => {
  try {
    const { projectId } = req.params;

    const risk = await getCurrentRiskService({
      projectId,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      risk,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const recalculateRisk = async (req, res) => {
  try {
    const { projectId } = req.params;

    const risk = await recalculateRiskService({
      projectId,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Risk snapshot recalculated successfully',
      risk,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCurrentHealth = async (req, res) => {
  try {
    const { projectId } = req.params;

    const health = await getCurrentHealthService({
      projectId,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      health,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const recalculateHealth = async (req, res) => {
  try {
    const { projectId } = req.params;

    const health = await recalculateHealthService({
      projectId,
      userKey: req.user.user_key,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Health snapshot recalculated successfully',
      health,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const stats = await getStudentDashboardService({
      userKey: req.user.user_key,
    });

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMentorDashboard = async (req, res) => {
  try {
    const stats = await getMentorDashboardService({
      userKey: req.user.user_key,
    });

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    const stats = await getAdminDashboardService();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminComplianceBoard = async (req, res) => {
  try {
    const board = await getAdminComplianceBoardService({
      complianceStatus: req.query?.status,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    });

    return res.status(200).json({
      success: true,
      summary: board.summary,
      items: board.items,
      pagination: board.pagination,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectStatusHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const requesterId = req.user.user_key;

    const history = await getProjectStatusHistoryService({
      projectId,
      userKey: requesterId,
      role: req.user.role,
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 403)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminEscalationBoard = async (req, res) => {
  try {
    const board = await getAdminEscalationBoardService({
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      thresholds: board.thresholds,
      count: board.count,
      items: board.items,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminMentorLoadTrends = async (req, res) => {
  try {
    const result = await getAdminMentorLoadTrendsService({
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      items: result.items,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminDepartmentLeaderboard = async (req, res) => {
  try {
    const result = await getAdminDepartmentLeaderboardService({
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      items: result.items,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getGovernanceExport = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query?.page) || 1);
    const pageSize = Math.min(250, Math.max(1, Number(req.query?.pageSize) || 250));

    const result = await getGovernanceExportService({
      format: req.query?.format,
      complianceStatus: req.query?.status,
      page,
      pageSize,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.body);
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProgressReportExport = async (req, res) => {
  try {
    const result = await getProgressReportExportService({
      format: req.query?.format,
      projectId: req.query?.projectId,
      teamId: req.query?.teamId,
      weekStart: req.query?.weekStart,
      weekEnd: req.query?.weekEnd,
    });

    if (String(req.query?.format || '').toLowerCase() === 'json') {
      return res.status(200).json({
        success: true,
        ...result.payload,
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.body);
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const applyAdminEscalationBatchAction = async (req, res) => {
  try {
    const result = await applyAdminEscalationBatchActionService({
      items: req.body?.items,
      action: req.body?.action,
      note: req.body?.note,
      actorUserKey: req.user.user_key,
    });

    return res.status(200).json({
      success: true,
      message: 'Escalation batch action applied successfully',
      result,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTrackerPolicySettings = async (req, res) => {
  try {
    const policy = await getTrackerPolicySettingsService();

    return res.status(200).json({
      success: true,
      policy,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTrackerPolicySettings = async (req, res) => {
  try {
    const policy = await updateTrackerPolicySettingsService({
      payload: req.body,
      updatedBy: req.user.user_key,
    });

    return res.status(200).json({
      success: true,
      message: 'Tracker policy updated successfully',
      policy,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminMentorEffectiveness = async (req, res) => {
  try {
    const { q = '', page: pageStr = '1', pageSize: pageSizeStr = '50' } = req.query;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr, 10) || 50));
    const result = await getMentorEffectivenessGridService({ q: String(q).trim(), page, pageSize });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminMentorEffectivenessDetail = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const detail = await getMentorEffectivenessDetailService(mentorId);

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found or no review data available',
      });
    }

    return res.status(200).json({
      success: true,
      detail,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const exportAdminMentorEffectiveness = async (req, res) => {
  try {
    const { format } = req.query;

    if (!format || !['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or json.',
      });
    }

    let data, contentType, filename;

    if (format === 'csv') {
      data = await exportMentorEffectivenessServiceCSV();
      contentType = 'text/csv';
      filename = `mentor-effectiveness-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      data = await exportMentorEffectivenessServiceJSON();
      data = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename = `mentor-effectiveness-${new Date().toISOString().split('T')[0]}.json`;
    }

    return res
      .set('Content-Type', contentType)
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .send(data);
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminStudentLearning = async (req, res) => {
  try {
    const { q = '', page: pageStr = '1', pageSize: pageSizeStr = '50' } = req.query;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr, 10) || 50));
    const result = await getStudentLearningRosterService({ q: String(q).trim(), page, pageSize });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminStudentLearningDetail = async (req, res) => {
  try {
    const { projectId, studentKey } = req.params;
    const detail = await getStudentLearningDetailService(projectId, studentKey);

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Student learning detail not found',
      });
    }

    return res.status(200).json({
      success: true,
      detail,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const exportAdminStudentLearning = async (req, res) => {
  try {
    const { format } = req.query;

    if (!format || !['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or json.',
      });
    }

    let data;
    let contentType;
    let filename;

    if (format === 'csv') {
      data = await exportStudentLearningServiceCSV();
      contentType = 'text/csv';
      filename = `student-learning-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      data = await exportStudentLearningServiceJSON();
      data = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename = `student-learning-${new Date().toISOString().split('T')[0]}.json`;
    }

    return res
      .set('Content-Type', contentType)
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .send(data);
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEscalationDetail = async (req, res) => {
  try {
    const detail = await getEscalationDetailService(req.params.escalationId);
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Escalation not found',
      });
    }

    return res.status(200).json({
      success: true,
      ...detail,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateEscalationFollowUp = async (req, res) => {
  try {
    const updated = await updateEscalationFollowUpService(
      req.params.escalationId,
      req.body,
      req.user.user_key
    );

    return res.status(200).json({
      success: true,
      message: 'Escalation follow-up updated successfully',
      ...updated,
    });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const createDailyLogEntry = async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await createDailyLogEntryService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      payload: req.body,
    });

    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyLogs = async (req, res) => {
  try {
    const { projectId } = req.params;
    const logs = await getDailyLogsService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTodayDailyLog = async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await getTodayDailyLogService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyLogSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const summary = await getDailyLogSummaryService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyScores = async (req, res) => {
  try {
    const { projectId } = req.params;
    const scores = await getMyScoresService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, scores });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectScores = async (req, res) => {
  try {
    const { projectId } = req.params;
    const scores = await getProjectScoresService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, scores });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const recalculateProjectScore = async (req, res) => {
  try {
    const { projectId } = req.params;
    const score = await recalculateProjectScoreService({
      projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      studentUserKey: req.body?.student_user_key,
    });

    return res.status(200).json({ success: true, score });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const createMentorFeedback = async (req, res) => {
  try {
    const feedback = await createMentorFeedbackService({
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      payload: req.body,
    });

    return res.status(201).json({ success: true, feedback });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyMentorFeedback = async (req, res) => {
  try {
    const feedback = await getMyMentorFeedbackService({
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, feedback });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const replyToMentorFeedback = async (req, res) => {
  try {
    const updated = await replyToMentorFeedbackService({
      feedbackId: req.params.id,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      reply: req.body?.student_reply,
    });

    return res.status(200).json({ success: true, feedback: updated });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const markMentorFeedbackRead = async (req, res) => {
  try {
    const updated = await markMentorFeedbackReadService({
      feedbackId: req.params.id,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, feedback: updated });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const ingestGithubWebhook = async (req, res) => {
  try {
    const result = await ingestGithubWebhookService({
      projectId: req.params.projectId,
      payload: req.body,
      rawBody: req.rawBody,
      signatureHeader: req.headers['x-hub-signature-256'],
      githubEvent: req.headers['x-github-event'],
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectGithubCommits = async (req, res) => {
  try {
    const commits = await getProjectGithubCommitsService({
      projectId: req.params.projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, commits });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProjectGithubConfig = async (req, res) => {
  try {
    const config = await updateProjectGithubConfigService({
      projectId: req.params.projectId,
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      payload: req.body,
    });

    return res.status(200).json({ success: true, config });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserGithubUsername = async (req, res) => {
  try {
    const user = await updateUserGithubUsernameService({
      targetUserKey: req.params.userKey,
      githubUsername: req.body?.github_username,
      actorRole: req.user.role,
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyGithubIdentity = async (req, res) => {
  try {
    const user = await getMyGithubIdentityService({
      actorUserKey: req.user.user_key,
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const startGithubOAuth = async (req, res) => {
  try {
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const payload = await createGithubOAuthStartUrlService({
      actorUserKey: req.user.user_key,
      actorRole: req.user.role,
      apiBaseUrl,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    return res.status(resolveTrackerStatusCode(error, 400)).json({
      success: false,
      message: error.message,
    });
  }
};

export const completeGithubOAuthCallback = async (req, res) => {
  const frontendBaseUrl = String(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const redirectUrl = new URL(`${frontendBaseUrl}/progress`);

  try {
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const linked = await completeGithubOAuthCallbackService({
      code: req.query?.code,
      state: req.query?.state,
      apiBaseUrl,
    });

    redirectUrl.searchParams.set('github_linked', 'success');
    redirectUrl.searchParams.set('github_username', String(linked.github_username || ''));
    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    redirectUrl.searchParams.set('github_linked', 'failed');
    redirectUrl.searchParams.set('reason', String(error?.message || 'OAuth failed'));
    return res.redirect(302, redirectUrl.toString());
  }
};
