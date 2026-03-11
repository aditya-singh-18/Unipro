import pool from '../config/db.js';

export const insertMeeting = async ({
  mentorId,
  title,
  agenda,
  meetingType,
  meetingPlatform,
  meetingLink,
  meetingDate,
  startTime,
  endTime,
  scope,
  projects,
  teams,
  participants,
  status,
}) => {
  const query = `
    INSERT INTO meetings (
      mentor_id,
      title,
      agenda,
      meeting_type,
      meeting_platform,
      meeting_link,
      meeting_date,
      start_time,
      end_time,
      scope,
      projects,
      teams,
      participants,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14
    )
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    mentorId,
    title,
    agenda || null,
    meetingType || 'online',
    meetingPlatform || null,
    meetingLink || null,
    meetingDate,
    startTime || null,
    endTime || null,
    scope || 'selected',
    JSON.stringify(projects || []),
    JSON.stringify(teams || []),
    JSON.stringify(participants || []),
    status || 'scheduled',
  ]);

  return rows[0];
};

export const getMeetingsByMentorId = async (mentorId) => {
  const query = `
    SELECT *
    FROM meetings
    WHERE mentor_id = $1
    ORDER BY meeting_date ASC, start_time ASC NULLS LAST, created_at DESC
  `;
  const { rows } = await pool.query(query, [mentorId]);
  return rows;
};

export const getMeetingsVisibleToMentor = async ({ mentorId, projectIds = [] }) => {
  const normalizedProjectIds = [...new Set((projectIds || []).map((id) => String(id).trim()).filter(Boolean))];

  const query = `
    SELECT DISTINCT m.*
    FROM meetings m
    WHERE m.mentor_id = $1
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(m.projects, '[]'::jsonb)) p(value)
        WHERE p.value = ANY($2::text[])
      )
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(m.teams, '[]'::jsonb)) t(value)
        WHERE t.value = ANY($2::text[])
      )
    ORDER BY m.meeting_date ASC, m.start_time ASC NULLS LAST, m.created_at DESC
  `;

  const { rows } = await pool.query(query, [mentorId, normalizedProjectIds]);
  return rows;
};

export const getMeetingsByProjectId = async (projectId) => {
  const query = `
    SELECT *
    FROM meetings
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(projects, '[]'::jsonb)) p(value)
      WHERE p.value = $1::text
    )
    ORDER BY meeting_date DESC, start_time DESC NULLS LAST
  `;

  const { rows } = await pool.query(query, [String(projectId)]);
  return rows;
};

export const getMeetingById = async (meetingId) => {
  const query = `SELECT * FROM meetings WHERE id = $1`;
  const { rows } = await pool.query(query, [meetingId]);
  return rows[0] || null;
};

export const getProjectIdsAssignedToMentor = async (mentorId) => {
  const query = `
    SELECT project_id
    FROM projects
    WHERE mentor_employee_id = $1
  `;

  const { rows } = await pool.query(query, [mentorId]);
  return rows.map((row) => String(row.project_id));
};

export const getTeamIdsOfStudent = async (enrollmentId) => {
  const query = `
    SELECT DISTINCT team_id
    FROM team_members
    WHERE enrollment_id = $1
  `;

  const { rows } = await pool.query(query, [enrollmentId]);
  return rows.map((row) => String(row.team_id));
};

export const updateMeetingById = async ({
  meetingId,
  title,
  agenda,
  meetingDate,
  startTime,
  endTime,
  meetingLink,
  meetingPlatform,
  projects,
}) => {
  const query = `
    UPDATE meetings
    SET
      title = COALESCE($1, title),
      agenda = COALESCE($2, agenda),
      meeting_date = COALESCE($3, meeting_date),
      start_time = COALESCE($4, start_time),
      end_time = COALESCE($5, end_time),
      meeting_link = COALESCE($6, meeting_link),
      meeting_platform = COALESCE($7, meeting_platform),
      projects = COALESCE($8::jsonb, projects),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    title ?? null,
    agenda ?? null,
    meetingDate ?? null,
    startTime ?? null,
    endTime ?? null,
    meetingLink ?? null,
    meetingPlatform ?? null,
    projects ? JSON.stringify(projects) : null,
    meetingId,
  ]);

  return rows[0] || null;
};

export const deleteMeetingById = async (meetingId) => {
  const query = `DELETE FROM meetings WHERE id = $1 RETURNING id`;
  const { rows } = await pool.query(query, [meetingId]);
  return rows[0] || null;
};

export const insertMeetingMinutes = async ({
  meetingId,
  discussionSummary,
  keyPoints,
  decisions,
  actionItems,
  nextMeetingDate,
  createdBy,
}) => {
  const query = `
    INSERT INTO meeting_minutes (
      meeting_id,
      discussion_summary,
      key_points,
      decisions,
      action_items,
      next_meeting_date,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    meetingId,
    discussionSummary || null,
    keyPoints || null,
    decisions || null,
    JSON.stringify(actionItems || []),
    nextMeetingDate || null,
    createdBy || null,
  ]);

  return rows[0];
};

export const getMeetingMinutesByMeetingId = async (meetingId) => {
  const query = `
    SELECT *
    FROM meeting_minutes
    WHERE meeting_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [meetingId]);
  return rows;
};

export const insertMeetingAttachment = async ({
  meetingId,
  fileName,
  fileUrl,
  fileType,
  uploadedBy,
}) => {
  const query = `
    INSERT INTO meeting_attachments (
      meeting_id,
      file_name,
      file_url,
      file_type,
      uploaded_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    meetingId,
    fileName || null,
    fileUrl || null,
    fileType || null,
    uploadedBy || null,
  ]);

  return rows[0];
};

export const getMeetingAttachmentsByMeetingId = async (meetingId) => {
  const query = `
    SELECT id, meeting_id, file_name, file_url, file_type, uploaded_by, created_at
    FROM meeting_attachments
    WHERE meeting_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [meetingId]);
  return rows;
};

export const getMeetingsVisibleToStudent = async ({ teamIds = [], enrollmentId }) => {
  const normalizedTeamIds = [...new Set((teamIds || []).map((id) => String(id).trim()).filter(Boolean))];

  const query = `
    SELECT DISTINCT m.*
    FROM meetings m
    WHERE m.status != 'cancelled'
      AND (
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(m.projects, '[]'::jsonb)) p(value)
          WHERE p.value = ANY($1::text[])
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(m.teams, '[]'::jsonb)) t(value)
          WHERE t.value = ANY($1::text[])
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(m.participants, '[]'::jsonb)) par(value)
          WHERE par.value = $2::text
        )
      )
    ORDER BY m.meeting_date ASC, m.start_time ASC NULLS LAST
  `;

  const { rows } = await pool.query(query, [normalizedTeamIds, String(enrollmentId)]);
  return rows;
};

export const updateMeetingStatusById = async ({ meetingId, status }) => {
  const query = `
    UPDATE meetings
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  const { rows } = await pool.query(query, [status, meetingId]);
  return rows[0] || null;
};
