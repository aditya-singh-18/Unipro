import {
  getStudentLearningRoster,
  getStudentLearningDetail,
} from '../repositories/studentLearning.repo.js';

const getLearningVelocity = (firstScore, latestScore) => {
  const delta = Number(latestScore || 0) - Number(firstScore || 0);
  if (delta >= 10) return { direction: 'improving', delta };
  if (delta <= -10) return { direction: 'declining', delta };
  return { direction: 'stable', delta };
};

export const getStudentLearningRosterService = async ({ q = '', page = 1, pageSize = 50 } = {}) => {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const rows = await getStudentLearningRoster({ days: 42, q, limit: pageSize, offset });

  if (rows.length === 0) {
    return {
      summary: { totalStudents: 0, improvingCount: 0, stableCount: 0, decliningCount: 0, avgAcceptanceRate: 0 },
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }

  const first = rows[0];
  const summary = {
    totalStudents: first._summary_total_students || 0,
    improvingCount: first._summary_improving_count || 0,
    stableCount: first._summary_stable_count || 0,
    decliningCount: first._summary_declining_count || 0,
    avgAcceptanceRate: Number(first._summary_avg_acceptance_rate) || 0,
  };
  const total = first._filtered_total || 0;

  const items = rows.map((row) => {
    const velocity = getLearningVelocity(row.first_quality_score, row.latest_quality_score);

    return {
      projectId: row.project_id,
      studentKey: row.student_key,
      studentName: row.student_key,
      submissionCount: Number(row.submission_count) || 0,
      revisionCount: Number(row.revision_count) || 0,
      avgQualityScore: Number(row.avg_quality_score) || 0,
      firstQualityScore: Number(row.first_quality_score) || 0,
      latestQualityScore: Number(row.latest_quality_score) || 0,
      acceptanceRate: Number(row.acceptance_rate) || 0,
      supportiveFeedbackCount: Number(row.supportive_feedback_count) || 0,
      criticalFeedbackCount: Number(row.critical_feedback_count) || 0,
      neutralFeedbackCount: Number(row.neutral_feedback_count) || 0,
      firstSubmittedAt: row.first_submitted_at,
      latestSubmittedAt: row.latest_submitted_at,
      learningVelocity: velocity.delta,
      learningVelocityDirection: velocity.direction,
      riskRegression: velocity.delta < -12,
    };
  });

  return { summary, items, total, page, pageSize, hasMore: offset + items.length < total };
};

export const getStudentLearningDetailService = async (projectId, studentKey) => {
  const rows = await getStudentLearningDetail(projectId, studentKey, 56);
  if (!rows || rows.length === 0) return null;

  const latest = rows[0];
  const oldest = rows[rows.length - 1];
  const velocity = getLearningVelocity(oldest.quality_score, latest.quality_score);

  return {
    projectId,
    studentKey,
    studentName: studentKey,
    trend: {
      firstQualityScore: Number(oldest.quality_score) || 0,
      latestQualityScore: Number(latest.quality_score) || 0,
      learningVelocity: velocity.delta,
      learningVelocityDirection: velocity.direction,
      riskRegression: velocity.delta < -12,
    },
    submissions: rows.map((row) => ({
      submissionId: Number(row.submission_id),
      weekId: Number(row.week_id),
      weekNumber: Number(row.week_number),
      revisionNo: Number(row.revision_no),
      submittedAt: row.submitted_at,
      qualityScore: Number(row.quality_score) || 0,
      action: row.action || null,
      reviewComment: row.review_comment || null,
      reviewedAt: row.reviewed_at || null,
      summaryOfWork: row.summary_of_work || '',
      blockers: row.blockers || null,
      nextWeekPlan: row.next_week_plan || null,
      githubLinkSnapshot: row.github_link_snapshot || null,
    })),
  };
};

export const exportStudentLearningServiceCSV = async () => {
  const { items } = await getStudentLearningRosterService({ pageSize: 10000 });

  const headers = [
    'Project ID',
    'Student Key',
    'Submission Count',
    'Revision Count',
    'Avg Quality Score',
    'Acceptance Rate %',
    'Learning Velocity',
    'Velocity Direction',
    'Risk Regression',
  ];

  const rows = items.map((item) => [
    item.projectId,
    item.studentKey,
    item.submissionCount,
    item.revisionCount,
    item.avgQualityScore.toFixed(2),
    item.acceptanceRate.toFixed(2),
    item.learningVelocity,
    item.learningVelocityDirection,
    item.riskRegression ? 'yes' : 'no',
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

export const exportStudentLearningServiceJSON = async () => {
  return getStudentLearningRosterService({ pageSize: 10000 });
};
