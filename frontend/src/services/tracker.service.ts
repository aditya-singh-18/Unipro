import axios from '@/lib/axios';

export type StudentTrackerDashboardStats = {
  total_projects: number;
  pending_weeks: number;
  rejected_weeks: number;
  high_risk_projects: number;
};

export type MentorTrackerDashboardStats = {
  assigned_projects: number;
  review_queue: number;
  risk_alert_projects: number;
  approved_weeks: number;
};

export type AdminTrackerDashboardStats = {
  total_projects: number;
  active_projects: number;
  high_risk_projects: number;
  missed_weeks: number;
};

export type AdminComplianceItem = {
  project_id: string;
  title: string | null;
  project_status: string;
  mentor_employee_id: string | null;
  mentor_name: string | null;
  team_size: number;
  pending_week_count: number;
  missed_week_count: number;
  rejected_week_count: number;
  overdue_pending_count: number;
  next_pending_deadline: string | null;
  review_pending_count: number;
  oldest_review_submitted_at: string | null;
  latest_submission_at: string | null;
  risk_level: 'low' | 'medium' | 'high';
  health_score: number;
  compliance_status: 'healthy' | 'warning' | 'critical';
  latest_status_old: string | null;
  latest_status_new: string | null;
  latest_status_changed_by: string | null;
  latest_status_reason: string | null;
  latest_status_changed_at: string | null;
  predictive_warning_score: number;
  predictive_warning_reasons: string[];
  predictive_warning_priority: 'low' | 'medium' | 'high';
};

export type AdminComplianceSummary = {
  total_projects: number;
  critical_projects: number;
  warning_projects: number;
  healthy_projects: number;
  follow_up_required: number;
};

export type AdminComplianceBoardResponse = {
  summary: AdminComplianceSummary;
  items: AdminComplianceItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type AdminEscalationItem = {
  week_id: number;
  project_id: string;
  title: string | null;
  week_number: number;
  status: TrackerWeek['status'];
  deadline_at: string | null;
  submitted_at: string | null;
  mentor_employee_id: string | null;
  mentor_name: string | null;
  risk_level: 'low' | 'medium' | 'high';
  escalation_type: 'pending_overdue' | 'review_overdue';
  overdue_hours: number;
  escalation_severity?: 'info' | 'warning' | 'critical';
};

export type AdminEscalationBoardResponse = {
  thresholds: {
    pendingOverdueHours: number;
    reviewOverdueHours: number;
    criticalOverdueHours?: number;
  };
  count: number;
  items: AdminEscalationItem[];
};

export type TrackerPolicySettings = {
  escalation_enabled: boolean;
  escalation_batch_limit: number;
  escalation_pending_overdue_hours: number;
  escalation_review_overdue_hours: number;
  escalation_critical_overdue_hours: number;
  reminder_enabled: boolean;
  student_deadline_reminder_hours: number;
  mentor_review_sla_hours: number;
  auto_missed_enabled: boolean;
};

export type AdminEscalationBatchActionPayload = {
  action: 'acknowledge' | 'follow_up';
  note?: string;
  items: Array<{
    projectId: string;
    weekId: number;
    escalationType?: 'pending_overdue' | 'review_overdue';
    escalationSeverity?: 'info' | 'warning' | 'critical';
  }>;
};

export type MentorEffectivenessItem = {
  mentorId: string;
  mentorName: string;
  reviewCount: number;
  avgTurnaroundMs: number | null;
  avgTurnaroundFormatted: string;
  medianTurnaroundMs: number | null;
  medianTurnaroundFormatted: string;
  p95TurnaroundMs: number | null;
  p95TurnaroundFormatted: string;
  avgFeedbackDepth: number;
  richFeedbackRatioPercent: number;
  activeProjectCount: number;
  workloadBand: 'healthy' | 'warning' | 'critical';
};

export type MentorEffectivenessSummary = {
  totalMentors: number;
  avgReviewCount: number;
  avgTurnaroundMs: number;
  avgFeedbackDepth: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
};

export type MentorEffectivenessResponse = {
  summary: MentorEffectivenessSummary;
  items: MentorEffectivenessItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
};

export type MentorEffectivenessDetail = {
  mentorId: string;
  mentorName: string;
  metrics: {
    reviewCount: number;
    recentReviewCount: number;
    avgTurnaroundMs: number | null;
    medianTurnaroundMs: number | null;
    p95TurnaroundMs: number | null;
    avgFeedbackDepth: number;
    richFeedbackRatioPercent: number;
    activeProjectCount: number;
    workloadBand: 'healthy' | 'warning' | 'critical';
  };
};

export type StudentLearningItem = {
  projectId: string;
  studentKey: string;
  studentName: string;
  submissionCount: number;
  revisionCount: number;
  avgQualityScore: number;
  firstQualityScore: number;
  latestQualityScore: number;
  acceptanceRate: number;
  supportiveFeedbackCount: number;
  criticalFeedbackCount: number;
  neutralFeedbackCount: number;
  learningVelocity: number;
  learningVelocityDirection: 'improving' | 'stable' | 'declining';
  riskRegression: boolean;
};

export type StudentLearningSummary = {
  totalStudents: number;
  improvingCount: number;
  stableCount: number;
  decliningCount: number;
  avgAcceptanceRate: number;
};

export type StudentLearningResponse = {
  summary: StudentLearningSummary;
  items: StudentLearningItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
};

export type StudentLearningDetail = {
  projectId: string;
  studentKey: string;
  studentName: string;
  trend: {
    firstQualityScore: number;
    latestQualityScore: number;
    learningVelocity: number;
    learningVelocityDirection: 'improving' | 'stable' | 'declining';
    riskRegression: boolean;
  };
  submissions: Array<{
    submissionId: number;
    weekId: number;
    weekNumber: number;
    revisionNo: number;
    submittedAt: string;
    qualityScore: number;
    action: 'approve' | 'reject' | null;
    reviewComment: string | null;
    reviewedAt: string | null;
    summaryOfWork: string;
    blockers: string | null;
    nextWeekPlan: string | null;
    githubLinkSnapshot: string | null;
  }>;
};

export type EscalationDetailResponse = {
  escalationId: string;
  currentState: 'open' | 'acknowledged' | 'in_follow_up' | 'resolved' | 'deferred';
  detail: {
    week_id: number;
    project_id: string;
    title: string | null;
    week_number: number;
    status: TrackerWeek['status'];
    deadline_at: string | null;
    submitted_at: string | null;
    mentor_employee_id: string | null;
    mentor_name: string | null;
    risk_level: 'low' | 'medium' | 'high';
    escalation_type: 'pending_overdue' | 'review_overdue';
    overdue_hours: number;
    escalation_severity: 'info' | 'warning' | 'critical';
  };
  timeline: Array<{
    timelineId: number;
    eventType: string;
    actorUserKey: string | null;
    actorRole: string | null;
    meta: Record<string, unknown>;
    createdAt: string;
  }>;
};

export type EscalationFollowUpPayload = {
  resolutionState: 'open' | 'acknowledged' | 'in_follow_up' | 'resolved' | 'deferred';
  resolutionNotes?: string;
};

export type ProjectStatusHistoryItem = {
  project_id: string;
  week_id: number | null;
  source: 'timeline' | 'project_status_logs';
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_role: string | null;
  created_at: string;
};

export type AdminMentorLoadItem = {
  mentor_employee_id: string;
  mentor_name: string | null;
  assigned_projects: number;
  review_queue: number;
  high_risk_projects: number;
  avg_queue_age_hours: number;
  oldest_queue_age_hours: number;
  load_band: 'healthy' | 'warning' | 'critical';
};

export type AdminDepartmentLeaderboardItem = {
  department: string;
  total_projects: number;
  high_risk_projects: number;
  missed_weeks: number;
  overdue_pending_weeks: number;
  review_queue: number;
  avg_health_score: number;
  avg_review_age_hours: number;
  pressure_score: number;
  department_band: 'healthy' | 'warning' | 'critical';
};

export type ProgressReportFilters = {
  projectId?: string;
  teamId?: string;
  weekStart?: number;
  weekEnd?: number;
};

export type ProgressReportSummary = {
  totalRows: number;
  totalProjects: number;
  totalWeeks: number;
  pendingWeeks: number;
  submittedWeeks: number;
  underReviewWeeks: number;
  approvedWeeks: number;
  rejectedWeeks: number;
  missedWeeks: number;
};

export type ProgressReportPreview = {
  generated_at: string;
  filters: {
    projectId: string | null;
    teamId: string | null;
    weekStart: number | null;
    weekEnd: number | null;
  };
  summary: ProgressReportSummary;
  rows: Array<Record<string, unknown>>;
};

export type TrackerWeek = {
  week_id: number;
  week_number: number;
  phase_name: string | null;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'missed' | 'locked';
  starts_on: string | null;
  deadline_at: string | null;
  locked_at: string | null;
};

export type WeekSubmission = {
  submission_id: number;
  week_id: number;
  project_id: string;
  revision_no: number;
  submitted_by_user_key: string;
  summary_of_work: string;
  blockers: string | null;
  next_week_plan: string | null;
  github_link_snapshot: string | null;
  submitted_at: string;
};

export type SubmissionFile = {
  file_id: number;
  submission_id: number;
  version_no: number;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by_user_key: string;
  uploaded_at: string;
};

export type WeekDraft = {
  week_id: number;
  author_user_key: string;
  draft_data: {
    summaryOfWork?: string;
    blockers?: string;
    nextWeekPlan?: string;
    githubLinkSnapshot?: string;
  };
  saved_at: string | null;
};

export type WeekReview = {
  review_id: number;
  submission_id: number;
  week_id: number;
  project_id: string;
  reviewer_employee_id: string;
  action: 'approve' | 'reject';
  review_comment: string | null;
  reviewed_at: string;
};

export type MentorQueueItem = {
  projectId: string;
  weekId: number;
  weekNumber: number;
  phaseName: string | null;
  deadlineAt?: string | null;
  weekStatus?: TrackerWeek['status'];
  submissionId: number;
  revisionNo: number;
  submittedAt: string;
  pendingHours?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  summaryOfWork: string;
  blockers: string | null;
  nextWeekPlan: string | null;
  githubLinkSnapshot: string | null;
};

export type MentorReviewQueueResponse = {
  queue: MentorQueueItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type WeekSubmissionPayload = {
  summaryOfWork: string;
  blockers?: string;
  nextWeekPlan?: string;
  githubLinkSnapshot?: string;
  githubRepoUrl?: string;
};

export type TrackerTaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export type TrackerTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TrackerTask = {
  task_id: number;
  project_id: string;
  week_id: number | null;
  title: string;
  description: string | null;
  priority: TrackerTaskPriority;
  status: TrackerTaskStatus;
  assigned_to_user_key: string | null;
  due_date: string | null;
  created_by_user_key: string;
  created_at: string;
  updated_at: string;
};

export type CreateTrackerTaskPayload = {
  title: string;
  description?: string;
  priority?: TrackerTaskPriority;
  assignedToUserKey?: string;
  dueDate?: string;
  weekId?: number;
};

export const getStudentTrackerDashboard = async (): Promise<StudentTrackerDashboardStats> => {
  const res = await axios.get('/tracker/dashboard/student');
  return res.data?.stats || {
    total_projects: 0,
    pending_weeks: 0,
    rejected_weeks: 0,
    high_risk_projects: 0,
  };
};

export const getMentorTrackerDashboard = async (): Promise<MentorTrackerDashboardStats> => {
  const res = await axios.get('/tracker/dashboard/mentor');
  return res.data?.stats || {
    assigned_projects: 0,
    review_queue: 0,
    risk_alert_projects: 0,
    approved_weeks: 0,
  };
};

export const getAdminTrackerDashboard = async (): Promise<AdminTrackerDashboardStats> => {
  const res = await axios.get('/tracker/dashboard/admin');
  return res.data?.stats || {
    total_projects: 0,
    active_projects: 0,
    high_risk_projects: 0,
    missed_weeks: 0,
  };
};

export const getAdminComplianceBoard = async (filters?: {
  status?: 'critical' | 'warning' | 'healthy';
  page?: number;
  pageSize?: number;
}): Promise<AdminComplianceBoardResponse> => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

  const query = params.toString();
  const res = await axios.get(`/tracker/dashboard/admin/compliance${query ? `?${query}` : ''}`);

  return {
    summary: res.data?.summary || {
      total_projects: 0,
      critical_projects: 0,
      warning_projects: 0,
      healthy_projects: 0,
      follow_up_required: 0,
    },
    items: res.data?.items || [],
    pagination: res.data?.pagination || {
      page: 1,
      pageSize: filters?.pageSize || 8,
      total: 0,
    },
  };
};

export const getAdminEscalationBoard = async (limit = 10): Promise<AdminEscalationBoardResponse> => {
  const res = await axios.get(`/tracker/dashboard/admin/escalations?limit=${encodeURIComponent(String(limit))}`);

  return {
    thresholds: res.data?.thresholds || {
      pendingOverdueHours: 48,
      reviewOverdueHours: 36,
      criticalOverdueHours: 72,
    },
    count: Number(res.data?.count || 0),
    items: res.data?.items || [],
  };
};

export const getTrackerPolicySettings = async (): Promise<TrackerPolicySettings> => {
  const res = await axios.get('/tracker/admin/policy');
  return res.data?.policy || {
    escalation_enabled: true,
    escalation_batch_limit: 50,
    escalation_pending_overdue_hours: 48,
    escalation_review_overdue_hours: 36,
    escalation_critical_overdue_hours: 72,
    reminder_enabled: true,
    student_deadline_reminder_hours: 24,
    mentor_review_sla_hours: 24,
    auto_missed_enabled: true,
  };
};

export const updateTrackerPolicySettings = async (
  payload: TrackerPolicySettings
): Promise<TrackerPolicySettings> => {
  const res = await axios.put('/tracker/admin/policy', payload);
  return res.data?.policy;
};

export const getProjectStatusHistory = async (
  projectId: string,
  limit = 20
): Promise<ProjectStatusHistoryItem[]> => {
  const res = await axios.get(
    `/tracker/projects/${projectId}/status-history?limit=${encodeURIComponent(String(limit))}`
  );

  return res.data?.history || [];
};

export const getProjectTimelineHistory = async (
  projectId: string,
  limit = 20
): Promise<ProjectStatusHistoryItem[]> => {
  const res = await axios.get(
    `/tracker/projects/${projectId}/timeline?page=1&pageSize=${encodeURIComponent(String(limit))}`
  );

  const timeline = Array.isArray(res.data?.timeline) ? res.data.timeline : [];
  return timeline.map((item: any) => ({
    project_id: String(item.project_id || projectId),
    week_id: item.week_id ?? null,
    source: 'timeline',
    event_type: String(item.event_type || 'status_updated'),
    old_status: null,
    new_status: null,
    reason: null,
    changed_by: item.actor_user_key ? String(item.actor_user_key) : null,
    changed_role: item.actor_role ? String(item.actor_role) : null,
    created_at: String(item.created_at || new Date().toISOString()),
  }));
};

export const getAdminMentorLoadTrends = async (limit = 20): Promise<AdminMentorLoadItem[]> => {
  const res = await axios.get(`/tracker/dashboard/admin/mentor-load?limit=${encodeURIComponent(String(limit))}`);
  return res.data?.items || [];
};

export const getAdminDepartmentLeaderboard = async (
  limit = 20
): Promise<AdminDepartmentLeaderboardItem[]> => {
  const res = await axios.get(`/tracker/dashboard/admin/departments?limit=${encodeURIComponent(String(limit))}`);
  return res.data?.items || [];
};

export const getAdminMentorEffectiveness = async (
  params?: { q?: string; page?: number; pageSize?: number }
): Promise<MentorEffectivenessResponse> => {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  const res = await axios.get(`/tracker/dashboard/admin/mentor-effectiveness${qs ? `?${qs}` : ''}`);
  return {
    summary: res.data?.summary || {
      totalMentors: 0,
      avgReviewCount: 0,
      avgTurnaroundMs: 0,
      avgFeedbackDepth: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
    },
    items: res.data?.items || [],
    total: res.data?.total ?? 0,
    page: res.data?.page ?? 1,
    pageSize: res.data?.pageSize ?? 50,
    hasMore: res.data?.hasMore ?? false,
  };
};

export const getAdminMentorEffectivenessDetail = async (
  mentorId: string
): Promise<MentorEffectivenessDetail | null> => {
  try {
    const res = await axios.get(`/tracker/dashboard/admin/mentor-effectiveness/${mentorId}`);
    return res.data?.detail || null;
  } catch {
    return null;
  }
};

export const downloadMentorEffectivenessExport = async (format: 'json' | 'csv') => {
  const response = await axios.get(
    `/tracker/dashboard/admin/mentor-effectiveness/export?format=${format}`,
    {
      responseType: 'blob',
    }
  );

  return response.data as Blob;
};

export const getAdminStudentLearning = async (
  params?: { q?: string; page?: number; pageSize?: number }
): Promise<StudentLearningResponse> => {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  const res = await axios.get(`/tracker/dashboard/admin/student-learning${qs ? `?${qs}` : ''}`);
  return {
    summary: res.data?.summary || {
      totalStudents: 0,
      improvingCount: 0,
      stableCount: 0,
      decliningCount: 0,
      avgAcceptanceRate: 0,
    },
    items: res.data?.items || [],
    total: res.data?.total ?? 0,
    page: res.data?.page ?? 1,
    pageSize: res.data?.pageSize ?? 50,
    hasMore: res.data?.hasMore ?? false,
  };
};

export const getAdminStudentLearningDetail = async (
  projectId: string,
  studentKey: string
): Promise<StudentLearningDetail | null> => {
  const res = await axios.get(`/tracker/dashboard/admin/student-learning/${projectId}/${studentKey}`);
  return res.data?.detail || null;
};

export const downloadStudentLearningExport = async (format: 'json' | 'csv') => {
  const response = await axios.get(
    `/tracker/dashboard/admin/student-learning/export?format=${format}`,
    {
      responseType: 'blob',
    }
  );

  return response.data as Blob;
};

export const getEscalationDetail = async (escalationId: number): Promise<EscalationDetailResponse | null> => {
  try {
    const res = await axios.get(`/tracker/escalations/${escalationId}`);
    if (!res.data) return null;

    return {
      escalationId: String(res.data.escalationId),
      currentState: res.data.currentState,
      detail: res.data.detail,
      timeline: res.data.timeline || [],
    };
  } catch {
    return null;
  }
};

export const updateEscalationFollowUp = async (
  escalationId: number,
  payload: EscalationFollowUpPayload
): Promise<EscalationDetailResponse | null> => {
  try {
    const res = await axios.patch(`/tracker/escalations/${escalationId}/follow-up`, payload);
    if (!res.data) return null;

    return {
      escalationId: String(res.data.escalationId),
      currentState: res.data.currentState,
      detail: res.data.detail,
      timeline: res.data.timeline || [],
    };
  } catch {
    return null;
  }
};

export const applyAdminEscalationBatchAction = async (
  payload: AdminEscalationBatchActionPayload
) => {
  const res = await axios.post('/tracker/dashboard/admin/escalations/batch-action', payload);
  return res.data?.result;
};

export const downloadGovernanceExport = async (
  format: 'json' | 'csv',
  filters?: { status?: 'critical' | 'warning' | 'healthy'; page?: number; pageSize?: number }
) => {
  const params = new URLSearchParams();
  params.set('format', format);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

  const response = await axios.get(`/tracker/dashboard/admin/governance-export?${params.toString()}`, {
    responseType: 'blob',
  });

  return response.data as Blob;
};

export const getProgressReportPreview = async (
  filters?: ProgressReportFilters
): Promise<ProgressReportPreview> => {
  const params = new URLSearchParams();
  params.set('format', 'json');
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.teamId) params.set('teamId', filters.teamId);
  if (filters?.weekStart) params.set('weekStart', String(filters.weekStart));
  if (filters?.weekEnd) params.set('weekEnd', String(filters.weekEnd));

  const response = await axios.get(`/tracker/dashboard/admin/progress-report/export?${params.toString()}`);

  return {
    generated_at: response.data?.generated_at || new Date().toISOString(),
    filters: response.data?.filters || {
      projectId: null,
      teamId: null,
      weekStart: null,
      weekEnd: null,
    },
    summary: response.data?.summary || {
      totalRows: 0,
      totalProjects: 0,
      totalWeeks: 0,
      pendingWeeks: 0,
      submittedWeeks: 0,
      underReviewWeeks: 0,
      approvedWeeks: 0,
      rejectedWeeks: 0,
      missedWeeks: 0,
    },
    rows: response.data?.rows || [],
  };
};

export const downloadProgressReport = async (
  format: 'csv' | 'pdf',
  filters?: ProgressReportFilters
) => {
  const params = new URLSearchParams();
  params.set('format', format);
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.teamId) params.set('teamId', filters.teamId);
  if (filters?.weekStart) params.set('weekStart', String(filters.weekStart));
  if (filters?.weekEnd) params.set('weekEnd', String(filters.weekEnd));

  const response = await axios.get(`/tracker/dashboard/admin/progress-report/export?${params.toString()}`, {
    responseType: 'blob',
  });

  return response.data as Blob;
};

export const getProjectWeeks = async (projectId: string): Promise<TrackerWeek[]> => {
  const res = await axios.get(`/tracker/projects/${projectId}/weeks`);
  return res.data?.weeks || [];
};

export const createWeeklySubmission = async (
  weekId: number,
  payload: WeekSubmissionPayload
): Promise<WeekSubmission> => {
  const res = await axios.post(`/tracker/weeks/${weekId}/submissions`, payload);
  return res.data?.submission;
};

export const getWeekDraft = async (weekId: number): Promise<WeekDraft> => {
  const res = await axios.get(`/tracker/weeks/${weekId}/draft`);
  return res.data?.draft;
};

export const saveWeekDraft = async (
  weekId: number,
  payload: WeekSubmissionPayload
): Promise<WeekDraft> => {
  const res = await axios.put(`/tracker/weeks/${weekId}/draft`, payload);
  return res.data?.draft;
};

export const resubmitWeeklySubmission = async (
  weekId: number,
  payload: WeekSubmissionPayload
): Promise<WeekSubmission> => {
  const res = await axios.post(`/tracker/weeks/${weekId}/submissions/resubmit`, payload);
  return res.data?.submission;
};

export const getWeekSubmissions = async (weekId: number): Promise<WeekSubmission[]> => {
  const res = await axios.get(`/tracker/weeks/${weekId}/submissions`);
  return res.data?.submissions || [];
};

export const getWeekReviews = async (weekId: number): Promise<WeekReview[]> => {
  const res = await axios.get(`/tracker/weeks/${weekId}/reviews`);
  return res.data?.reviews || [];
};

/** Upload a file to the server. Returns the stored URL + metadata. */
export const uploadTrackerFile = async (
  file: File
): Promise<{ fileUrl: string; fileName: string; mimeType: string; fileSizeBytes: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/tracker/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/** Attach an already-uploaded file reference to a submission. */
export const attachSubmissionFile = async (
  submissionId: number,
  payload: { fileName: string; fileUrl: string; mimeType: string; fileSizeBytes: number }
): Promise<SubmissionFile> => {
  const res = await axios.post(`/tracker/submissions/${submissionId}/files`, payload);
  return res.data?.file;
};

/** Fetch files attached to a submission. */
export const getSubmissionFiles = async (submissionId: number): Promise<SubmissionFile[]> => {
  const res = await axios.get(`/tracker/submissions/${submissionId}/files`);
  return res.data?.files || [];
};

export const reviewWeekSubmission = async (
  submissionId: number,
  payload: { action: 'approve' | 'reject'; reviewComment?: string }
): Promise<WeekReview> => {
  const res = await axios.post(`/tracker/submissions/${submissionId}/review`, payload);
  return res.data?.review;
};

export const getMentorReviewQueueForProjects = async (
  projectIds: Array<string | number>
): Promise<MentorQueueItem[]> => {
  const normalizedIds = projectIds.map((id) => String(id)).filter(Boolean);
  const queue: MentorQueueItem[] = [];

  for (const projectId of normalizedIds) {
    const weeks = await getProjectWeeks(projectId);
    const reviewableWeeks = weeks.filter(
      (week) => week.status === 'submitted' || week.status === 'under_review'
    );

    for (const week of reviewableWeeks) {
      const submissions = await getWeekSubmissions(week.week_id);
      const latest = submissions[0];
      if (!latest) continue;

      queue.push({
        projectId,
        weekId: week.week_id,
        weekNumber: week.week_number,
        phaseName: week.phase_name,
        submissionId: latest.submission_id,
        revisionNo: latest.revision_no,
        submittedAt: latest.submitted_at,
        summaryOfWork: latest.summary_of_work,
        blockers: latest.blockers,
        nextWeekPlan: latest.next_week_plan,
        githubLinkSnapshot: latest.github_link_snapshot,
      });
    }
  }

  return queue.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
};

export const getMentorReviewQueue = async (filters?: {
  sortBy?: 'pending_age' | 'risk' | 'deadline';
  order?: 'asc' | 'desc';
  riskLevel?: 'low' | 'medium' | 'high';
  page?: number;
  pageSize?: number;
}): Promise<MentorReviewQueueResponse> => {
  const params = new URLSearchParams();

  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.order) params.set('order', filters.order);
  if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

  const query = params.toString();
  const res = await axios.get(`/tracker/mentor/review-queue${query ? `?${query}` : ''}`);

  const rawQueue = res.data?.queue || [];
  const queue: MentorQueueItem[] = rawQueue.map((item: {
    project_id: string;
    week_id: number;
    week_number: number;
    phase_name: string | null;
    deadline_at: string | null;
    week_status: TrackerWeek['status'];
    submission_id: number;
    revision_no: number;
    submitted_at: string;
    pending_hours: number;
    risk_level: 'low' | 'medium' | 'high';
    summary_of_work: string;
    blockers: string | null;
    next_week_plan: string | null;
    github_link_snapshot: string | null;
  }) => ({
    projectId: item.project_id,
    weekId: item.week_id,
    weekNumber: item.week_number,
    phaseName: item.phase_name,
    deadlineAt: item.deadline_at,
    weekStatus: item.week_status,
    submissionId: item.submission_id,
    revisionNo: item.revision_no,
    submittedAt: item.submitted_at,
    pendingHours: item.pending_hours,
    riskLevel: item.risk_level,
    summaryOfWork: item.summary_of_work,
    blockers: item.blockers,
    nextWeekPlan: item.next_week_plan,
    githubLinkSnapshot: item.github_link_snapshot,
  }));

  return {
    queue,
    pagination: res.data?.pagination || {
      page: 1,
      pageSize: queue.length,
      total: queue.length,
    },
  };
};

export const getProjectTasks = async (
  projectId: string,
  filters?: { status?: TrackerTaskStatus; assignedTo?: string; weekId?: number }
): Promise<TrackerTask[]> => {
  const params = new URLSearchParams();

  if (filters?.status) params.set('status', filters.status);
  if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
  if (filters?.weekId) params.set('weekId', String(filters.weekId));

  const query = params.toString();
  const res = await axios.get(`/tracker/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
  return res.data?.tasks || [];
};

export const createProjectTask = async (
  projectId: string,
  payload: CreateTrackerTaskPayload
): Promise<TrackerTask> => {
  const res = await axios.post(`/tracker/projects/${projectId}/tasks`, payload);
  return res.data?.task;
};

export const updateProjectTaskStatus = async (
  taskId: number,
  status: TrackerTaskStatus
): Promise<TrackerTask> => {
  const res = await axios.patch(`/tracker/tasks/${taskId}/status`, { status });
  return res.data?.task;
};
