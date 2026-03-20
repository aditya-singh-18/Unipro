import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { sanitizeRequestBody } from '../middlewares/sanitize.middleware.js';
import {
  bootstrapProjectWeeks,
  getProjectWeeks,
  getMentorReviewQueue,
  updateWeekStatus,
  createWeekSubmission,
  getWeekDraft,
  saveWeekDraft,
  resubmitWeekSubmission,
  getWeekSubmissions,
  createSubmissionFile,
  getSubmissionFiles,
  reviewSubmission,
  getWeekReviews,
  createProjectTask,
  getProjectTasks,
  updateTaskStatus,
  getProjectTimeline,
  getCurrentRisk,
  recalculateRisk,
  getCurrentHealth,
  recalculateHealth,
  getStudentDashboard,
  getMentorDashboard,
  getAdminDashboard,
  getAdminComplianceBoard,
  getProjectStatusHistory,
  getAdminEscalationBoard,
  getAdminMentorLoadTrends,
  getAdminDepartmentLeaderboard,
  getGovernanceExport,
  getProgressReportExport,
  applyAdminEscalationBatchAction,
  getTrackerPolicySettings,
  updateTrackerPolicySettings,
  getAdminMentorEffectiveness,
  getAdminMentorEffectivenessDetail,
  exportAdminMentorEffectiveness,
  getAdminStudentLearning,
  getAdminStudentLearningDetail,
  exportAdminStudentLearning,
  getEscalationDetail,
  updateEscalationFollowUp,
  uploadSubmissionFile,
} from '../controllers/tracker.controller.js';
import {
  createDailyLog,
  getDailyLogs,
  deleteDailyLog,
  calculateProgressScore,
  getProgressScores,
  getLatestProgressScore,
  createGithubCommit,
  getGithubCommits,
  createMentorFeedback,
  getMentorFeedback,
  markFeedbackAsRead,
  replyToFeedback,
} from '../controllers/protrackEnhancement.controller.js';

const router = express.Router();

router.post(
  '/upload',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  uploadSingle,
  uploadSubmissionFile
);

router.post(
  '/projects/:projectId/weeks/bootstrap',
  authenticate,
  allowRoles('ADMIN'),
  bootstrapProjectWeeks
);

router.get(
  '/projects/:projectId/weeks',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getProjectWeeks
);

router.get(
  '/mentor/review-queue',
  authenticate,
  allowRoles('MENTOR'),
  getMentorReviewQueue
);

router.patch(
  '/weeks/:weekId/status',
  authenticate,
  allowRoles('ADMIN'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([{ name: 'reason', type: 'string' }]),
  updateWeekStatus
);

router.post(
  '/weeks/:weekId/submissions',
  authenticate,
  allowRoles('STUDENT'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([
    { name: 'summaryOfWork', type: 'string' },
    { name: 'blockers', type: 'string' },
    { name: 'nextWeekPlan', type: 'string' },
    { name: 'githubLinkSnapshot', type: 'url' },
  ]),
  createWeekSubmission
);

router.get(
  '/weeks/:weekId/draft',
  authenticate,
  allowRoles('STUDENT'),
  getWeekDraft
);

router.put(
  '/weeks/:weekId/draft',
  authenticate,
  allowRoles('STUDENT'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([
    { name: 'summaryOfWork', type: 'string' },
    { name: 'blockers', type: 'string' },
    { name: 'nextWeekPlan', type: 'string' },
    { name: 'githubLinkSnapshot', type: 'url' },
  ]),
  saveWeekDraft
);

router.post(
  '/weeks/:weekId/submissions/resubmit',
  authenticate,
  allowRoles('STUDENT'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([
    { name: 'summaryOfWork', type: 'string' },
    { name: 'blockers', type: 'string' },
    { name: 'nextWeekPlan', type: 'string' },
    { name: 'githubLinkSnapshot', type: 'url' },
  ]),
  resubmitWeekSubmission
);

router.get(
  '/weeks/:weekId/submissions',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getWeekSubmissions
);

router.post(
  '/submissions/:submissionId/files',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([
    { name: 'fileName', type: 'string' },
    { name: 'fileUrl', type: 'url' },
    { name: 'mimeType', type: 'string' },
  ]),
  createSubmissionFile
);

router.get(
  '/submissions/:submissionId/files',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getSubmissionFiles
);

router.post(
  '/submissions/:submissionId/review',
  authenticate,
  allowRoles('MENTOR'),
  // SECURITY: Input sanitized by sanitize middleware before reaching service layer
  sanitizeRequestBody([{ name: 'reviewComment', type: 'string' }]),
  reviewSubmission
);

router.get(
  '/weeks/:weekId/reviews',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getWeekReviews
);

router.post(
  '/projects/:projectId/tasks',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  createProjectTask
);

router.get(
  '/projects/:projectId/tasks',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getProjectTasks
);

router.patch(
  '/tasks/:taskId/status',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  updateTaskStatus
);

router.get(
  '/projects/:projectId/timeline',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getProjectTimeline
);

router.get(
  '/projects/:projectId/status-history',
  authenticate,
  allowRoles('ADMIN'),
  getProjectStatusHistory
);

router.get(
  '/projects/:projectId/risk/current',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getCurrentRisk
);

router.post(
  '/projects/:projectId/risk/recalculate',
  authenticate,
  allowRoles('MENTOR', 'ADMIN'),
  recalculateRisk
);

router.get(
  '/projects/:projectId/health/current',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getCurrentHealth
);

router.post(
  '/projects/:projectId/health/recalculate',
  authenticate,
  allowRoles('MENTOR', 'ADMIN'),
  recalculateHealth
);

router.get(
  '/dashboard/student',
  authenticate,
  allowRoles('STUDENT'),
  getStudentDashboard
);

router.get(
  '/dashboard/mentor',
  authenticate,
  allowRoles('MENTOR'),
  getMentorDashboard
);

router.get(
  '/dashboard/admin',
  authenticate,
  allowRoles('ADMIN'),
  getAdminDashboard
);

router.get(
  '/dashboard/admin/compliance',
  authenticate,
  allowRoles('ADMIN'),
  getAdminComplianceBoard
);

router.get(
  '/dashboard/admin/escalations',
  authenticate,
  allowRoles('ADMIN'),
  getAdminEscalationBoard
);

router.post(
  '/dashboard/admin/escalations/batch-action',
  authenticate,
  allowRoles('ADMIN'),
  applyAdminEscalationBatchAction
);

router.get(
  '/dashboard/admin/mentor-load',
  authenticate,
  allowRoles('ADMIN'),
  getAdminMentorLoadTrends
);

router.get(
  '/dashboard/admin/departments',
  authenticate,
  allowRoles('ADMIN'),
  getAdminDepartmentLeaderboard
);

router.get(
  '/dashboard/admin/governance-export',
  authenticate,
  allowRoles('ADMIN'),
  getGovernanceExport
);

router.get(
  '/dashboard/admin/progress-report/export',
  authenticate,
  allowRoles('ADMIN'),
  getProgressReportExport
);

router.get(
  '/admin/policy',
  authenticate,
  allowRoles('ADMIN'),
  getTrackerPolicySettings
);

router.put(
  '/admin/policy',
  authenticate,
  allowRoles('ADMIN'),
  updateTrackerPolicySettings
);

router.get(
  '/dashboard/admin/mentor-effectiveness',
  authenticate,
  allowRoles('ADMIN'),
  getAdminMentorEffectiveness
);

router.get(
  '/dashboard/admin/mentor-effectiveness/:mentorId',
  authenticate,
  allowRoles('ADMIN'),
  getAdminMentorEffectivenessDetail
);

router.get(
  '/dashboard/admin/mentor-effectiveness/export',
  authenticate,
  allowRoles('ADMIN'),
  exportAdminMentorEffectiveness
);

router.get(
  '/dashboard/admin/student-learning',
  authenticate,
  allowRoles('ADMIN'),
  getAdminStudentLearning
);

router.get(
  '/dashboard/admin/student-learning/:projectId/:studentKey',
  authenticate,
  allowRoles('ADMIN'),
  getAdminStudentLearningDetail
);

router.get(
  '/dashboard/admin/student-learning/export',
  authenticate,
  allowRoles('ADMIN'),
  exportAdminStudentLearning
);

router.get(
  '/escalations/:escalationId',
  authenticate,
  allowRoles('ADMIN'),
  getEscalationDetail
);

router.patch(
  '/escalations/:escalationId/follow-up',
  authenticate,
  allowRoles('ADMIN'),
  updateEscalationFollowUp
);

// ============================================================
// PROTRACK ENHANCEMENT ROUTES
// ============================================================

// Daily Logs Routes
router.post(
  '/projects/:projectId/daily-logs',
  authenticate,
  allowRoles('STUDENT'),
  sanitizeRequestBody([
    { name: 'whatIDid', type: 'string' },
    { name: 'whatIWillDo', type: 'string' },
    { name: 'blockers', type: 'string' },
    { name: 'tag', type: 'string' },
    { name: 'commitLink', type: 'url' },
  ]),
  createDailyLog
);

router.get(
  '/projects/:projectId/daily-logs',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getDailyLogs
);

router.delete(
  '/daily-logs/:logId',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  deleteDailyLog
);

// Progress Scores Routes
router.post(
  '/projects/:projectId/progress-scores/calculate',
  authenticate,
  allowRoles('MENTOR', 'ADMIN'),
  sanitizeRequestBody([
    { name: 'studentUserKey', type: 'string' },
  ]),
  calculateProgressScore
);

router.get(
  '/projects/:projectId/progress-scores',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getProgressScores
);

router.get(
  '/projects/:projectId/progress-scores/latest/:studentUserKey',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getLatestProgressScore
);

// GitHub Commits Routes
router.post(
  '/projects/:projectId/github-commits',
  authenticate,
  allowRoles('MENTOR', 'ADMIN'),
  sanitizeRequestBody([
    { name: 'studentUserKey', type: 'string' },
    { name: 'sha', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'branch', type: 'string' },
  ]),
  createGithubCommit
);

router.get(
  '/projects/:projectId/github-commits',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getGithubCommits
);

// Mentor Feedback Routes
router.post(
  '/projects/:projectId/mentor-feedback',
  authenticate,
  allowRoles('MENTOR'),
  sanitizeRequestBody([
    { name: 'studentUserKey', type: 'string' },
    { name: 'referenceType', type: 'string' },
    { name: 'referenceId', type: 'string' },
    { name: 'message', type: 'string' },
  ]),
  createMentorFeedback
);

router.get(
  '/projects/:projectId/mentor-feedback',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  getMentorFeedback
);

router.patch(
  '/mentor-feedback/:feedbackId/read',
  authenticate,
  allowRoles('STUDENT'),
  markFeedbackAsRead
);

router.patch(
  '/mentor-feedback/:feedbackId/reply',
  authenticate,
  allowRoles('STUDENT'),
  sanitizeRequestBody([
    { name: 'studentReply', type: 'string' },
  ]),
  replyToFeedback
);

export default router;
