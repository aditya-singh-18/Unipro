import {
  activateProjectCycle,
  createProjectCycle,
  deactivateAllProjectCycles,
  getProjectCycleById,
  getSystemSettings,
  insertSettingsAuditLog,
  listProjectCycles,
  updateProjectCycle,
  updateSystemSettings,
} from '../repositories/systemSettings.repo.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PROJECT_MODES = ['team_based', 'individual', 'both'];
const MENTOR_ASSIGNMENT_MODES = ['manual_only', 'recommendation_required', 'auto_assign'];

const toBool = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const toInt = (value, fallback, min = null, max = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const integer = Math.floor(parsed);
  if (min !== null && integer < min) return fallback;
  if (max !== null && integer > max) return fallback;
  return integer;
};

const toNum = (value, fallback, min = null, max = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (min !== null && parsed < min) return fallback;
  if (max !== null && parsed > max) return fallback;
  return parsed;
};

const parseStringArray = (value, fallback) => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    return normalized.length ? normalized : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return normalized.length ? normalized : fallback;
  }

  return fallback;
};

const normalizeSettings = (raw) => {
  const current = raw || {};

  const submissionDays = parseStringArray(current.submission_allowed_days, DAYS)
    .map((d) => d.toLowerCase())
    .filter((d) => DAYS.includes(d));

  return {
    id: 1,
    university_name: String(current.university_name || 'ABC University'),
    department_name: String(current.department_name || 'Computer Science Engineering'),
    academic_year: String(current.academic_year || '2026-2027'),
    semesters: parseStringArray(current.semesters, ['Semester 7', 'Semester 8']),

    allow_student_login: toBool(current.allow_student_login, true),
    allow_mentor_login: toBool(current.allow_mentor_login, true),
    allow_team_creation: toBool(current.allow_team_creation, true),
    allow_project_creation: toBool(current.allow_project_creation, true),
    mentor_assignment_mode: MENTOR_ASSIGNMENT_MODES.includes(String(current.mentor_assignment_mode || '').toLowerCase())
      ? String(current.mentor_assignment_mode).toLowerCase()
      : 'manual_only',
    mentor_auto_assign_threshold: toNum(current.mentor_auto_assign_threshold, 75, 0, 100),
    mentor_default_max_active_projects: toInt(current.mentor_default_max_active_projects, 5, 1, 100),
    mentor_recommendation_top_n: toInt(current.mentor_recommendation_top_n, 3, 1, 20),
    mentor_load_balance_enabled: toBool(current.mentor_load_balance_enabled, true),

    max_projects_per_student: toInt(current.max_projects_per_student, 1, 1),
    max_projects_per_team: toInt(current.max_projects_per_team, 1, 1),
    max_teams_per_project_idea: toInt(current.max_teams_per_project_idea, 1, 1),

    default_project_status: String(current.default_project_status || 'PENDING'),
    default_submission_status: String(current.default_submission_status || 'pending'),

    project_start_date: current.project_start_date || null,
    project_end_date: current.project_end_date || null,
    total_project_weeks: toInt(current.total_project_weeks, 20, 1, 52),
    days_per_week: toInt(current.days_per_week, 7, 1, 7),
    submission_allowed_days: submissionDays.length ? submissionDays : DAYS,
    deadline_day: String(current.deadline_day || 'sunday').toLowerCase(),
    deadline_time: String(current.deadline_time || '23:59:00'),

    grace_enabled: toBool(current.grace_enabled, false),
    grace_period_hours: toInt(current.grace_period_hours, 24, 0, 168),
    auto_lock_week_after_deadline: toBool(current.auto_lock_week_after_deadline, true),
    allow_late_submission: toBool(current.allow_late_submission, false),
    mark_week_as_missed_automatically: toBool(current.mark_week_as_missed_automatically, true),
    allow_admin_unlock_week: toBool(current.allow_admin_unlock_week, true),

    min_team_size: toInt(current.min_team_size, 2, 1),
    max_team_size: toInt(current.max_team_size, 4, 1),
    allow_solo_projects: toBool(current.allow_solo_projects, false),
    max_teams_per_student: toInt(current.max_teams_per_student, 3, 1),
    max_teams_per_project: toInt(current.max_teams_per_project, 1, 1),
    team_leader_required: toBool(current.team_leader_required, true),
    allow_leader_change: toBool(current.allow_leader_change, false),
    allow_member_add_after_creation: toBool(current.allow_member_add_after_creation, true),
    allow_member_removal: toBool(current.allow_member_removal, true),
    max_member_change_allowed: toInt(current.max_member_change_allowed, 2, 0),
    auto_lock_team_after_project_approval: toBool(current.auto_lock_team_after_project_approval, true),
    lock_team_after_week: toInt(current.lock_team_after_week, 2, 1, 52),

    enable_weekly_submissions: toBool(current.enable_weekly_submissions, true),
    total_submission_weeks: toInt(current.total_submission_weeks, 20, 1, 52),
    required_submission_fields: parseStringArray(current.required_submission_fields, [
      'progress_description',
      'github_repository_link',
      'file_upload',
    ]),
    allowed_file_types: parseStringArray(current.allowed_file_types, ['pdf', 'docx', 'ppt', 'zip']),
    max_file_size_mb: toInt(current.max_file_size_mb, 20, 1, 100),
    max_files_per_submission: toInt(current.max_files_per_submission, 3, 1, 20),
    allow_resubmission: toBool(current.allow_resubmission, true),
    max_resubmissions: toInt(current.max_resubmissions, 2, 0, 20),
    late_submission_penalty_percent: toNum(current.late_submission_penalty_percent, 10, 0, 100),
    auto_lock_week_after_review: toBool(current.auto_lock_week_after_review, false),
  };
};

const validateSettings = (settings) => {
  if (!MENTOR_ASSIGNMENT_MODES.includes(settings.mentor_assignment_mode)) {
    throw new Error('mentor_assignment_mode must be one of manual_only, recommendation_required, auto_assign');
  }

  if (settings.max_team_size < settings.min_team_size) {
    throw new Error('max_team_size must be greater than or equal to min_team_size');
  }

  if (!DAYS.includes(settings.deadline_day)) {
    throw new Error('deadline_day must be one of monday-sunday');
  }

  const hasStart = Boolean(settings.project_start_date);
  const hasEnd = Boolean(settings.project_end_date);
  if (hasStart && hasEnd) {
    const start = new Date(settings.project_start_date).getTime();
    const end = new Date(settings.project_end_date).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      throw new Error('project_end_date must be greater than or equal to project_start_date');
    }
  }
};

export const getAdminSystemSettingsService = async () => {
  try {
    const current = await getSystemSettings();
    return normalizeSettings(current);
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('admin_system_settings') || msg.includes('does not exist')) {
      return normalizeSettings(null);
    }
    throw error;
  }
};

export const updateAdminSystemSettingsService = async ({ payload, actorUserKey }) => {
  const before = await getAdminSystemSettingsService();
  const merged = normalizeSettings({ ...before, ...(payload || {}) });

  validateSettings(merged);

  const updated = await updateSystemSettings({ payload: merged, updatedBy: actorUserKey });
  const normalized = normalizeSettings(updated);

  await insertSettingsAuditLog({
    actorUserKey,
    actionType: 'update',
    sectionName: 'admin_system_settings',
    beforeData: before,
    afterData: normalized,
  });

  return normalized;
};

export const listProjectCyclesService = async () => {
  return await listProjectCycles();
};

export const createProjectCycleService = async ({ payload, actorUserKey }) => {
  const cycleName = String(payload?.cycle_name || '').trim();
  const batchStartYear = Number(payload?.batch_start_year);
  const batchEndYear = Number(payload?.batch_end_year);
  const projectMode = String(payload?.project_mode || 'team_based').toLowerCase();

  if (!cycleName) {
    throw new Error('cycle_name is required');
  }

  if (!Number.isInteger(batchStartYear) || !Number.isInteger(batchEndYear)) {
    throw new Error('batch_start_year and batch_end_year must be integers');
  }

  if (!PROJECT_MODES.includes(projectMode)) {
    throw new Error('project_mode must be one of team_based, individual, both');
  }

  const created = await createProjectCycle({
    cycleName,
    batchStartYear,
    batchEndYear,
    projectMode,
    actorUserKey,
  });

  await insertSettingsAuditLog({
    actorUserKey,
    actionType: 'create',
    sectionName: 'project_cycle',
    beforeData: null,
    afterData: created,
  });

  return created;
};

export const updateProjectCycleService = async ({ cycleId, payload, actorUserKey }) => {
  const before = await getProjectCycleById(cycleId);
  if (!before) {
    throw new Error('Project cycle not found');
  }

  const next = {
    cycle_name: payload?.cycle_name !== undefined ? String(payload.cycle_name).trim() : before.cycle_name,
    batch_start_year:
      payload?.batch_start_year !== undefined ? Number(payload.batch_start_year) : before.batch_start_year,
    batch_end_year:
      payload?.batch_end_year !== undefined ? Number(payload.batch_end_year) : before.batch_end_year,
    project_mode:
      payload?.project_mode !== undefined
        ? String(payload.project_mode).toLowerCase()
        : before.project_mode,
  };

  if (!next.cycle_name) {
    throw new Error('cycle_name cannot be empty');
  }

  if (!Number.isInteger(next.batch_start_year) || !Number.isInteger(next.batch_end_year)) {
    throw new Error('batch_start_year and batch_end_year must be integers');
  }

  if (next.batch_end_year < next.batch_start_year) {
    throw new Error('batch_end_year must be greater than or equal to batch_start_year');
  }

  if (!PROJECT_MODES.includes(next.project_mode)) {
    throw new Error('project_mode must be one of team_based, individual, both');
  }

  const updated = await updateProjectCycle({
    cycleId,
    payload: next,
    actorUserKey,
  });

  await insertSettingsAuditLog({
    actorUserKey,
    actionType: 'update',
    sectionName: 'project_cycle',
    beforeData: before,
    afterData: updated,
  });

  return updated;
};

export const activateProjectCycleService = async ({ cycleId, actorUserKey }) => {
  const before = await getProjectCycleById(cycleId);
  if (!before) {
    throw new Error('Project cycle not found');
  }

  await deactivateAllProjectCycles();
  const activated = await activateProjectCycle({ cycleId, actorUserKey });

  await insertSettingsAuditLog({
    actorUserKey,
    actionType: 'activate',
    sectionName: 'project_cycle',
    beforeData: before,
    afterData: activated,
  });

  return activated;
};

export const getPublicSystemAccessService = async () => {
  let settings;
  try {
    settings = await getAdminSystemSettingsService();
  } catch {
    return {
      allow_student_login: true,
      allow_mentor_login: true,
      allow_team_creation: true,
      allow_project_creation: true,
      enable_weekly_submissions: true,
      team_leader_required: true,
      allow_leader_change: false,
      allow_member_removal: true,
    };
  }

  return {
    allow_student_login: settings.allow_student_login,
    allow_mentor_login: settings.allow_mentor_login,
    allow_team_creation: settings.allow_team_creation,
    allow_project_creation: settings.allow_project_creation,
    enable_weekly_submissions: settings.enable_weekly_submissions,
    min_team_size: settings.min_team_size,
    max_team_size: settings.max_team_size,
    allow_solo_projects: settings.allow_solo_projects,
    team_leader_required: settings.team_leader_required,
    allow_leader_change: settings.allow_leader_change,
    allow_member_removal: settings.allow_member_removal,
  };
};
