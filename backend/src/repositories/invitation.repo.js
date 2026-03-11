import pool from '../config/db.js';

export const hasPendingInvite = async (teamId, invitedEnrollmentId) => {
  const q = `
    SELECT 1 FROM team_invitations
    WHERE team_id = $1
      AND invited_enrollment_id = $2
      AND status = 'PENDING'
  `;
  const r = await pool.query(q, [teamId, invitedEnrollmentId]);
  return r.rowCount > 0;
};

export const createOrResetInvite = async ({
  teamId,
  invitedEnrollmentId,
  invitedByEnrollmentId,
}) => {
  const q = `
    INSERT INTO team_invitations (
      team_id,
      invited_enrollment_id,
      invited_by_enrollment_id,
      status
    )
    VALUES ($1, $2, $3, 'PENDING')
    ON CONFLICT (team_id, invited_enrollment_id)
    DO UPDATE SET
      status = 'PENDING',
      invited_by_enrollment_id = EXCLUDED.invited_by_enrollment_id,
      created_at = CURRENT_TIMESTAMP
  `;
  await pool.query(q, [
    teamId,
    invitedEnrollmentId,
    invitedByEnrollmentId,
  ]);
};


export const getInvitationsForStudent = async (enrollmentId) => {
  const q = `
    SELECT
      ti.id,
      ti.team_id,
      ti.invited_by_enrollment_id,
      ti.status,
      ti.created_at
    FROM team_invitations ti
    WHERE ti.invited_enrollment_id = $1
      AND ti.status = 'PENDING'
    ORDER BY ti.created_at DESC
  `;
  const r = await pool.query(q, [enrollmentId]);
  return r.rows;
};



export const getInvitationById = async (inviteId) => {
  const q = `SELECT * FROM team_invitations WHERE id = $1`;
  const r = await pool.query(q, [inviteId]);
  return r.rows[0];
};

export const updateInvitationStatus = async (inviteId, status) => {
  const q = `
    UPDATE team_invitations
    SET status = $2
    WHERE id = $1
  `;
  await pool.query(q, [inviteId, status]);
};

/* =========================
   CANCEL PENDING INVITATION
========================= */
export const cancelPendingInvite = async (inviteId, teamId) => {
  const q = `
    DELETE FROM team_invitations
    WHERE id = $1
      AND team_id = $2
      AND status = 'PENDING'
  `;
  const r = await pool.query(q, [inviteId, teamId]);
  return r.rowCount > 0;
};
