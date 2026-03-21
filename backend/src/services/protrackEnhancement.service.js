import pool from '../config/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { recalculateScore } from './scoreCalculator.js';

const assertProjectExists = async (projectId) => {
  const { rows } = await pool.query(
    `
      SELECT project_id, mentor_employee_id, github_repo_url, github_webhook_secret
      FROM projects
      WHERE project_id = $1
      LIMIT 1
    `,
    [projectId]
  );

  if (!rows[0]) {
    throw new Error('Project not found');
  }

  return rows[0];
};

const normalizeRepoUrl = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/\/$/, '');

const verifyGithubSignature = ({ secret, payload, rawBody, signatureHeader }) => {
  if (!secret) return true;
  if (!signatureHeader || !String(signatureHeader).startsWith('sha256=')) return false;

  const payloadBuffer =
    rawBody && Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(JSON.stringify(payload || {}), 'utf8');

  const expected = `sha256=${crypto
    .createHmac('sha256', String(secret))
    .update(payloadBuffer)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(String(signatureHeader), 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

const resolveGithubOAuthRedirectUri = (apiBaseUrl) => {
  const configured = String(process.env.GITHUB_OAUTH_REDIRECT_URI || '').trim();
  if (configured) return configured;

  const normalizedApiBase = String(apiBaseUrl || '').trim().replace(/\/$/, '');
  if (!normalizedApiBase) {
    throw new Error('Unable to resolve GitHub OAuth callback URL');
  }

  return `${normalizedApiBase}/api/tracker/github/oauth/callback`;
};

const exchangeGithubCodeForAccessToken = async ({ code, state, redirectUri }) => {
  const clientId = String(process.env.GITHUB_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GITHUB_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth is not configured');
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state,
      redirect_uri: redirectUri,
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  const accessToken = String(tokenPayload?.access_token || '').trim();
  if (!tokenResponse.ok || !accessToken) {
    throw new Error('Failed to exchange GitHub OAuth code');
  }

  return accessToken;
};

const fetchGithubUsername = async (accessToken) => {
  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'unipro-protrack',
    },
  });

  const profile = await profileResponse.json().catch(() => ({}));
  const username = String(profile?.login || '').trim();
  if (!profileResponse.ok || !username) {
    throw new Error('Failed to fetch GitHub profile');
  }

  return username;
};

const linkGithubUsernameForUser = async ({ userKey, githubUsername }) => {
  const username = String(githubUsername || '').trim();
  if (!username || !/^[A-Za-z0-9-]{1,39}$/.test(username)) {
    throw new Error('Invalid GitHub username from OAuth profile');
  }

  const duplicate = await pool.query(
    `
      SELECT user_key
      FROM users
      WHERE LOWER(github_username) = LOWER($1)
        AND user_key <> $2
      LIMIT 1
    `,
    [username, userKey]
  );

  if (duplicate.rowCount > 0) {
    throw new Error('GitHub username already linked with another account');
  }

  const { rows } = await pool.query(
    `
      UPDATE users
      SET github_username = $2
      WHERE user_key = $1
      RETURNING user_key, github_username
    `,
    [userKey, username]
  );

  if (!rows[0]) {
    throw new Error('User not found');
  }

  return rows[0];
};

const assertProjectAccess = async ({ projectId, userKey, role }) => {
  const upperRole = String(role || '').toUpperCase();
  if (upperRole === 'ADMIN') return;

  const project = await assertProjectExists(projectId);

  if (upperRole === 'MENTOR') {
    if (project.mentor_employee_id !== userKey) {
      throw new Error('You are not assigned to this project');
    }
    return;
  }

  if (upperRole === 'STUDENT') {
    const { rowCount } = await pool.query(
      `
        SELECT 1
        FROM team_members tm
        JOIN projects p ON p.project_id = tm.team_id
        WHERE p.project_id = $1
          AND tm.enrollment_id = $2
        LIMIT 1
      `,
      [projectId, userKey]
    );

    if (rowCount === 0) {
      throw new Error('You are not authorized to access this project');
    }
    return;
  }

  throw new Error('Invalid role');
};

export const createDailyLogEntryService = async ({ projectId, actorUserKey, actorRole, payload }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can submit daily logs');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const whatIDid = String(payload?.what_i_did || '').trim();
  const whatIWillDo = String(payload?.what_i_will_do || '').trim();

  if (whatIDid.length < 10 || !whatIWillDo) {
    throw new Error('what_i_did (min 10 chars) and what_i_will_do are required');
  }

  const tag = String(payload?.tag || 'progress').trim().toLowerCase();
  const allowedTags = new Set(['progress', 'done', 'fix', 'review', 'blocker', 'meeting']);
  if (!allowedTags.has(tag)) {
    throw new Error('Invalid tag');
  }

  const taskId = payload?.task_id ? Number(payload.task_id) : null;
  const weekId = payload?.week_id ? Number(payload.week_id) : null;

  const { rows } = await pool.query(
    `
      INSERT INTO daily_logs (
        student_user_key,
        project_id,
        task_id,
        week_id,
        log_date,
        what_i_did,
        what_i_will_do,
        blockers,
        tag,
        commit_count,
        commit_link,
        hours_spent,
        is_late
      )
      VALUES (
        $1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8,
        GREATEST(0, COALESCE($9::int, 0)),
        NULLIF($10, ''),
        $11,
        (CURRENT_TIME > TIME '23:00:00')
      )
      ON CONFLICT (student_user_key, project_id, log_date)
      DO NOTHING
      RETURNING *
    `,
    [
      actorUserKey,
      projectId,
      taskId,
      weekId,
      whatIDid,
      whatIWillDo,
      payload?.blockers ? String(payload.blockers).trim() : null,
      tag,
      payload?.commit_count,
      payload?.commit_link ? String(payload.commit_link).trim() : null,
      payload?.hours_spent ?? null,
    ]
  );

  if (!rows[0]) {
    throw new Error('Daily log already submitted for today');
  }

  const score = await recalculateScore(actorUserKey, projectId);
  return { log: rows[0], score };
};

export const getDailyLogsService = async ({ projectId, actorUserKey, actorRole }) => {
  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const isStudent = String(actorRole || '').toUpperCase() === 'STUDENT';

  const { rows } = await pool.query(
    `
      SELECT dl.*,
             u.email AS student_email
      FROM daily_logs dl
      JOIN users u ON u.user_key = dl.student_user_key
      WHERE dl.project_id = $1
        AND ($2::boolean = false OR dl.student_user_key = $3)
      ORDER BY dl.log_date DESC, dl.created_at DESC
      LIMIT 200
    `,
    [projectId, isStudent, actorUserKey]
  );

  return rows;
};

export const getTodayDailyLogService = async ({ projectId, actorUserKey, actorRole }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can check own daily log status');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const { rows } = await pool.query(
    `
      SELECT *
      FROM daily_logs
      WHERE project_id = $1
        AND student_user_key = $2
        AND log_date = CURRENT_DATE
      LIMIT 1
    `,
    [projectId, actorUserKey]
  );

  return {
    submitted: Boolean(rows[0]),
    log: rows[0] || null,
  };
};

export const getDailyLogSummaryService = async ({ projectId, actorUserKey, actorRole }) => {
  const upperRole = String(actorRole || '').toUpperCase();
  if (upperRole !== 'MENTOR' && upperRole !== 'ADMIN') {
    throw new Error('Only mentor/admin can view daily summary');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const { rows } = await pool.query(
    `
      WITH members AS (
        SELECT tm.enrollment_id AS student_user_key
        FROM team_members tm
        JOIN projects p ON p.project_id = tm.team_id
        WHERE p.project_id = $1
      ),
      submitted AS (
        SELECT DISTINCT student_user_key
        FROM daily_logs
        WHERE project_id = $1
          AND log_date = CURRENT_DATE
      )
      SELECT
        m.student_user_key,
        CASE WHEN s.student_user_key IS NULL THEN false ELSE true END AS submitted_today
      FROM members m
      LEFT JOIN submitted s ON s.student_user_key = m.student_user_key
      ORDER BY submitted_today DESC, m.student_user_key ASC
    `,
    [projectId]
  );

  return rows;
};

export const getMyScoresService = async ({ projectId, actorUserKey, actorRole }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can access own scores');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const { rows } = await pool.query(
    `
      SELECT *
      FROM progress_scores
      WHERE project_id = $1
        AND student_user_key = $2
      ORDER BY week_number DESC
    `,
    [projectId, actorUserKey]
  );

  return rows;
};

export const getProjectScoresService = async ({ projectId, actorUserKey, actorRole }) => {
  const upperRole = String(actorRole || '').toUpperCase();
  if (upperRole !== 'MENTOR' && upperRole !== 'ADMIN') {
    throw new Error('Only mentor/admin can view all student scores');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const { rows } = await pool.query(
    `
      SELECT ps.*, sp.full_name
      FROM progress_scores ps
      LEFT JOIN student_profiles sp ON sp.enrollment_id = ps.student_user_key
      WHERE ps.project_id = $1
      ORDER BY ps.week_number DESC, ps.total_score DESC
    `,
    [projectId]
  );

  return rows;
};

export const recalculateProjectScoreService = async ({ projectId, actorUserKey, actorRole, studentUserKey }) => {
  const upperRole = String(actorRole || '').toUpperCase();
  if (upperRole !== 'MENTOR' && upperRole !== 'ADMIN') {
    throw new Error('Only mentor/admin can recalculate scores');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  if (!studentUserKey) {
    throw new Error('student_user_key is required');
  }

  return await recalculateScore(String(studentUserKey), projectId);
};

export const createMentorFeedbackService = async ({ actorUserKey, actorRole, payload }) => {
  const upperRole = String(actorRole || '').toUpperCase();
  if (upperRole !== 'MENTOR' && upperRole !== 'ADMIN') {
    throw new Error('Only mentor/admin can send feedback');
  }

  const message = String(payload?.message || '').trim();
  if (message.length < 5) {
    throw new Error('Feedback message must be at least 5 characters');
  }

  const rating = payload?.rating ? Number(payload.rating) : null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error('rating must be between 1 and 5');
  }

  const projectId = String(payload?.project_id || '').trim();
  const studentUserKey = String(payload?.student_user_key || '').trim();
  if (!projectId || !studentUserKey) {
    throw new Error('student_user_key and project_id are required');
  }

  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const { rows } = await pool.query(
    `
      INSERT INTO mentor_feedback (
        mentor_employee_id,
        student_user_key,
        project_id,
        reference_type,
        reference_id,
        message,
        rating
      )
      VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
      RETURNING *
    `,
    [
      actorUserKey,
      studentUserKey,
      projectId,
      String(payload?.reference_type || 'general').toLowerCase(),
      payload?.reference_id ? String(payload.reference_id) : null,
      message,
      rating,
    ]
  );

  return rows[0];
};

export const getMyMentorFeedbackService = async ({ actorUserKey, actorRole }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can access this endpoint');
  }

  const { rows } = await pool.query(
    `
      SELECT mf.*, mp.full_name AS mentor_name
      FROM mentor_feedback mf
      LEFT JOIN mentor_profiles mp ON mp.employee_id = mf.mentor_employee_id
      WHERE mf.student_user_key = $1
      ORDER BY mf.created_at DESC
      LIMIT 200
    `,
    [actorUserKey]
  );

  return rows;
};

export const replyToMentorFeedbackService = async ({ feedbackId, actorUserKey, actorRole, reply }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can reply to feedback');
  }

  const { rows } = await pool.query(
    `
      UPDATE mentor_feedback
      SET student_reply = $1
      WHERE feedback_id = $2
        AND student_user_key = $3
      RETURNING *
    `,
    [String(reply || '').trim(), feedbackId, actorUserKey]
  );

  if (!rows[0]) {
    throw new Error('Feedback not found');
  }

  return rows[0];
};

export const markMentorFeedbackReadService = async ({ feedbackId, actorUserKey, actorRole }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can mark feedback as read');
  }

  const { rows } = await pool.query(
    `
      UPDATE mentor_feedback
      SET is_read = TRUE
      WHERE feedback_id = $1
        AND student_user_key = $2
      RETURNING *
    `,
    [feedbackId, actorUserKey]
  );

  if (!rows[0]) {
    throw new Error('Feedback not found');
  }

  return rows[0];
};

export const getMyGithubIdentityService = async ({ actorUserKey }) => {
  const { rows } = await pool.query(
    `
      SELECT user_key, github_username
      FROM users
      WHERE user_key = $1
      LIMIT 1
    `,
    [actorUserKey]
  );

  if (!rows[0]) {
    throw new Error('User not found');
  }

  return rows[0];
};

export const createGithubOAuthStartUrlService = async ({ actorUserKey, actorRole, apiBaseUrl }) => {
  if (String(actorRole || '').toUpperCase() !== 'STUDENT') {
    throw new Error('Only students can link GitHub via OAuth');
  }

  const clientId = String(process.env.GITHUB_CLIENT_ID || '').trim();
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!clientId || !jwtSecret) {
    throw new Error('GitHub OAuth is not configured');
  }

  const redirectUri = resolveGithubOAuthRedirectUri(apiBaseUrl);
  const state = jwt.sign(
    {
      user_key: actorUserKey,
      role: 'STUDENT',
      nonce: crypto.randomUUID(),
    },
    jwtSecret,
    { expiresIn: '10m' }
  );

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  return {
    authorize_url: authorizeUrl.toString(),
    expires_in_sec: 600,
  };
};

export const completeGithubOAuthCallbackService = async ({ code, state, apiBaseUrl }) => {
  const oauthCode = String(code || '').trim();
  const oauthState = String(state || '').trim();
  if (!oauthCode || !oauthState) {
    throw new Error('Missing OAuth code/state');
  }

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  let decoded;
  try {
    decoded = jwt.verify(oauthState, jwtSecret);
  } catch {
    throw new Error('Invalid OAuth state');
  }

  const userKey = String(decoded?.user_key || '').trim().toUpperCase();
  const role = String(decoded?.role || '').toUpperCase();
  if (!userKey || role !== 'STUDENT') {
    throw new Error('Invalid OAuth state payload');
  }

  const redirectUri = resolveGithubOAuthRedirectUri(apiBaseUrl);
  const accessToken = await exchangeGithubCodeForAccessToken({
    code: oauthCode,
    state: oauthState,
    redirectUri,
  });
  const githubUsername = await fetchGithubUsername(accessToken);
  const user = await linkGithubUsernameForUser({ userKey, githubUsername });

  return {
    user_key: user.user_key,
    github_username: user.github_username,
  };
};

export const ingestGithubWebhookService = async ({
  projectId,
  payload,
  rawBody,
  signatureHeader,
  githubEvent,
}) => {
  const project = await assertProjectExists(projectId);

  const normalizedEvent = String(githubEvent || 'push').toLowerCase();
  if (normalizedEvent !== 'push') {
    return {
      accepted: true,
      ignored: true,
      reason: 'Only push events are processed',
      summary: {
        totalCommits: 0,
        storedCommits: 0,
        skippedUnknownUsers: 0,
        recalculatedFor: 0,
      },
    };
  }

  const signatureValid = verifyGithubSignature({
    secret: project.github_webhook_secret,
    payload,
    rawBody,
    signatureHeader,
  });

  if (!signatureValid) {
    throw new Error('Invalid webhook signature');
  }

  const incomingRepo = normalizeRepoUrl(payload?.repository?.html_url || payload?.repository?.clone_url);
  const configuredRepo = normalizeRepoUrl(project.github_repo_url);
  if (configuredRepo && incomingRepo && configuredRepo !== incomingRepo) {
    throw new Error('Webhook repository does not match configured project repository');
  }

  const commits = Array.isArray(payload?.commits) ? payload.commits : [];
  if (!commits.length) {
    return {
      accepted: true,
      ignored: true,
      reason: 'No commits in payload',
      summary: {
        totalCommits: 0,
        storedCommits: 0,
        skippedUnknownUsers: 0,
        recalculatedFor: 0,
      },
    };
  }

  const usernames = [...new Set(
    commits
      .map((commit) => String(commit?.author?.username || '').trim().toLowerCase())
      .filter(Boolean)
  )];

  const githubUserMap = new Map();
  if (usernames.length > 0) {
    const { rows } = await pool.query(
      `
        SELECT user_key, LOWER(github_username) AS github_username
        FROM users
        WHERE github_username IS NOT NULL
          AND LOWER(github_username) = ANY($1::text[])
      `,
      [usernames]
    );

    for (const row of rows) {
      githubUserMap.set(row.github_username, row.user_key);
    }
  }

  const branch = String(payload?.ref || '').startsWith('refs/heads/')
    ? String(payload.ref).replace('refs/heads/', '')
    : null;

  let storedCommits = 0;
  let skippedUnknownUsers = 0;
  const impactedStudents = new Set();

  for (const commit of commits) {
    const sha = String(commit?.id || '').trim();
    const authorUsername = String(commit?.author?.username || '').trim().toLowerCase();
    const studentUserKey = githubUserMap.get(authorUsername);

    if (!sha || !studentUserKey) {
      skippedUnknownUsers += 1;
      continue;
    }

    const committedAt = commit?.timestamp ? new Date(commit.timestamp) : new Date();
    if (Number.isNaN(committedAt.getTime())) {
      skippedUnknownUsers += 1;
      continue;
    }

    await pool.query(
      `
        INSERT INTO github_commits (
          student_user_key,
          project_id,
          sha,
          message,
          committed_at,
          branch,
          additions,
          deletions,
          is_merge_commit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (sha)
        DO UPDATE SET
          student_user_key = EXCLUDED.student_user_key,
          project_id = EXCLUDED.project_id,
          message = EXCLUDED.message,
          committed_at = EXCLUDED.committed_at,
          branch = EXCLUDED.branch,
          additions = EXCLUDED.additions,
          deletions = EXCLUDED.deletions,
          is_merge_commit = EXCLUDED.is_merge_commit
      `,
      [
        studentUserKey,
        projectId,
        sha,
        String(commit?.message || '').trim() || null,
        committedAt.toISOString(),
        branch,
        Number(commit?.added?.length || 0),
        Number(commit?.removed?.length || 0),
        String(commit?.message || '').toLowerCase().startsWith('merge '),
      ]
    );

    storedCommits += 1;
    impactedStudents.add(studentUserKey);
  }

  for (const studentUserKey of impactedStudents) {
    await recalculateScore(studentUserKey, projectId);
  }

  return {
    accepted: true,
    ignored: false,
    summary: {
      totalCommits: commits.length,
      storedCommits,
      skippedUnknownUsers,
      recalculatedFor: impactedStudents.size,
    },
  };
};

export const getProjectGithubCommitsService = async ({ projectId, actorUserKey, actorRole }) => {
  await assertProjectAccess({ projectId, userKey: actorUserKey, role: actorRole });

  const isStudent = String(actorRole || '').toUpperCase() === 'STUDENT';

  const { rows } = await pool.query(
    `
      SELECT gc.*,
             sp.full_name AS student_name
      FROM github_commits gc
      LEFT JOIN student_profiles sp ON sp.enrollment_id = gc.student_user_key
      WHERE gc.project_id = $1
        AND ($2::boolean = false OR gc.student_user_key = $3)
      ORDER BY gc.committed_at DESC
      LIMIT 200
    `,
    [projectId, isStudent, actorUserKey]
  );

  return rows;
};

export const updateProjectGithubConfigService = async ({
  projectId,
  actorUserKey,
  actorRole,
  payload,
}) => {
  if (String(actorRole || '').toUpperCase() !== 'ADMIN') {
    throw new Error('Only admin can update project GitHub configuration');
  }

  const repoUrlRaw = String(payload?.github_repo_url || '').trim();
  const webhookSecretRaw = String(payload?.github_webhook_secret || '').trim();

  let repoUrl = null;
  if (repoUrlRaw) {
    const normalized = normalizeRepoUrl(repoUrlRaw);
    if (!/^https?:\/\/github\.com\/.+\/.+/.test(normalized)) {
      throw new Error('github_repo_url must be a valid GitHub repository URL');
    }
    repoUrl = normalized;
  }

  const webhookSecret = webhookSecretRaw || null;

  const { rows } = await pool.query(
    `
      UPDATE projects
      SET
        github_repo_url = COALESCE($2, github_repo_url),
        github_webhook_secret = COALESCE($3, github_webhook_secret)
      WHERE project_id = $1
      RETURNING project_id, github_repo_url, github_webhook_secret
    `,
    [projectId, repoUrl, webhookSecret]
  );

  if (!rows[0]) {
    throw new Error('Project not found');
  }

  return {
    project_id: rows[0].project_id,
    github_repo_url: rows[0].github_repo_url,
    github_webhook_secret_set: Boolean(rows[0].github_webhook_secret),
    updated_by: actorUserKey,
  };
};

export const updateUserGithubUsernameService = async ({
  targetUserKey,
  githubUsername,
  actorRole,
}) => {
  if (String(actorRole || '').toUpperCase() !== 'ADMIN') {
    throw new Error('Only admin can map GitHub usernames');
  }

  const userKey = String(targetUserKey || '').trim().toUpperCase();
  const username = String(githubUsername || '').trim();

  if (!userKey) {
    throw new Error('user_key is required');
  }

  if (!username || !/^[A-Za-z0-9-]{1,39}$/.test(username)) {
    throw new Error('github_username must be 1-39 chars (letters, numbers, hyphen)');
  }

  const duplicate = await pool.query(
    `
      SELECT user_key
      FROM users
      WHERE LOWER(github_username) = LOWER($1)
        AND user_key <> $2
      LIMIT 1
    `,
    [username, userKey]
  );

  if (duplicate.rowCount > 0) {
    throw new Error('github_username already mapped to another user');
  }

  const { rows } = await pool.query(
    `
      UPDATE users
      SET github_username = $2
      WHERE user_key = $1
      RETURNING user_key, role, email, github_username
    `,
    [userKey, username]
  );

  if (!rows[0]) {
    throw new Error('User not found');
  }

  return rows[0];
};
