import { isMemberExists } from '../repositories/team.repo.js';
import { getTeamMembers } from '../repositories/team.repo.js';
import { findUserByEnrollmentId } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';
import PDFDocument from 'pdfkit';
import {
  getProjectById,
  setProjectGithubRepoUrlIfEmpty,
  bootstrapProjectWeeks,
  getWeeksByProjectId,
  getWeekById,
  updateWeekStatus,
  getNextSubmissionRevision,
  createWeekSubmission,
  getWeekSubmissions,
  getSubmissionById,
  getNextSubmissionFileVersion,
  createSubmissionFile,
  getSubmissionFiles,
  countSubmissionFiles,
  createWeekReview,
  getWeekReviews,
  createTask,
  getTasksByProject,
  getTaskById,
  updateTaskStatus,
  createTimelineEvent,
  getProjectTimeline,
  getMentorReviewQueue,
  getLatestRiskSnapshot,
  getLatestHealthSnapshot,
  createRiskSnapshot,
  createHealthSnapshot,
  getProjectOperationalMetrics,
  getStudentDashboardStats,
  getMentorDashboardStats,
  getAdminDashboardStats,
  getAdminComplianceBoard,
  getLatestProjectStatusLogs,
  getProjectStatusHistoryFromTimeline,
  getProjectStatusHistoryFromLegacyLogs,
  getAdminEscalationQueue,
  getAdminMentorLoadTrends,
  getAdminDepartmentLeaderboard,
  getWeekDraft,
  upsertWeekDraft,
  deleteWeekDraft,
  getProgressReportRows,
} from '../repositories/tracker.repo.js';
import { getTrackerPolicySettingsService } from './trackerPolicy.service.js';
import {
  TASK_PRIORITIES,
  TASK_STATES,
  WEEK_STATES,
  normalizeReviewQueueParams,
  isValidWeekTransition,
  isValidTaskTransition,
} from '../validators/tracker.validator.js';
import { getAdminSystemSettingsService } from './systemSettings.service.js';
import { sanitizeUrl } from '../middlewares/sanitize.middleware.js';

const assertWeekExists = async (weekId) => {
  const week = await getWeekById(weekId);
  if (!week) {
    throw new Error('Week not found');
  }
  return week;
};

const DAY_TO_DOW = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DOW_TO_DAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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

const assertWeekEditable = ({ week, systemSettings }) => {
  if (week.status === 'locked' || week.status === 'missed') {
    throw new Error('This week is locked and cannot be edited');
  }

  const deadlineMs = week.deadline_at ? new Date(week.deadline_at).getTime() : null;
  if (!deadlineMs || Number.isNaN(deadlineMs)) {
    return;
  }

  const nowMs = Date.now();
  if (deadlineMs >= nowMs) {
    return;
  }

  if (!systemSettings.allow_late_submission) {
    throw new Error('Submission deadline has passed for this week');
  }

  if (systemSettings.auto_lock_week_after_deadline) {
    throw new Error('Late submissions are blocked because auto-lock-after-deadline is enabled');
  }

  if (systemSettings.grace_enabled) {
    const graceMs = Number(systemSettings.grace_period_hours || 0) * 60 * 60 * 1000;
    if (nowMs > deadlineMs + graceMs) {
      throw new Error('Grace period has ended for this week');
    }
  }
};

const validatePhasePlan = (phasePlan) => {
  if (!Array.isArray(phasePlan)) return;

  for (const item of phasePlan) {
    if (!item?.phase_name || !item?.start_week || !item?.end_week) {
      throw new Error('Each phasePlan item must include phase_name, start_week, end_week');
    }
  }
};

const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?github\.com\//i.test(raw)) return `https://${raw}`;
  return raw;
};

const isValidGithubRepoUrl = (value) => {
  if (!value) return false;
  return /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(value);
};

const parseGithubReference = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = String(url.hostname || '').toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      return null;
    }

    const segments = String(url.pathname || '')
      .split('/')
      .filter(Boolean);

    if (segments.length < 2) {
      return null;
    }

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, '');
    const commitSha =
      segments[2] === 'commit' && /^[a-f0-9]{7,40}$/i.test(String(segments[3] || ''))
        ? segments[3]
        : null;

    return { owner, repo, commitSha };
  } catch {
    return null;
  }
};

const githubApiRequest = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'unipro-tracker-validator',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return await fetch(`https://api.github.com${path}`, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const assertGithubReferenceIsValid = async (value) => {
  const parsed = parseGithubReference(value);
  if (!parsed) {
    throw new Error('Please provide a valid GitHub link.');
  }

  const repoRes = await githubApiRequest(`/repos/${parsed.owner}/${parsed.repo}`);

  if (repoRes.status === 404) {
    throw new Error('GitHub repository not found. Please check owner/repo URL.');
  }

  if (!repoRes.ok) {
    throw new Error('Unable to verify GitHub link right now. Please retry in a few seconds.');
  }

  if (parsed.commitSha) {
    const commitRes = await githubApiRequest(
      `/repos/${parsed.owner}/${parsed.repo}/commits/${parsed.commitSha}`
    );

    if (commitRes.status === 404) {
      throw new Error('GitHub commit not found for the provided link.');
    }

    if (!commitRes.ok) {
      throw new Error('Unable to verify GitHub commit right now. Please retry in a few seconds.');
    }

    return;
  }

  const commitsRes = await githubApiRequest(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`);

  if (!commitsRes.ok) {
    throw new Error('Unable to verify GitHub repository commits right now. Please retry in a few seconds.');
  }

  const commits = await commitsRes.json();
  if (!Array.isArray(commits) || commits.length === 0) {
    throw new Error('GitHub repository has no commits yet. Please share a repository with commits.');
  }
};

const notifyProjectMembersForWeeklyReview = async ({
  projectId,
  weekNumber,
  action,
  mentorComment,
}) => {
  const teamMembers = await getTeamMembers(projectId);

  for (const member of teamMembers) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (!user?.user_key) {
      continue;
    }

    const isApproved = action === 'approve';
    await pushNotification({
      userKey: user.user_key,
      role: 'student',
      title: isApproved ? 'Weekly update approved' : 'Weekly update needs revision',
      message: isApproved
        ? `Week ${weekNumber} tracker submission was approved by your mentor.`
        : `Week ${weekNumber} tracker submission was rejected. ${mentorComment || 'Please review mentor feedback and resubmit.'}`,
    });
  }
};

export const bootstrapProjectWeeksService = async ({
  projectId,
  totalWeeks,
  startDate,
  phasePlan,
  actorUserKey,
  actorRole,
}) => {
  const systemSettings = await getAdminSystemSettingsService();

  if (!projectId) {
    throw new Error('projectId is required');
  }

  const resolvedTotalWeeks = Number(totalWeeks || systemSettings.total_project_weeks);
  const resolvedStartDate =
    startDate ||
    systemSettings.project_start_date ||
    new Date().toISOString().slice(0, 10);

  if (resolvedTotalWeeks < 1 || resolvedTotalWeeks > 52) {
    throw new Error('totalWeeks must be between 1 and 52');
  }

  validatePhasePlan(phasePlan || []);
  await assertProjectExists(projectId);

  const weeks = await bootstrapProjectWeeks({
    projectId,
    totalWeeks: resolvedTotalWeeks,
    startDate: resolvedStartDate,
    phasePlan: phasePlan || [],
    daysPerWeek: Number(systemSettings.days_per_week || 7),
    deadlineTime: String(systemSettings.deadline_time || '23:59:00'),
    deadlineDayDow:
      DAY_TO_DOW[String(systemSettings.deadline_day || '').toLowerCase()] ?? null,
  });

  await createTimelineEvent({
    projectId,
    weekId: null,
    eventType: 'week_created',
    actorUserKey,
    actorRole,
    meta: {
      totalWeeks: resolvedTotalWeeks,
      startDate: resolvedStartDate,
      daysPerWeek: Number(systemSettings.days_per_week || 7),
      deadlineTime: String(systemSettings.deadline_time || '23:59:00'),
      deadlineDay: String(systemSettings.deadline_day || 'sunday').toLowerCase(),
    },
  });

  return weeks;
};

export const getProjectWeeksService = async ({ projectId, userKey, role }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });
  return await getWeeksByProjectId(projectId);
};

export const getMentorReviewQueueService = async ({
  mentorEmployeeId,
  role,
  sortBy,
  order,
  riskLevel,
  page,
  pageSize,
}) => {
  if (!mentorEmployeeId) {
    throw new Error('mentorEmployeeId is required');
  }

  if (role?.toUpperCase() !== 'MENTOR') {
    throw new Error('Only mentor can access review queue');
  }

  const normalized = normalizeReviewQueueParams({ sortBy, order, riskLevel, page, pageSize });
  const offset = (normalized.page - 1) * normalized.pageSize;

  const result = await getMentorReviewQueue({
    mentorEmployeeId,
    sortBy: normalized.sortBy,
    order: normalized.order,
    riskLevel: normalized.riskLevel,
    limit: normalized.pageSize,
    offset,
  });

  return {
    items: result.items,
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: result.total,
  };
};

export const updateWeekStatusService = async ({
  weekId,
  status,
  reason,
  actorUserKey,
  actorRole,
}) => {
  if (!weekId || !status) {
    throw new Error('weekId and status are required');
  }

  const normalizedStatus = String(status).toLowerCase();
  if (!WEEK_STATES.includes(normalizedStatus)) {
    throw new Error('Invalid week status');
  }

  const week = await assertWeekExists(weekId);
  const systemSettings = await getAdminSystemSettingsService();

  const isUnlockAttempt =
    ['locked', 'missed'].includes(String(week.status || '').toLowerCase()) &&
    !['locked', 'missed'].includes(normalizedStatus);

  if (isUnlockAttempt && !systemSettings.allow_admin_unlock_week) {
    throw new Error('Week unlock is currently disabled by admin settings');
  }

  if (week.status !== normalizedStatus && !isValidWeekTransition(week.status, normalizedStatus)) {
    throw new Error(`Invalid week transition from ${week.status} to ${normalizedStatus}`);
  }

  const updated = await updateWeekStatus({ weekId: week.week_id, status: normalizedStatus });

  await createTimelineEvent({
    projectId: week.project_id,
    weekId: week.week_id,
    eventType: 'week_status_overridden',
    actorUserKey,
    actorRole,
    meta: {
      from_status: week.status,
      to_status: normalizedStatus,
      reason: reason || null,
    },
  });

  return updated;
};

export const createWeekSubmissionService = async ({
  weekId,
  summaryOfWork,
  blockers,
  nextWeekPlan,
  githubLinkSnapshot,
  githubRepoUrl,
  userKey,
  role,
  isResubmission = false,
}) => {
  const systemSettings = await getAdminSystemSettingsService();
  if (!systemSettings.enable_weekly_submissions) {
    throw new Error('Weekly submissions are currently disabled by admin');
  }

  if (!weekId || !summaryOfWork) {
    throw new Error('weekId and summaryOfWork are required');
  }

  const week = await assertWeekExists(weekId);
  await assertProjectAccess({ projectId: week.project_id, userKey, role });
  assertWeekEditable({ week, systemSettings });

  const allowedDays = new Set(
    (Array.isArray(systemSettings.submission_allowed_days)
      ? systemSettings.submission_allowed_days
      : []
    )
      .map((day) => String(day || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const today = DOW_TO_DAY[new Date().getDay()];
  if (allowedDays.size && !allowedDays.has(today)) {
    throw new Error(
      `Submissions are not allowed on ${today}. Allowed days: ${Array.from(allowedDays).join(', ')}`
    );
  }

  if (Number(week.week_number) > Number(systemSettings.total_submission_weeks)) {
    throw new Error(
      `Weekly submission is not allowed beyond configured submission weeks (${systemSettings.total_submission_weeks})`
    );
  }

  const requiredFields = new Set(
    (Array.isArray(systemSettings.required_submission_fields)
      ? systemSettings.required_submission_fields
      : []
    )
      .map((field) => String(field || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (!isResubmission && week.status !== 'pending') {
    throw new Error(`New submission is allowed only in pending state. Current state: ${week.status}`);
  }

  if (isResubmission && week.status !== 'rejected') {
    throw new Error(`Resubmission is allowed only in rejected state. Current state: ${week.status}`);
  }

  if (isResubmission && !systemSettings.allow_resubmission) {
    throw new Error('Resubmission is currently disabled by admin');
  }

  const project = await assertProjectExists(week.project_id);
  const normalizedGithubRepoUrl = normalizeUrl(githubRepoUrl);
  const normalizedGithubSnapshot = normalizeUrl(githubLinkSnapshot);
  const hasPermanentRepo = Boolean(String(project.github_repo_url || '').trim());

  if (requiredFields.has('blockers') && !String(blockers || '').trim()) {
    throw new Error('Blockers field is required by admin settings');
  }

  if (requiredFields.has('next_week_plan') && !String(nextWeekPlan || '').trim()) {
    throw new Error('Next week plan is required by admin settings');
  }

  if (
    requiredFields.has('github_repository_link') &&
    !normalizedGithubRepoUrl &&
    !normalizedGithubSnapshot &&
    !hasPermanentRepo
  ) {
    throw new Error('GitHub repository link is required by admin settings');
  }

  const isRepoCaptureWeek = week.week_number === 2 || week.week_number === 3;

  if (!hasPermanentRepo && isRepoCaptureWeek && !normalizedGithubRepoUrl) {
    throw new Error('GitHub repository link is required in week 2 or week 3.');
  }

  if (normalizedGithubRepoUrl && !isValidGithubRepoUrl(normalizedGithubRepoUrl)) {
    throw new Error('Please provide a valid GitHub repository URL (example: https://github.com/org/repo).');
  }

  if (normalizedGithubRepoUrl) {
    await assertGithubReferenceIsValid(normalizedGithubRepoUrl);
  }

  if (normalizedGithubSnapshot) {
    await assertGithubReferenceIsValid(normalizedGithubSnapshot);
  }

  if (!hasPermanentRepo && normalizedGithubRepoUrl) {
    const updatedProject = await setProjectGithubRepoUrlIfEmpty({
      projectId: week.project_id,
      githubRepoUrl: normalizedGithubRepoUrl,
    });

    if (updatedProject?.github_repo_url) {
      await createTimelineEvent({
        projectId: week.project_id,
        weekId: week.week_id,
        eventType: 'project_repo_linked',
        actorUserKey: userKey,
        actorRole: role,
        meta: {
          github_repo_url: updatedProject.github_repo_url,
          captured_in_week: week.week_number,
        },
      });
    }
  }

  const revisionNo = await getNextSubmissionRevision(week.week_id);

  if (isResubmission) {
    const maxResubmissions = Number(systemSettings.max_resubmissions);
    const usedResubmissions = Math.max(0, revisionNo - 2);

    if (usedResubmissions >= maxResubmissions) {
      throw new Error(`Maximum resubmission limit reached (${maxResubmissions})`);
    }
  }

  const submission = await createWeekSubmission({
    weekId: week.week_id,
    projectId: week.project_id,
    revisionNo,
    userKey,
    summaryOfWork,
    blockers,
    nextWeekPlan,
    githubLinkSnapshot: normalizedGithubSnapshot,
  });

  if (!isValidWeekTransition(week.status, 'submitted')) {
    throw new Error(`Invalid week transition from ${week.status} to submitted`);
  }

  await updateWeekStatus({ weekId: week.week_id, status: 'submitted' });

  const deadlineMs = week.deadline_at ? new Date(week.deadline_at).getTime() : null;
  const submittedMs = submission.submitted_at ? new Date(submission.submitted_at).getTime() : Date.now();
  const isLateSubmission =
    Number.isFinite(deadlineMs) && Number.isFinite(submittedMs) ? submittedMs > deadlineMs : false;
  const lateHours = isLateSubmission
    ? Number((((submittedMs - deadlineMs) / (1000 * 60 * 60))).toFixed(2))
    : 0;

  await createTimelineEvent({
    projectId: week.project_id,
    weekId: week.week_id,
    eventType: isResubmission ? 'submission_resubmitted' : 'submission_created',
    actorUserKey: userKey,
    actorRole: role,
    meta: {
      submission_id: submission.submission_id,
      revision_no: submission.revision_no,
      is_late_submission: isLateSubmission,
      late_by_hours: lateHours,
      late_submission_penalty_percent: isLateSubmission
        ? Number(systemSettings.late_submission_penalty_percent)
        : 0,
    },
  });

  await deleteWeekDraft({ weekId: week.week_id, authorUserKey: userKey });

  return {
    ...submission,
    is_late_submission: isLateSubmission,
    late_by_hours: lateHours,
    late_submission_penalty_percent: isLateSubmission
      ? Number(systemSettings.late_submission_penalty_percent)
      : 0,
  };
};

export const getWeekDraftService = async ({ weekId, userKey, role }) => {
  const week = await assertWeekExists(weekId);
  await assertProjectAccess({ projectId: week.project_id, userKey, role });

  const draft = await getWeekDraft({ weekId: week.week_id, authorUserKey: userKey });

  return (
    draft || {
      week_id: week.week_id,
      author_user_key: userKey,
      draft_data: {
        summaryOfWork: '',
        blockers: '',
        nextWeekPlan: '',
        githubLinkSnapshot: '',
      },
      saved_at: null,
    }
  );
};

export const saveWeekDraftService = async ({
  weekId,
  summaryOfWork,
  blockers,
  nextWeekPlan,
  githubLinkSnapshot,
  userKey,
  role,
}) => {
  const systemSettings = await getAdminSystemSettingsService();
  const week = await assertWeekExists(weekId);
  await assertProjectAccess({ projectId: week.project_id, userKey, role });
  assertWeekEditable({ week, systemSettings });

  return await upsertWeekDraft({
    weekId: week.week_id,
    authorUserKey: userKey,
    draftData: {
      summaryOfWork: summaryOfWork || '',
      blockers: blockers || '',
      nextWeekPlan: nextWeekPlan || '',
      githubLinkSnapshot: githubLinkSnapshot || '',
    },
  });
};

export const getWeekSubmissionsService = async ({ weekId, userKey, role }) => {
  const week = await assertWeekExists(weekId);
  await assertProjectAccess({ projectId: week.project_id, userKey, role });
  return await getWeekSubmissions(week.week_id);
};

export const createSubmissionFileService = async ({
  submissionId,
  fileName,
  fileUrl,
  mimeType,
  fileSizeBytes,
  userKey,
  role,
}) => {
  if (!submissionId || !fileName || !fileUrl) {
    throw new Error('submissionId, fileName and fileUrl are required');
  }

  if (String(fileUrl).length > 500) {
    throw new Error('Invalid file URL. Maximum length is 500 characters.');
  }

  const sanitizedFileUrl = sanitizeUrl(fileUrl);
  if (!sanitizedFileUrl) {
    throw new Error('Invalid file URL. Only approved HTTPS domains are allowed.');
  }

  // SECURITY: Never fetch this URL server-side. Store only. Validate domain before storing.

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new Error('Submission not found');
  }

  const systemSettings = await getAdminSystemSettingsService();

  const ext = String(fileName || '').includes('.')
    ? String(fileName).split('.').pop().toLowerCase()
    : '';

  const extensionMimeMap = {
    pdf: ['application/pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ppt: ['application/vnd.ms-powerpoint'],
    pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    zip: ['application/zip', 'application/x-zip-compressed'],
    png: ['image/png'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
  };

  if (ext && mimeType && extensionMimeMap[ext] && !extensionMimeMap[ext].includes(String(mimeType).toLowerCase())) {
    throw new Error('Invalid file metadata. Extension does not match MIME type.');
  }

  const allowedExtensions = new Set(
    (Array.isArray(systemSettings.allowed_file_types) ? systemSettings.allowed_file_types : [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (allowedExtensions.size && ext && !allowedExtensions.has(ext)) {
    throw new Error(
      `File type .${ext} is not allowed. Allowed types: ${Array.from(allowedExtensions).join(', ')}`
    );
  }

  const maxBytes = Number(systemSettings.max_file_size_mb) * 1024 * 1024;
  if (Number(fileSizeBytes || 0) > maxBytes) {
    throw new Error(`File size exceeds maximum limit (${systemSettings.max_file_size_mb} MB)`);
  }

  const currentFileCount = await countSubmissionFiles(submission.submission_id);
  if (currentFileCount >= Number(systemSettings.max_files_per_submission)) {
    throw new Error(`Maximum files per submission reached (${systemSettings.max_files_per_submission})`);
  }

  await assertProjectAccess({ projectId: submission.project_id, userKey, role });

  const versionNo = await getNextSubmissionFileVersion(submission.submission_id, fileName);
  const file = await createSubmissionFile({
    submissionId: submission.submission_id,
    versionNo,
    fileName,
    fileUrl: sanitizedFileUrl,
    mimeType,
    fileSizeBytes,
    uploadedByUserKey: userKey,
  });

  await createTimelineEvent({
    projectId: submission.project_id,
    weekId: submission.week_id,
    eventType: 'submission_file_uploaded',
    actorUserKey: userKey,
    actorRole: role,
    meta: {
      submission_id: submission.submission_id,
      file_id: file.file_id,
      file_name: file.file_name,
      version_no: file.version_no,
    },
  });

  return file;
};

export const getSubmissionFilesService = async ({ submissionId, userKey, role }) => {
  if (!submissionId) {
    throw new Error('submissionId is required');
  }

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new Error('Submission not found');
  }

  await assertProjectAccess({ projectId: submission.project_id, userKey, role });
  return await getSubmissionFiles(submission.submission_id);
};

export const reviewSubmissionService = async ({
  submissionId,
  action,
  reviewComment,
  reviewerEmployeeId,
  role,
}) => {
  const systemSettings = await getAdminSystemSettingsService();

  if (!submissionId || !action) {
    throw new Error('submissionId and action are required');
  }

  const normalizedAction = action.toLowerCase();
  if (!['approve', 'reject'].includes(normalizedAction)) {
    throw new Error('action must be approve or reject');
  }

  if (normalizedAction === 'reject' && !reviewComment) {
    throw new Error('reviewComment is required when rejecting submission');
  }

  if (normalizedAction === 'approve') {
    const requiredFields = new Set(
      (Array.isArray(systemSettings.required_submission_fields)
        ? systemSettings.required_submission_fields
        : []
      )
        .map((field) => String(field || '').trim().toLowerCase())
        .filter(Boolean)
    );

    if (requiredFields.has('file_upload')) {
      const fileCount = await countSubmissionFiles(submissionId);
      if (fileCount < 1) {
        throw new Error('At least one file upload is required before approval as per admin settings');
      }
    }
  }

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new Error('Submission not found');
  }

  await assertProjectAccess({
    projectId: submission.project_id,
    userKey: reviewerEmployeeId,
    role,
  });

  const week = await assertWeekExists(submission.week_id);

  if (!['submitted', 'under_review'].includes(week.status)) {
    throw new Error(`Week is not in reviewable state. Current state: ${week.status}`);
  }

  if (week.status === 'submitted') {
    if (!isValidWeekTransition('submitted', 'under_review')) {
      throw new Error('Invalid week transition from submitted to under_review');
    }

    await updateWeekStatus({ weekId: submission.week_id, status: 'under_review' });

    await createTimelineEvent({
      projectId: submission.project_id,
      weekId: submission.week_id,
      eventType: 'review_started',
      actorUserKey: reviewerEmployeeId,
      actorRole: role,
      meta: {
        submission_id: submission.submission_id,
      },
    });
  }

  const review = await createWeekReview({
    submissionId: submission.submission_id,
    weekId: submission.week_id,
    projectId: submission.project_id,
    reviewerEmployeeId,
    action: normalizedAction,
    reviewComment,
  });

  const nextWeekStatus = normalizedAction === 'approve' ? 'approved' : 'rejected';

  if (!isValidWeekTransition('under_review', nextWeekStatus) && !isValidWeekTransition(week.status, nextWeekStatus)) {
    throw new Error(`Invalid week transition from ${week.status} to ${nextWeekStatus}`);
  }

  await updateWeekStatus({ weekId: submission.week_id, status: nextWeekStatus });

  await createTimelineEvent({
    projectId: submission.project_id,
    weekId: submission.week_id,
    eventType: normalizedAction === 'approve' ? 'review_approved' : 'review_rejected',
    actorUserKey: reviewerEmployeeId,
    actorRole: role,
    meta: {
      review_id: review.review_id,
      submission_id: submission.submission_id,
      action: normalizedAction,
    },
  });

  if (normalizedAction === 'approve' && systemSettings.auto_lock_week_after_review) {
    await updateWeekStatus({ weekId: submission.week_id, status: 'locked' });

    await createTimelineEvent({
      projectId: submission.project_id,
      weekId: submission.week_id,
      eventType: 'week_auto_locked_after_review',
      actorUserKey: reviewerEmployeeId,
      actorRole: role,
      meta: {
        submission_id: submission.submission_id,
        trigger_action: normalizedAction,
      },
    });
  }

  await notifyProjectMembersForWeeklyReview({
    projectId: submission.project_id,
    weekNumber: week.week_number,
    action: normalizedAction,
    mentorComment: reviewComment,
  });

  return review;
};

export const getWeekReviewsService = async ({ weekId, userKey, role }) => {
  const week = await assertWeekExists(weekId);
  await assertProjectAccess({ projectId: week.project_id, userKey, role });
  return await getWeekReviews(week.week_id);
};

export const createTaskService = async ({
  projectId,
  weekId,
  title,
  description,
  priority,
  assignedToUserKey,
  dueDate,
  createdByUserKey,
  role,
}) => {
  if (!projectId || !title) {
    throw new Error('projectId and title are required');
  }

  await assertProjectAccess({ projectId, userKey: createdByUserKey, role });

  const normalizedPriority = (priority || 'medium').toLowerCase();
  if (!TASK_PRIORITIES.includes(normalizedPriority)) {
    throw new Error(`priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
  }

  if (weekId) {
    const week = await assertWeekExists(weekId);
    if (week.project_id !== projectId) {
      throw new Error('Provided weekId does not belong to the project');
    }
  }

  const task = await createTask({
    projectId,
    weekId,
    title,
    description,
    priority: normalizedPriority,
    assignedToUserKey,
    dueDate,
    createdByUserKey,
  });

  await createTimelineEvent({
    projectId,
    weekId: weekId || null,
    eventType: 'task_created',
    actorUserKey: createdByUserKey,
    actorRole: role,
    meta: {
      task_id: task.task_id,
      status: task.status,
      priority: task.priority,
    },
  });

  return task;
};

export const getProjectTasksService = async ({
  projectId,
  status,
  assignedTo,
  weekId,
  userKey,
  role,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  if (status && !TASK_STATES.includes(status)) {
    throw new Error(`status must be one of: ${TASK_STATES.join(', ')}`);
  }

  return await getTasksByProject({ projectId, status, assignedTo, weekId });
};

export const updateTaskStatusService = async ({ taskId, status, userKey, role }) => {
  if (!taskId || !status) {
    throw new Error('taskId and status are required');
  }

  const normalizedStatus = status.toLowerCase();
  if (!TASK_STATES.includes(normalizedStatus)) {
    throw new Error(`status must be one of: ${TASK_STATES.join(', ')}`);
  }

  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  await assertProjectAccess({ projectId: task.project_id, userKey, role });

  if (task.status === 'done' && !['MENTOR', 'ADMIN'].includes(role?.toUpperCase())) {
    throw new Error('Done tasks can be reopened only by mentor or admin');
  }

  if (task.status !== normalizedStatus && !isValidTaskTransition(task.status, normalizedStatus)) {
    throw new Error(`Invalid task transition from ${task.status} to ${normalizedStatus}`);
  }

  const updated = await updateTaskStatus({ taskId, status: normalizedStatus });

  await createTimelineEvent({
    projectId: updated.project_id,
    weekId: updated.week_id,
    eventType: 'task_status_changed',
    actorUserKey: userKey,
    actorRole: role,
    meta: {
      task_id: updated.task_id,
      from_status: task.status,
      to_status: updated.status,
    },
  });

  return updated;
};

export const getProjectTimelineService = async ({
  projectId,
  eventType,
  page,
  pageSize,
  userKey,
  role,
}) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const offset = (safePage - 1) * safePageSize;

  return await getProjectTimeline({
    projectId,
    eventType,
    limit: safePageSize,
    offset,
  });
};

export const getCurrentRiskService = async ({ projectId, userKey, role }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });
  return await getLatestRiskSnapshot(projectId);
};

const toRate = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return Number(((Number(numerator || 0) / Number(denominator)) * 100).toFixed(2));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const recalculateRiskService = async ({ projectId, userKey, role }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  const metrics = await getProjectOperationalMetrics(projectId);
  if (!metrics) {
    throw new Error('Unable to compute project metrics');
  }

  const riskReasons = [];
  let score = 0;

  if (Number(metrics.overdue_open_weeks) > 0) {
    riskReasons.push('open_weeks_overdue');
    score += 45;
  }

  if (Number(metrics.blocked_tasks) > 0) {
    riskReasons.push('blocked_tasks_present');
    score += 25;
  }

  if (Number(metrics.rejected_weeks) > 0) {
    riskReasons.push('recent_rejections');
    score += 20;
  }

  if (Number(metrics.events_last_14_days) <= 2) {
    riskReasons.push('low_recent_activity');
    score += 15;
  }

  const riskLevel = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

  const snapshot = await createRiskSnapshot({
    projectId,
    riskLevel,
    riskReasons,
  });

  await createTimelineEvent({
    projectId,
    weekId: null,
    eventType: 'risk_level_changed',
    actorUserKey: userKey,
    actorRole: role,
    meta: {
      risk_level: snapshot.risk_level,
      risk_reasons: snapshot.risk_reasons,
    },
  });

  return snapshot;
};

export const getCurrentHealthService = async ({ projectId, userKey, role }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });
  return await getLatestHealthSnapshot(projectId);
};

export const recalculateHealthService = async ({ projectId, userKey, role }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  const metrics = await getProjectOperationalMetrics(projectId);
  if (!metrics) {
    throw new Error('Unable to compute project metrics');
  }

  const taskCompletionRate = toRate(metrics.done_tasks, metrics.total_tasks);
  const deadlineAdherenceRate = toRate(
    Number(metrics.total_weeks) - Number(metrics.overdue_open_weeks),
    metrics.total_weeks
  );
  const reviewAcceptanceRate = toRate(metrics.approved_reviews, metrics.total_reviews);
  const activitySignalScore = clamp((Number(metrics.events_last_14_days) / 10) * 100, 0, 100);

  const weightedScore =
    taskCompletionRate * 0.35 +
    deadlineAdherenceRate * 0.30 +
    reviewAcceptanceRate * 0.20 +
    activitySignalScore * 0.15;

  const healthScore = Number(clamp(weightedScore, 0, 100).toFixed(2));

  const snapshot = await createHealthSnapshot({
    projectId,
    healthScore,
    taskCompletionRate,
    deadlineAdherenceRate,
    reviewAcceptanceRate,
    activitySignalScore,
  });

  await createTimelineEvent({
    projectId,
    weekId: null,
    eventType: 'health_score_recalculated',
    actorUserKey: userKey,
    actorRole: role,
    meta: {
      health_score: snapshot.health_score,
      task_completion_rate: snapshot.task_completion_rate,
      deadline_adherence_rate: snapshot.deadline_adherence_rate,
      review_acceptance_rate: snapshot.review_acceptance_rate,
      activity_signal_score: snapshot.activity_signal_score,
    },
  });

  return snapshot;
};

export const getStudentDashboardService = async ({ userKey }) => {
  if (!userKey) {
    throw new Error('userKey is required');
  }

  return await getStudentDashboardStats(userKey);
};

export const getMentorDashboardService = async ({ userKey }) => {
  if (!userKey) {
    throw new Error('userKey is required');
  }

  return await getMentorDashboardStats(userKey);
};

export const getAdminDashboardService = async () => {
  return await getAdminDashboardStats();
};

const normalizeComplianceFilter = (value) => {
  const normalized = String(value || '').toLowerCase();
  return ['critical', 'warning', 'healthy'].includes(normalized) ? normalized : null;
};

const normalizePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const buildPredictiveWarning = (item) => {
  const reasons = [];
  let score = 0;

  if (Number(item.overdue_pending_count) > 0) {
    score += 35;
    reasons.push('overdue_pending_weeks');
  }

  if (Number(item.missed_week_count) > 0) {
    score += 20;
    reasons.push('missed_weeks_present');
  }

  if (Number(item.rejected_week_count) >= 2) {
    score += 20;
    reasons.push('repeated_rejections');
  } else if (Number(item.rejected_week_count) === 1) {
    score += 10;
    reasons.push('recent_rejection');
  }

  if (Number(item.review_pending_count) > 0) {
    score += 15;
    reasons.push('mentor_review_latency');
  }

  const healthScore = Number(item.health_score || 0);
  if (healthScore > 0 && healthScore < 50) {
    score += 20;
    reasons.push('low_health_score');
  } else if (healthScore >= 50 && healthScore < 70) {
    score += 10;
    reasons.push('moderate_health_score');
  }

  if (String(item.risk_level || 'low') === 'high') {
    score += 15;
    reasons.push('high_risk_snapshot');
  } else if (String(item.risk_level || 'low') === 'medium') {
    score += 8;
    reasons.push('medium_risk_snapshot');
  }

  const normalizedScore = Math.min(100, score);
  const priority = normalizedScore >= 70 ? 'high' : normalizedScore >= 40 ? 'medium' : 'low';

  return {
    predictive_warning_score: normalizedScore,
    predictive_warning_reasons: reasons,
    predictive_warning_priority: priority,
  };
};

const escapeCsv = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export const getAdminComplianceBoardService = async ({ complianceStatus, page, pageSize } = {}) => {
  const normalizedStatus = normalizeComplianceFilter(complianceStatus);
  const normalizedPage = normalizePositiveInt(page, 1);
  const normalizedPageSize = normalizePositiveInt(pageSize, 8);
  const offset = (normalizedPage - 1) * normalizedPageSize;

  const board = await getAdminComplianceBoard({
    complianceStatus: normalizedStatus,
    limit: normalizedPageSize,
    offset,
  });

  const statusLogs = await getLatestProjectStatusLogs(
    board.items.map((item) => String(item.project_id))
  );
  const statusLogByProject = new Map(
    statusLogs.map((row) => [String(row.project_id), row])
  );

  const enrichedItems = board.items.map((item) => {
    const latestStatusLog = statusLogByProject.get(String(item.project_id));
    return {
      ...item,
      ...buildPredictiveWarning(item),
      latest_status_old: latestStatusLog?.old_status || null,
      latest_status_new: latestStatusLog?.new_status || null,
      latest_status_changed_by: latestStatusLog?.changed_by || null,
      latest_status_reason: latestStatusLog?.reason || null,
      latest_status_changed_at: latestStatusLog?.created_at || null,
    };
  });

  return {
    summary: board.summary,
    items: enrichedItems,
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total: board.total,
    },
  };
};

export const getProjectStatusHistoryService = async ({ projectId, userKey, role, limit }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  await assertProjectAccess({ projectId, userKey, role });

  const normalizedLimit = Math.min(100, Math.max(5, Number(limit) || 25));

  const [timelineRows, legacyRows] = await Promise.all([
    getProjectStatusHistoryFromTimeline({ projectId, limit: normalizedLimit }),
    getProjectStatusHistoryFromLegacyLogs({ projectId, limit: normalizedLimit }),
  ]);

  const timelineMapped = timelineRows.map((row) => ({
    project_id: row.project_id,
    week_id: row.week_id,
    source: 'timeline',
    event_type: row.event_type,
    old_status: row.meta?.from_status || null,
    new_status: row.meta?.to_status || null,
    reason: row.meta?.reason || null,
    changed_by: row.actor_user_key || null,
    changed_role: row.actor_role || null,
    created_at: row.created_at,
  }));

  const legacyMapped = legacyRows.map((row) => ({
    project_id: row.project_id,
    week_id: null,
    source: 'project_status_logs',
    event_type: 'project_status_changed',
    old_status: row.old_status || null,
    new_status: row.new_status || null,
    reason: row.reason || null,
    changed_by: row.changed_by || null,
    changed_role: null,
    created_at: row.created_at,
  }));

  const merged = [...timelineMapped, ...legacyMapped]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, normalizedLimit);

  return merged;
};

export const getAdminEscalationBoardService = async ({ limit } = {}) => {
  const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 15));
  const policy = await getTrackerPolicySettingsService();
  const pendingOverdueHours = policy.escalation_pending_overdue_hours;
  const reviewOverdueHours = policy.escalation_review_overdue_hours;
  const criticalOverdueHours = policy.escalation_critical_overdue_hours;

  const items = await getAdminEscalationQueue({
    pendingOverdueHours,
    reviewOverdueHours,
    criticalOverdueHours,
    limit: normalizedLimit,
  });

  return {
    thresholds: {
      pendingOverdueHours,
      reviewOverdueHours,
      criticalOverdueHours,
    },
    count: items.length,
    items,
  };
};

export const getAdminMentorLoadTrendsService = async ({ limit } = {}) => {
  const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const items = await getAdminMentorLoadTrends({ limit: normalizedLimit });

  return {
    count: items.length,
    items,
  };
};

export const getAdminDepartmentLeaderboardService = async ({ limit } = {}) => {
  const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const items = await getAdminDepartmentLeaderboard({ limit: normalizedLimit });

  return {
    count: items.length,
    items,
  };
};

export const getGovernanceExportService = async ({
  format = 'json',
  complianceStatus,
  page = 1,
  pageSize = 250,
} = {}) => {
  const [complianceBoard, escalationBoard, mentorLoad] = await Promise.all([
    getAdminComplianceBoardService({ complianceStatus, page, pageSize }),
    getAdminEscalationBoardService({ limit: 100 }),
    getAdminMentorLoadTrendsService({ limit: 100 }),
  ]);

  const normalizedFormat = String(format || 'json').toLowerCase();
  const payload = {
    generated_at: new Date().toISOString(),
    summary: complianceBoard.summary,
    escalation_summary: {
      total: escalationBoard.count,
      pending_threshold_hours: escalationBoard.thresholds.pendingOverdueHours,
      review_threshold_hours: escalationBoard.thresholds.reviewOverdueHours,
    },
    projects: complianceBoard.items,
    escalations: escalationBoard.items,
    mentor_load: mentorLoad.items,
  };

  if (normalizedFormat === 'csv') {
    const headers = [
      'project_id',
      'title',
      'compliance_status',
      'risk_level',
      'health_score',
      'predictive_warning_score',
      'predictive_warning_priority',
      'predictive_warning_reasons',
      'missed_week_count',
      'overdue_pending_count',
      'review_pending_count',
      'mentor_name',
      'latest_status_new',
    ];

    const rows = complianceBoard.items.map((item) => [
      item.project_id,
      item.title || '',
      item.compliance_status,
      item.risk_level,
      item.health_score,
      item.predictive_warning_score,
      item.predictive_warning_priority,
      (item.predictive_warning_reasons || []).join('|'),
      item.missed_week_count,
      item.overdue_pending_count,
      item.review_pending_count,
      item.mentor_name || item.mentor_employee_id || '',
      item.latest_status_new || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    return {
      format: 'csv',
      filename: `tracker-governance-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: csv,
    };
  }

  return {
    format: 'json',
    filename: `tracker-governance-${new Date().toISOString().slice(0, 10)}.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload, null, 2),
    payload,
  };
};

const normalizeWeekBoundary = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const buildProgressReportSummary = (rows) => {
  const totalRows = rows.length;
  const projects = new Set(rows.map((row) => row.project_id).filter(Boolean));
  const weeks = rows.filter((row) => row.week_id != null).length;

  return {
    totalRows,
    totalProjects: projects.size,
    totalWeeks: weeks,
    pendingWeeks: rows.filter((row) => row.week_status === 'pending').length,
    submittedWeeks: rows.filter((row) => row.week_status === 'submitted').length,
    underReviewWeeks: rows.filter((row) => row.week_status === 'under_review').length,
    approvedWeeks: rows.filter((row) => row.week_status === 'approved').length,
    rejectedWeeks: rows.filter((row) => row.week_status === 'rejected').length,
    missedWeeks: rows.filter((row) => row.week_status === 'missed').length,
  };
};

const renderProgressReportPdf = ({ rows, summary, filters }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Tracker Progress Report');
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#4b5563').text(`Generated At: ${new Date().toISOString()}`);
      doc.text(`Project Filter: ${filters.projectId || 'All'}`);
      doc.text(`Team Filter: ${filters.teamId || 'All'}`);
      doc.text(`Week Range: ${filters.weekStart || 'Any'} - ${filters.weekEnd || 'Any'}`);

      doc.moveDown(0.6);
      doc.fillColor('#111827').fontSize(11).text(
        `Projects: ${summary.totalProjects} | Weeks: ${summary.totalWeeks} | Pending: ${summary.pendingWeeks} | Submitted: ${summary.submittedWeeks} | Under Review: ${summary.underReviewWeeks} | Approved: ${summary.approvedWeeks} | Rejected: ${summary.rejectedWeeks} | Missed: ${summary.missedWeeks}`
      );

      doc.moveDown(0.8);
      doc.fontSize(12).text('Rows (Top 30)', { underline: true });
      doc.moveDown(0.2);

      rows.slice(0, 30).forEach((row, index) => {
        const line = `${index + 1}. ${row.project_id || '-'} | W${row.week_number || '-'} | ${row.week_status || '-'} | Risk:${row.risk_level || '-'} | Health:${row.health_score ?? '-'} | Review:${row.latest_review_action || '-'} | Mentor:${row.mentor_name || row.mentor_employee_id || '-'}`;
        doc.fontSize(9).text(line);
      });

      if (rows.length > 30) {
        doc.moveDown(0.4);
        doc.fontSize(9).fillColor('#6b7280').text(`... ${rows.length - 30} additional row(s) truncated in PDF view.`);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

export const getProgressReportExportService = async ({
  format = 'csv',
  projectId,
  teamId,
  weekStart,
  weekEnd,
} = {}) => {
  const normalizedWeekStart = normalizeWeekBoundary(weekStart);
  const normalizedWeekEnd = normalizeWeekBoundary(weekEnd);

  if (normalizedWeekStart && normalizedWeekEnd && normalizedWeekStart > normalizedWeekEnd) {
    throw new Error('weekStart cannot be greater than weekEnd');
  }

  const rows = await getProgressReportRows({
    projectId: projectId || undefined,
    teamId: teamId || undefined,
    weekStart: normalizedWeekStart,
    weekEnd: normalizedWeekEnd,
  });

  const generatedAt = new Date().toISOString();
  const summary = buildProgressReportSummary(rows);
  const normalizedFormat = String(format || 'csv').toLowerCase();

  if (normalizedFormat === 'json') {
    const payload = {
      generated_at: generatedAt,
      filters: {
        projectId: projectId || null,
        teamId: teamId || null,
        weekStart: normalizedWeekStart || null,
        weekEnd: normalizedWeekEnd || null,
      },
      summary,
      rows,
    };

    return {
      format: 'json',
      filename: `tracker-progress-report-${generatedAt.slice(0, 10)}.json`,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(payload, null, 2),
      payload,
    };
  }

  if (normalizedFormat === 'pdf') {
    const pdfBuffer = await renderProgressReportPdf({
      rows,
      summary,
      filters: {
        projectId,
        teamId,
        weekStart: normalizedWeekStart,
        weekEnd: normalizedWeekEnd,
      },
    });

    return {
      format: 'pdf',
      filename: `tracker-progress-report-${generatedAt.slice(0, 10)}.pdf`,
      contentType: 'application/pdf',
      body: pdfBuffer,
      payload: {
        generated_at: generatedAt,
        filters: {
          projectId: projectId || null,
          teamId: teamId || null,
          weekStart: normalizedWeekStart || null,
          weekEnd: normalizedWeekEnd || null,
        },
        summary,
      },
    };
  }

  const headers = [
    'project_id',
    'title',
    'project_status',
    'department',
    'mentor_name',
    'week_number',
    'phase_name',
    'week_status',
    'starts_on',
    'deadline_at',
    'submission_id',
    'revision_no',
    'submitted_at',
    'latest_review_action',
    'reviewed_at',
    'risk_level',
    'risk_score',
    'health_score',
    'team_size',
    'team_members',
  ];

  const csvRows = rows.map((row) => [
    row.project_id,
    row.title || '',
    row.project_status || '',
    row.department || '',
    row.mentor_name || row.mentor_employee_id || '',
    row.week_number ?? '',
    row.phase_name || '',
    row.week_status || '',
    row.starts_on || '',
    row.deadline_at || '',
    row.submission_id ?? '',
    row.revision_no ?? '',
    row.submitted_at || '',
    row.latest_review_action || '',
    row.reviewed_at || '',
    row.risk_level || '',
    row.risk_score ?? '',
    row.health_score ?? '',
    row.team_size ?? '',
    row.team_members || '',
  ]);

  const csv = [headers, ...csvRows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n');

  return {
    format: 'csv',
    filename: `tracker-progress-report-${generatedAt.slice(0, 10)}.csv`,
    contentType: 'text/csv; charset=utf-8',
    body: csv,
    payload: {
      generated_at: generatedAt,
      filters: {
        projectId: projectId || null,
        teamId: teamId || null,
        weekStart: normalizedWeekStart || null,
        weekEnd: normalizedWeekEnd || null,
      },
      summary,
    },
  };
};

export const applyAdminEscalationBatchActionService = async ({ items, action, note, actorUserKey }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one escalation item is required');
  }

  const normalizedAction = String(action || '').toLowerCase();
  if (!['acknowledge', 'follow_up'].includes(normalizedAction)) {
    throw new Error('action must be acknowledge or follow_up');
  }

  const eventType = normalizedAction === 'acknowledge'
    ? 'admin_escalation_acknowledged'
    : 'admin_follow_up_note_added';

  const batchActionId = `batch_${Date.now()}`;

  await Promise.all(
    items.map((item) =>
      createTimelineEvent({
        projectId: item.projectId,
        weekId: item.weekId || null,
        eventType,
        actorUserKey,
        actorRole: 'ADMIN',
        meta: {
          batch_action_id: batchActionId,
          note: note || null,
          escalation_type: item.escalationType || null,
          escalation_severity: item.escalationSeverity || null,
        },
      })
    )
  );

  return {
    processed: items.length,
    action: normalizedAction,
    batchActionId,
  };
};
