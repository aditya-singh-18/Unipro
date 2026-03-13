import pool from '../config/db.js';

const JSONB_FIELDS = new Set([
  'semesters',
  'submission_allowed_days',
  'required_submission_fields',
  'allowed_file_types',
]);

export const getSystemSettings = async () => {
  const q = `
    SELECT *
    FROM admin_system_settings
    WHERE id = 1
    LIMIT 1
  `;

  const { rows } = await pool.query(q);
  return rows[0] || null;
};

export const updateSystemSettings = async ({ payload, updatedBy }) => {
  const keys = Object.keys(payload || {});
  if (!keys.length) {
    return await getSystemSettings();
  }

  const setClauses = keys.map((key, idx) =>
    JSONB_FIELDS.has(key) ? `${key} = $${idx + 1}::jsonb` : `${key} = $${idx + 1}`
  );
  const values = keys.map((key) => (JSONB_FIELDS.has(key) ? JSON.stringify(payload[key]) : payload[key]));

  const q = `
    UPDATE admin_system_settings
    SET
      ${setClauses.join(', ')},
      updated_at = CURRENT_TIMESTAMP,
      updated_by = $${keys.length + 1}
    WHERE id = 1
    RETURNING *
  `;

  const { rows } = await pool.query(q, [...values, updatedBy || null]);
  return rows[0] || null;
};

export const insertSettingsAuditLog = async ({ actorUserKey, actionType, sectionName, beforeData, afterData }) => {
  const q = `
    INSERT INTO admin_system_settings_audit_log (
      actor_user_key,
      action_type,
      section_name,
      before_data,
      after_data
    )
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
    RETURNING audit_id
  `;

  const { rows } = await pool.query(q, [
    actorUserKey || null,
    actionType,
    sectionName,
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
  ]);

  return rows[0] || null;
};

export const listProjectCycles = async () => {
  const q = `
    SELECT
      cycle_id,
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_at,
      updated_at
    FROM project_cycles
    ORDER BY is_active DESC, created_at DESC
  `;

  const { rows } = await pool.query(q);
  return rows;
};

export const createProjectCycle = async ({ cycleName, batchStartYear, batchEndYear, projectMode, actorUserKey }) => {
  const q = `
    INSERT INTO project_cycles (
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, $4, FALSE, $5, $5)
    RETURNING
      cycle_id,
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(q, [
    cycleName,
    batchStartYear,
    batchEndYear,
    projectMode,
    actorUserKey || null,
  ]);

  return rows[0] || null;
};

export const updateProjectCycle = async ({ cycleId, payload, actorUserKey }) => {
  const keys = Object.keys(payload || {});
  if (!keys.length) {
    const existing = await getProjectCycleById(cycleId);
    return existing;
  }

  const setClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
  const values = keys.map((key) => payload[key]);

  const q = `
    UPDATE project_cycles
    SET
      ${setClauses.join(', ')},
      updated_at = CURRENT_TIMESTAMP,
      updated_by = $${keys.length + 1}
    WHERE cycle_id = $${keys.length + 2}
    RETURNING
      cycle_id,
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(q, [...values, actorUserKey || null, cycleId]);
  return rows[0] || null;
};

export const getProjectCycleById = async (cycleId) => {
  const q = `
    SELECT
      cycle_id,
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_at,
      updated_at
    FROM project_cycles
    WHERE cycle_id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(q, [cycleId]);
  return rows[0] || null;
};

export const deactivateAllProjectCycles = async () => {
  const q = `
    UPDATE project_cycles
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE is_active = TRUE
  `;

  await pool.query(q);
};

export const activateProjectCycle = async ({ cycleId, actorUserKey }) => {
  const q = `
    UPDATE project_cycles
    SET
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = $2
    WHERE cycle_id = $1
    RETURNING
      cycle_id,
      cycle_name,
      batch_start_year,
      batch_end_year,
      project_mode,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(q, [cycleId, actorUserKey || null]);
  return rows[0] || null;
};
