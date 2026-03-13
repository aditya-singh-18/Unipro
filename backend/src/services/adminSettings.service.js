import {
  getAdminSettingsSections,
  upsertAdminSettingsSection,
  listProjectTypes,
  getProjectTypeByKey,
  upsertProjectType,
  deleteProjectTypeByKey,
  listTracks,
  getTrackByKey,
  upsertTrack,
  deleteTrackByKey,
  listTrackTechnologies,
  getTrackTechnologyById,
  createTrackTechnology,
  updateTrackTechnology,
  deleteTrackTechnologyById,
} from '../repositories/adminSettings.repo.js';

const SECTION_KEYS = ['general', 'team_rules', 'project_form_rules'];

const DEFAULT_SECTIONS = {
  general: {
    departments: ['CSE', 'ECE', 'ME', 'IT', 'CIVIL'],
    active_academic_year: null,
    active_semester: null,
    project_season_label: 'Default Cycle',
    proposal_window: {
      open_at: null,
      close_at: null,
    },
  },
  team_rules: {
    max_teams_per_student: 3,
    default_team_size: 4,
    min_team_size: 1,
    max_team_size: 4,
    allow_cross_department_team: false,
    lock_team_after_project_submission: true,
    leader_only_member_management: true,
  },
  project_form_rules: {
    enable_project_types: true,
    allow_multi_track: true,
    allow_custom_technology: true,
    github_repo_required: false,
    description_min_length: 30,
    require_track_selection: true,
    enabled_project_type_keys: ['MINOR_PROJECT', 'MAJOR_PROJECT', 'OTHER'],
  },
};

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const toInt = (value, fallback, { min, max } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (min !== undefined && normalized < min) return fallback;
  if (max !== undefined && normalized > max) return fallback;
  return normalized;
};

const normalizeKey = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const normalizeDisplayName = (value, fallback) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const ensureChronological = (startValue, endValue, startLabel, endLabel) => {
  if (!startValue || !endValue) return;
  if (new Date(startValue).getTime() > new Date(endValue).getTime()) {
    throw createHttpError(400, `${startLabel} cannot be after ${endLabel}`);
  }
};

const normalizeSemesters = (value) => {
  const list = Array.isArray(value) ? value : [];
  const normalized = Array.from(
    new Set(
      list
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 12)
    )
  ).sort((left, right) => left - right);

  return normalized;
};

const normalizeSectionValue = (sectionKey, payload = {}) => {
  const current = DEFAULT_SECTIONS[sectionKey];
  if (!current) {
    throw createHttpError(400, `Unsupported settings section: ${sectionKey}`);
  }

  if (sectionKey === 'general') {
    const departments = Array.isArray(payload.departments)
      ? Array.from(new Set(payload.departments.map((item) => String(item || '').trim()).filter(Boolean)))
      : current.departments;

    const next = {
      departments: departments.length > 0 ? departments : current.departments,
      active_academic_year: payload.active_academic_year ?? current.active_academic_year,
      active_semester: payload.active_semester ?? current.active_semester,
      project_season_label: String(payload.project_season_label ?? current.project_season_label).trim() || current.project_season_label,
      proposal_window: {
        open_at: payload?.proposal_window?.open_at ?? current.proposal_window.open_at,
        close_at: payload?.proposal_window?.close_at ?? current.proposal_window.close_at,
      },
    };

    ensureChronological(next.proposal_window.open_at, next.proposal_window.close_at, 'Proposal window open time', 'proposal window close time');
    return next;
  }

  if (sectionKey === 'team_rules') {
    const next = {
      max_teams_per_student: toInt(payload.max_teams_per_student, current.max_teams_per_student, { min: 1, max: 10 }),
      default_team_size: toInt(payload.default_team_size, current.default_team_size, { min: 1, max: 10 }),
      min_team_size: toInt(payload.min_team_size, current.min_team_size, { min: 1, max: 10 }),
      max_team_size: toInt(payload.max_team_size, current.max_team_size, { min: 1, max: 10 }),
      allow_cross_department_team: toBoolean(payload.allow_cross_department_team, current.allow_cross_department_team),
      lock_team_after_project_submission: toBoolean(payload.lock_team_after_project_submission, current.lock_team_after_project_submission),
      leader_only_member_management: toBoolean(payload.leader_only_member_management, current.leader_only_member_management),
    };

    if (next.min_team_size > next.max_team_size) {
      throw createHttpError(400, 'Minimum team size cannot be greater than maximum team size');
    }

    if (next.default_team_size < next.min_team_size || next.default_team_size > next.max_team_size) {
      throw createHttpError(400, 'Default team size must be within min/max team size bounds');
    }

    return next;
  }

  if (sectionKey === 'project_form_rules') {
    const enabledProjectTypeKeys = Array.isArray(payload.enabled_project_type_keys)
      ? Array.from(new Set(payload.enabled_project_type_keys.map(normalizeKey).filter(Boolean)))
      : current.enabled_project_type_keys;

    return {
      enable_project_types: toBoolean(payload.enable_project_types, current.enable_project_types),
      allow_multi_track: toBoolean(payload.allow_multi_track, current.allow_multi_track),
      allow_custom_technology: toBoolean(payload.allow_custom_technology, current.allow_custom_technology),
      github_repo_required: toBoolean(payload.github_repo_required, current.github_repo_required),
      description_min_length: toInt(payload.description_min_length, current.description_min_length, { min: 1, max: 5000 }),
      require_track_selection: toBoolean(payload.require_track_selection, current.require_track_selection),
      enabled_project_type_keys: enabledProjectTypeKeys.length > 0 ? enabledProjectTypeKeys : current.enabled_project_type_keys,
    };
  }

  return current;
};

const normalizeProjectTypePayload = (payload = {}, current = null) => {
  const source = current || {};
  const next = {
    display_name: normalizeDisplayName(payload.display_name, source.display_name || 'Untitled Project Type'),
    description: payload.description ?? source.description ?? null,
    is_active: toBoolean(payload.is_active, source.is_active ?? true),
    allowed_semesters: normalizeSemesters(payload.allowed_semesters ?? source.allowed_semesters ?? []),
    min_team_size: toInt(payload.min_team_size, source.min_team_size ?? 1, { min: 1, max: 10 }),
    max_team_size: toInt(payload.max_team_size, source.max_team_size ?? 4, { min: 1, max: 10 }),
    default_total_weeks: toInt(payload.default_total_weeks, source.default_total_weeks ?? 12, { min: 1, max: 52 }),
    form_open_at: payload.form_open_at ?? source.form_open_at ?? null,
    form_close_at: payload.form_close_at ?? source.form_close_at ?? null,
    project_start_date: payload.project_start_date ?? source.project_start_date ?? null,
    project_end_date: payload.project_end_date ?? source.project_end_date ?? null,
    allow_solo: toBoolean(payload.allow_solo, source.allow_solo ?? false),
    requires_github: toBoolean(payload.requires_github, source.requires_github ?? false),
    allow_custom_tech: toBoolean(payload.allow_custom_tech, source.allow_custom_tech ?? true),
    tracker_template: payload.tracker_template ?? source.tracker_template ?? {},
    sort_order: toInt(payload.sort_order, source.sort_order ?? 0, { min: 0, max: 9999 }),
  };

  if (next.min_team_size > next.max_team_size) {
    throw createHttpError(400, 'Project type min_team_size cannot be greater than max_team_size');
  }

  if (!next.allow_solo && next.min_team_size < 2) {
    next.min_team_size = 2;
  }

  ensureChronological(next.form_open_at, next.form_close_at, 'Form open time', 'form close time');
  ensureChronological(next.project_start_date, next.project_end_date, 'Project start date', 'project end date');

  return next;
};

const normalizeTrackPayload = (payload = {}, current = null) => ({
  display_name: normalizeDisplayName(payload.display_name, current?.display_name || 'Untitled Track'),
  description: payload.description ?? current?.description ?? null,
  is_active: toBoolean(payload.is_active, current?.is_active ?? true),
  allow_custom_tech: toBoolean(payload.allow_custom_tech, current?.allow_custom_tech ?? true),
  sort_order: toInt(payload.sort_order, current?.sort_order ?? 0, { min: 0, max: 9999 }),
});

const normalizeTechnologyPayload = (payload = {}, current = null) => {
  const technologyName = String(payload.technology_name ?? current?.technology_name ?? '').trim();
  if (!technologyName) {
    throw createHttpError(400, 'technology_name is required');
  }

  return {
    technology_name: technologyName,
    is_active: toBoolean(payload.is_active, current?.is_active ?? true),
    sort_order: toInt(payload.sort_order, current?.sort_order ?? 0, { min: 0, max: 9999 }),
  };
};

export const getAdminSettingsBundleService = async () => {
  const [sectionRows, projectTypes, tracks, technologies] = await Promise.all([
    getAdminSettingsSections(SECTION_KEYS),
    listProjectTypes(),
    listTracks(),
    listTrackTechnologies(),
  ]);

  const sectionMap = Object.fromEntries(sectionRows.map((row) => [row.section_key, row.setting_value]));
  const technologiesByTrack = technologies.reduce((acc, item) => {
    if (!acc[item.track_key]) acc[item.track_key] = [];
    acc[item.track_key].push(item);
    return acc;
  }, {});

  return {
    general: {
      ...DEFAULT_SECTIONS.general,
      ...(sectionMap.general || {}),
    },
    team_rules: {
      ...DEFAULT_SECTIONS.team_rules,
      ...(sectionMap.team_rules || {}),
    },
    project_form_rules: {
      ...DEFAULT_SECTIONS.project_form_rules,
      ...(sectionMap.project_form_rules || {}),
    },
    project_types: projectTypes,
    tracks: tracks.map((track) => ({
      ...track,
      technologies: technologiesByTrack[track.track_key] || [],
    })),
  };
};

export const updateAdminSettingsSectionService = async ({ sectionKey, payload, updatedBy }) => {
  const normalizedSectionKey = String(sectionKey || '').trim().toLowerCase();
  const nextValue = normalizeSectionValue(normalizedSectionKey, payload);
  const row = await upsertAdminSettingsSection({
    sectionKey: normalizedSectionKey,
    settingValue: nextValue,
    updatedBy,
  });

  return row?.setting_value || nextValue;
};

export const listProjectTypesService = async () => listProjectTypes();

export const createProjectTypeService = async ({ projectTypeKey, payload, updatedBy }) => {
  const normalizedKey = normalizeKey(projectTypeKey || payload?.project_type_key);
  if (!normalizedKey) {
    throw createHttpError(400, 'project_type_key is required');
  }

  const current = await getProjectTypeByKey(normalizedKey);
  if (current) {
    throw createHttpError(409, 'Project type already exists');
  }

  const normalizedPayload = normalizeProjectTypePayload(payload);
  return await upsertProjectType({ projectTypeKey: normalizedKey, payload: normalizedPayload, updatedBy });
};

export const updateProjectTypeService = async ({ projectTypeKey, payload, updatedBy }) => {
  const normalizedKey = normalizeKey(projectTypeKey);
  const current = await getProjectTypeByKey(normalizedKey);
  if (!current) {
    throw createHttpError(404, 'Project type not found');
  }

  const normalizedPayload = normalizeProjectTypePayload(payload, current);
  return await upsertProjectType({ projectTypeKey: normalizedKey, payload: normalizedPayload, updatedBy });
};

export const deleteProjectTypeService = async (projectTypeKey) => {
  const normalizedKey = normalizeKey(projectTypeKey);
  if (normalizedKey === 'OTHER') {
    throw createHttpError(400, 'The OTHER project type cannot be deleted');
  }

  const deleted = await deleteProjectTypeByKey(normalizedKey);
  if (!deleted) {
    throw createHttpError(404, 'Project type not found');
  }

  return deleted;
};

export const listTracksService = async () => {
  const [tracks, technologies] = await Promise.all([listTracks(), listTrackTechnologies()]);
  const technologiesByTrack = technologies.reduce((acc, item) => {
    if (!acc[item.track_key]) acc[item.track_key] = [];
    acc[item.track_key].push(item);
    return acc;
  }, {});

  return tracks.map((track) => ({
    ...track,
    technologies: technologiesByTrack[track.track_key] || [],
  }));
};

export const createTrackService = async ({ trackKey, payload, updatedBy }) => {
  const normalizedKey = normalizeKey(trackKey || payload?.track_key);
  if (!normalizedKey) {
    throw createHttpError(400, 'track_key is required');
  }

  const current = await getTrackByKey(normalizedKey);
  if (current) {
    throw createHttpError(409, 'Track already exists');
  }

  const normalizedPayload = normalizeTrackPayload(payload);
  return await upsertTrack({ trackKey: normalizedKey, payload: normalizedPayload, updatedBy });
};

export const updateTrackService = async ({ trackKey, payload, updatedBy }) => {
  const normalizedKey = normalizeKey(trackKey);
  const current = await getTrackByKey(normalizedKey);
  if (!current) {
    throw createHttpError(404, 'Track not found');
  }

  const normalizedPayload = normalizeTrackPayload(payload, current);
  return await upsertTrack({ trackKey: normalizedKey, payload: normalizedPayload, updatedBy });
};

export const deleteTrackService = async (trackKey) => {
  const normalizedKey = normalizeKey(trackKey);
  if (normalizedKey === 'OTHER') {
    throw createHttpError(400, 'The OTHER track cannot be deleted');
  }

  const deleted = await deleteTrackByKey(normalizedKey);
  if (!deleted) {
    throw createHttpError(404, 'Track not found');
  }

  return deleted;
};

export const createTrackTechnologyService = async ({ trackKey, payload, updatedBy }) => {
  const normalizedTrackKey = normalizeKey(trackKey);
  const track = await getTrackByKey(normalizedTrackKey);
  if (!track) {
    throw createHttpError(404, 'Track not found');
  }

  const normalizedPayload = normalizeTechnologyPayload(payload);
  return await createTrackTechnology({
    trackKey: normalizedTrackKey,
    technologyName: normalizedPayload.technology_name,
    isActive: normalizedPayload.is_active,
    sortOrder: normalizedPayload.sort_order,
    updatedBy,
  });
};

export const updateTrackTechnologyService = async ({ trackKey, technologyId, payload, updatedBy }) => {
  const normalizedTrackKey = normalizeKey(trackKey);
  const track = await getTrackByKey(normalizedTrackKey);
  if (!track) {
    throw createHttpError(404, 'Track not found');
  }

  const current = await getTrackTechnologyById(Number(technologyId));
  if (!current) {
    throw createHttpError(404, 'Technology not found');
  }

  const normalizedPayload = normalizeTechnologyPayload(payload, current);
  return await updateTrackTechnology({
    technologyId: Number(technologyId),
    trackKey: normalizedTrackKey,
    technologyName: normalizedPayload.technology_name,
    isActive: normalizedPayload.is_active,
    sortOrder: normalizedPayload.sort_order,
    updatedBy,
  });
};

export const deleteTrackTechnologyService = async (technologyId) => {
  const deleted = await deleteTrackTechnologyById(Number(technologyId));
  if (!deleted) {
    throw createHttpError(404, 'Technology not found');
  }

  return deleted;
};
