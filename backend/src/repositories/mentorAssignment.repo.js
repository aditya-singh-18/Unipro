import pool from '../config/db.js';

let mentorAssignmentTableSupport = null;

const getMentorAssignmentTableSupport = async () => {
  if (mentorAssignmentTableSupport) {
    return mentorAssignmentTableSupport;
  }

  const q = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('mentor_assignment_recommendations', 'mentor_assignment_audit')
  `;

  const { rows } = await pool.query(q);
  const tables = new Set(rows.map((row) => row.table_name));

  mentorAssignmentTableSupport = {
    recommendations: tables.has('mentor_assignment_recommendations'),
    audit: tables.has('mentor_assignment_audit'),
  };

  return mentorAssignmentTableSupport;
};

export const insertMentorRecommendations = async ({ projectId, batchKey, recommendations, scoringVersion = 'v1' }) => {
  const support = await getMentorAssignmentTableSupport();
  if (!support.recommendations || !recommendations?.length) {
    return [];
  }

  const q = `
    INSERT INTO mentor_assignment_recommendations (
      project_id,
      batch_key,
      mentor_employee_id,
      rank_position,
      score,
      track_score,
      tech_score,
      proficiency_score,
      workload_score,
      fairness_score,
      reason_json,
      scoring_version,
      is_selected
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11::jsonb,
      $12,
      $13
    )
    RETURNING recommendation_id
  `;

  const results = [];
  for (const recommendation of recommendations) {
    const { rows } = await pool.query(q, [
      projectId,
      batchKey,
      recommendation.mentor_employee_id,
      recommendation.rank_position,
      recommendation.score,
      recommendation.track_score,
      recommendation.tech_score,
      recommendation.proficiency_score,
      recommendation.workload_score,
      recommendation.fairness_score,
      JSON.stringify(recommendation.reason_json || {}),
      scoringVersion,
      recommendation.is_selected || false,
    ]);

    results.push(rows[0] || null);
  }

  return results;
};

export const getLatestMentorRecommendations = async ({ projectId, limit = 10 }) => {
  const support = await getMentorAssignmentTableSupport();
  if (!support.recommendations) {
    return [];
  }

  const q = `
    WITH latest_batch AS (
      SELECT batch_key
      FROM mentor_assignment_recommendations
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    )
    SELECT
      recommendation_id,
      project_id,
      batch_key,
      mentor_employee_id,
      rank_position,
      score,
      track_score,
      tech_score,
      proficiency_score,
      workload_score,
      fairness_score,
      reason_json,
      scoring_version,
      created_at,
      is_selected
    FROM mentor_assignment_recommendations
    WHERE project_id = $1
      AND batch_key = (SELECT batch_key FROM latest_batch)
    ORDER BY rank_position ASC
    LIMIT $2
  `;

  const { rows } = await pool.query(q, [projectId, limit]);
  return rows;
};

export const insertMentorAssignmentAudit = async ({
  projectId,
  mentorEmployeeId,
  decisionSource,
  recommendedScore,
  approvedBy,
  autoAssigned = false,
  notes,
  metadata,
}) => {
  const support = await getMentorAssignmentTableSupport();
  if (!support.audit) {
    return null;
  }

  const q = `
    INSERT INTO mentor_assignment_audit (
      project_id,
      mentor_employee_id,
      decision_source,
      recommended_score,
      approved_by,
      auto_assigned,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING audit_id
  `;

  const { rows } = await pool.query(q, [
    projectId,
    mentorEmployeeId || null,
    decisionSource,
    recommendedScore ?? null,
    approvedBy || null,
    autoAssigned,
    notes || null,
    JSON.stringify(metadata || {}),
  ]);

  return rows[0] || null;
};