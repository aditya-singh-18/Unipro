import pool from '../config/db.js';

export const getTrackerPolicyEntries = async (policyKeys) => {
  const q = `
    SELECT policy_key, policy_value, updated_at
    FROM tracker_policy_settings
    WHERE policy_key = ANY($1::varchar[])
  `;

  const { rows } = await pool.query(q, [policyKeys]);
  return rows;
};

export const upsertTrackerPolicyEntry = async ({ policyKey, policyValue, updatedBy }) => {
  const q = `
    INSERT INTO tracker_policy_settings (
      policy_key,
      policy_value,
      updated_by
    )
    VALUES ($1, $2::jsonb, $3)
    ON CONFLICT (policy_key)
    DO UPDATE SET
      policy_value = EXCLUDED.policy_value,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING policy_key, policy_value, updated_by, updated_at
  `;

  const { rows } = await pool.query(q, [
    policyKey,
    JSON.stringify(policyValue),
    updatedBy || null,
  ]);
  return rows[0] || null;
};
