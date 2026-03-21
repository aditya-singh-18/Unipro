import pool from '../config/db.js';

const toNumber = (value) => Number(value || 0);

const normalizeRiskLevel = ({ totalScore, daysSinceCommit, overdueCount }) => {
  if (totalScore < 30 || daysSinceCommit >= 5 || overdueCount >= 5) return 'critical';
  if (totalScore < 50 || daysSinceCommit >= 3 || overdueCount >= 3) return 'high';
  if (totalScore < 65 || overdueCount >= 1) return 'medium';
  return 'low';
};

const getCurrentWeekNumber = async (projectId) => {
  const { rows } = await pool.query(
    `
      SELECT COALESCE(MAX(week_number), 1) AS current_week
      FROM project_weeks
      WHERE project_id = $1
        AND start_date <= CURRENT_DATE
    `,
    [projectId]
  );

  return Number(rows[0]?.current_week || 1);
};

const getGitMetrics = async (studentUserKey, projectId) => {
  const [commitResult, fallbackResult] = await Promise.all([
    pool.query(
      `
        SELECT
          COUNT(*)::int AS commit_count,
          COALESCE(MAX(committed_at), NOW() - INTERVAL '365 days') AS last_commit_at
        FROM github_commits
        WHERE student_user_key = $1
          AND project_id = $2
          AND committed_at >= NOW() - INTERVAL '14 days'
          AND is_merge_commit = FALSE
      `,
      [studentUserKey, projectId]
    ),
    pool.query(
      `
        SELECT
          COALESCE(SUM(commit_count), 0)::int AS commit_count,
          COALESCE(MAX(created_at), NOW() - INTERVAL '365 days') AS last_commit_at
        FROM daily_logs
        WHERE student_user_key = $1
          AND project_id = $2
          AND created_at >= NOW() - INTERVAL '14 days'
      `,
      [studentUserKey, projectId]
    ),
  ]);

  const commitCount = Math.max(
    toNumber(commitResult.rows[0]?.commit_count),
    toNumber(fallbackResult.rows[0]?.commit_count)
  );

  const commitScore = Math.min(15, commitCount * 1.5);
  const lastCommitAt = commitResult.rows[0]?.last_commit_at || fallbackResult.rows[0]?.last_commit_at;

  const daysSinceCommit = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  const streakResult = await pool.query(
    `
      SELECT COUNT(DISTINCT log_date)::int AS active_days
      FROM daily_logs
      WHERE student_user_key = $1
        AND project_id = $2
        AND log_date >= CURRENT_DATE - INTERVAL '14 days'
    `,
    [studentUserKey, projectId]
  );

  const streakDays = toNumber(streakResult.rows[0]?.active_days);
  const streakScore = Math.min(8, streakDays * 0.5);

  const gitScore = Math.min(30, commitScore + streakScore + 2);

  return { gitScore, streakDays, daysSinceCommit };
};

const getTaskMetrics = async (studentUserKey, projectId) => {
  const { rows } = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'done')::int AS overdue_tasks
      FROM project_tasks
      WHERE project_id = $1
        AND assigned_to_user_key = $2
    `,
    [projectId, studentUserKey]
  );

  const totalTasks = toNumber(rows[0]?.total_tasks);
  const doneTasks = toNumber(rows[0]?.done_tasks);
  const overdueTasks = toNumber(rows[0]?.overdue_tasks);

  const completionScore = totalTasks > 0 ? (doneTasks / totalTasks) * 25 : 0;
  const overdueBonus = Math.max(0, 10 - overdueTasks * 2);
  const taskScore = Math.min(35, completionScore + overdueBonus);

  return { taskScore, overdueTasks };
};

const getSubmissionScore = async (studentUserKey, projectId) => {
  const { rows } = await pool.query(
    `
      SELECT
        ws.status,
        wr.action
      FROM week_submissions ws
      LEFT JOIN week_reviews wr ON wr.submission_id = ws.submission_id
      WHERE ws.project_id = $1
        AND ws.student_user_key = $2
      ORDER BY ws.submitted_at DESC
      LIMIT 1
    `,
    [projectId, studentUserKey]
  );

  const latest = rows[0];
  if (!latest) return 0;
  if (latest.action === 'approve') return 25;
  if (latest.status === 'submitted') return 15;
  return 8;
};

const getLogScore = async (studentUserKey, projectId, currentWeek) => {
  const weekResult = await pool.query(
    `
      SELECT start_date
      FROM project_weeks
      WHERE project_id = $1
        AND week_number = $2
      LIMIT 1
    `,
    [projectId, currentWeek]
  );

  const weekStart = weekResult.rows[0]?.start_date
    ? new Date(weekResult.rows[0].start_date)
    : new Date();

  const elapsedDays = Math.max(1, Math.ceil((Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
  const weekdaysElapsed = Math.max(1, Math.min(5, elapsedDays));

  const logResult = await pool.query(
    `
      SELECT COUNT(*)::int AS log_count
      FROM daily_logs
      WHERE student_user_key = $1
        AND project_id = $2
        AND week_id IN (
          SELECT week_id FROM project_weeks WHERE project_id = $2 AND week_number = $3
        )
    `,
    [studentUserKey, projectId, currentWeek]
  );

  const logCount = toNumber(logResult.rows[0]?.log_count);
  const regularityScore = Math.min(7, (logCount / weekdaysElapsed) * 7);
  return Math.min(10, regularityScore + 2);
};

export const recalculateScore = async (studentUserKey, projectId) => {
  const currentWeek = await getCurrentWeekNumber(projectId);
  const [gitMetrics, taskMetrics, submissionScore, logScore] = await Promise.all([
    getGitMetrics(studentUserKey, projectId),
    getTaskMetrics(studentUserKey, projectId),
    getSubmissionScore(studentUserKey, projectId),
    getLogScore(studentUserKey, projectId, currentWeek),
  ]);

  const totalScore =
    Number(gitMetrics.gitScore) +
    Number(taskMetrics.taskScore) +
    Number(submissionScore) +
    Number(logScore);

  const progressPct = Math.max(0, Math.min(100, Math.round(totalScore)));
  const riskLevel = normalizeRiskLevel({
    totalScore,
    daysSinceCommit: gitMetrics.daysSinceCommit,
    overdueCount: taskMetrics.overdueTasks,
  });

  const { rows } = await pool.query(
    `
      INSERT INTO progress_scores (
        student_user_key,
        project_id,
        week_number,
        git_score,
        task_score,
        submission_score,
        log_score,
        total_score,
        progress_pct,
        streak_days,
        risk_level,
        days_since_commit,
        overdue_task_count,
        calculated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (student_user_key, project_id, week_number)
      DO UPDATE SET
        git_score = EXCLUDED.git_score,
        task_score = EXCLUDED.task_score,
        submission_score = EXCLUDED.submission_score,
        log_score = EXCLUDED.log_score,
        total_score = EXCLUDED.total_score,
        progress_pct = EXCLUDED.progress_pct,
        streak_days = EXCLUDED.streak_days,
        risk_level = EXCLUDED.risk_level,
        days_since_commit = EXCLUDED.days_since_commit,
        overdue_task_count = EXCLUDED.overdue_task_count,
        calculated_at = NOW()
      RETURNING *
    `,
    [
      studentUserKey,
      projectId,
      currentWeek,
      gitMetrics.gitScore,
      taskMetrics.taskScore,
      submissionScore,
      logScore,
      totalScore,
      progressPct,
      gitMetrics.streakDays,
      riskLevel,
      gitMetrics.daysSinceCommit,
      taskMetrics.overdueTasks,
    ]
  );

  return rows[0];
};
