import pool from '../config/db.js';

export const getAdminSettingsSections = async (sectionKeys) => {
  const q = `
    SELECT section_key, setting_value, updated_at, updated_by
    FROM admin_settings
    WHERE section_key = ANY($1::varchar[])
  `;

  const { rows } = await pool.query(q, [sectionKeys]);
  return rows;
};

export const upsertAdminSettingsSection = async ({ sectionKey, settingValue, updatedBy }) => {
  const q = `
    INSERT INTO admin_settings (
      section_key,
      setting_value,
      updated_by
    )
    VALUES ($1, $2::jsonb, $3)
    ON CONFLICT (section_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING section_key, setting_value, updated_by, updated_at
  `;

  const { rows } = await pool.query(q, [sectionKey, JSON.stringify(settingValue), updatedBy || null]);
  return rows[0] || null;
};

export const listProjectTypes = async () => {
  const q = `
    SELECT
      project_type_key,
      display_name,
      description,
      is_active,
      allowed_semesters,
      min_team_size,
      max_team_size,
      default_total_weeks,
      form_open_at,
      form_close_at,
      project_start_date,
      project_end_date,
      allow_solo,
      requires_github,
      allow_custom_tech,
      tracker_template,
      sort_order,
      updated_at,
      updated_by
    FROM project_types
    ORDER BY sort_order ASC, display_name ASC
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const getProjectTypeByKey = async (projectTypeKey) => {
  const q = `
    SELECT
      project_type_key,
      display_name,
      description,
      is_active,
      allowed_semesters,
      min_team_size,
      max_team_size,
      default_total_weeks,
      form_open_at,
      form_close_at,
      project_start_date,
      project_end_date,
      allow_solo,
      requires_github,
      allow_custom_tech,
      tracker_template,
      sort_order,
      updated_at,
      updated_by
    FROM project_types
    WHERE project_type_key = $1
  `;

  const { rows } = await pool.query(q, [projectTypeKey]);
  return rows[0] || null;
};

export const upsertProjectType = async ({ projectTypeKey, payload, updatedBy }) => {
  const q = `
    INSERT INTO project_types (
      project_type_key,
      display_name,
      description,
      is_active,
      allowed_semesters,
      min_team_size,
      max_team_size,
      default_total_weeks,
      form_open_at,
      form_close_at,
      project_start_date,
      project_end_date,
      allow_solo,
      requires_github,
      allow_custom_tech,
      tracker_template,
      sort_order,
      updated_by
    )
    VALUES (
      $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18
    )
    ON CONFLICT (project_type_key)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      allowed_semesters = EXCLUDED.allowed_semesters,
      min_team_size = EXCLUDED.min_team_size,
      max_team_size = EXCLUDED.max_team_size,
      default_total_weeks = EXCLUDED.default_total_weeks,
      form_open_at = EXCLUDED.form_open_at,
      form_close_at = EXCLUDED.form_close_at,
      project_start_date = EXCLUDED.project_start_date,
      project_end_date = EXCLUDED.project_end_date,
      allow_solo = EXCLUDED.allow_solo,
      requires_github = EXCLUDED.requires_github,
      allow_custom_tech = EXCLUDED.allow_custom_tech,
      tracker_template = EXCLUDED.tracker_template,
      sort_order = EXCLUDED.sort_order,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    projectTypeKey,
    payload.display_name,
    payload.description ?? null,
    payload.is_active,
    JSON.stringify(payload.allowed_semesters ?? []),
    payload.min_team_size,
    payload.max_team_size,
    payload.default_total_weeks,
    payload.form_open_at ?? null,
    payload.form_close_at ?? null,
    payload.project_start_date ?? null,
    payload.project_end_date ?? null,
    payload.allow_solo,
    payload.requires_github,
    payload.allow_custom_tech,
    JSON.stringify(payload.tracker_template ?? {}),
    payload.sort_order,
    updatedBy || null,
  ];

  const { rows } = await pool.query(q, values);
  return rows[0] || null;
};

export const deleteProjectTypeByKey = async (projectTypeKey) => {
  const q = `DELETE FROM project_types WHERE project_type_key = $1 RETURNING project_type_key`;
  const { rows } = await pool.query(q, [projectTypeKey]);
  return rows[0] || null;
};

export const listTracks = async () => {
  const q = `
    SELECT
      track_key,
      display_name,
      description,
      is_active,
      allow_custom_tech,
      sort_order,
      updated_at,
      updated_by
    FROM track_catalog
    ORDER BY sort_order ASC, display_name ASC
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const getTrackByKey = async (trackKey) => {
  const q = `
    SELECT
      track_key,
      display_name,
      description,
      is_active,
      allow_custom_tech,
      sort_order,
      updated_at,
      updated_by
    FROM track_catalog
    WHERE track_key = $1
  `;

  const { rows } = await pool.query(q, [trackKey]);
  return rows[0] || null;
};

export const upsertTrack = async ({ trackKey, payload, updatedBy }) => {
  const q = `
    INSERT INTO track_catalog (
      track_key,
      display_name,
      description,
      is_active,
      allow_custom_tech,
      sort_order,
      updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (track_key)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      allow_custom_tech = EXCLUDED.allow_custom_tech,
      sort_order = EXCLUDED.sort_order,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const { rows } = await pool.query(q, [
    trackKey,
    payload.display_name,
    payload.description ?? null,
    payload.is_active,
    payload.allow_custom_tech,
    payload.sort_order,
    updatedBy || null,
  ]);
  return rows[0] || null;
};

export const deleteTrackByKey = async (trackKey) => {
  const q = `DELETE FROM track_catalog WHERE track_key = $1 RETURNING track_key`;
  const { rows } = await pool.query(q, [trackKey]);
  return rows[0] || null;
};

export const listTrackTechnologies = async () => {
  const q = `
    SELECT
      technology_id,
      track_key,
      technology_name,
      is_active,
      sort_order,
      updated_at,
      updated_by
    FROM track_technologies
    ORDER BY track_key ASC, sort_order ASC, technology_name ASC
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const getTrackTechnologyById = async (technologyId) => {
  const q = `
    SELECT technology_id, track_key, technology_name, is_active, sort_order, updated_at, updated_by
    FROM track_technologies
    WHERE technology_id = $1
  `;
  const { rows } = await pool.query(q, [technologyId]);
  return rows[0] || null;
};

export const createTrackTechnology = async ({ trackKey, technologyName, isActive, sortOrder, updatedBy }) => {
  const q = `
    INSERT INTO track_technologies (
      track_key,
      technology_name,
      is_active,
      sort_order,
      updated_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const { rows } = await pool.query(q, [trackKey, technologyName, isActive, sortOrder, updatedBy || null]);
  return rows[0] || null;
};

export const updateTrackTechnology = async ({ technologyId, trackKey, technologyName, isActive, sortOrder, updatedBy }) => {
  const q = `
    UPDATE track_technologies
    SET
      track_key = $2,
      technology_name = $3,
      is_active = $4,
      sort_order = $5,
      updated_by = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE technology_id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(q, [technologyId, trackKey, technologyName, isActive, sortOrder, updatedBy || null]);
  return rows[0] || null;
};

export const deleteTrackTechnologyById = async (technologyId) => {
  const q = `DELETE FROM track_technologies WHERE technology_id = $1 RETURNING technology_id`;
  const { rows } = await pool.query(q, [technologyId]);
  return rows[0] || null;
};
