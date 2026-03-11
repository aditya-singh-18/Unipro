import {
  getReviewTurnaroundStats,
  getFeedbackDepthStats,
  getMentorWorkloadBand,
  getAdminMentorEffectivenessGrid,
  getRecentReviewCount,
} from '../repositories/mentorEffectiveness.repo.js';

/**
 * Format milliseconds as readable turnaround (e.g., "24h", "2d 3h")
 */
const formatTurnaroundTime = (ms) => {
  if (!ms || ms === 0) return '—';
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

/**
 * Get mentor effectiveness grid (all mentors + metrics)
 */
export const getMentorEffectivenessGridService = async ({ q = '', page = 1, pageSize = 50 } = {}) => {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const rows = await getAdminMentorEffectivenessGrid({ days: 14, q, limit: pageSize, offset });

  if (rows.length === 0) {
    return {
      summary: { totalMentors: 0, avgReviewCount: 0, avgTurnaroundMs: 0, avgFeedbackDepth: 0, healthyCount: 0, warningCount: 0, criticalCount: 0 },
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }

  const first = rows[0];
  const summary = {
    totalMentors: first._summary_total_mentors || 0,
    avgReviewCount: first._summary_avg_review_count || 0,
    avgTurnaroundMs: Number(first._summary_avg_turnaround_ms) || 0,
    avgFeedbackDepth: first._summary_avg_feedback_depth || 0,
    healthyCount: first._summary_healthy_count || 0,
    warningCount: first._summary_warning_count || 0,
    criticalCount: first._summary_critical_count || 0,
  };
  const total = first._filtered_total || 0;

  const items = rows.map((row) => ({
    mentorId: row.mentor_id,
    mentorName: row.mentor_name,
    reviewCount: Number(row.review_count) || 0,
    avgTurnaroundMs: Number(row.avg_turnaround_ms) ? Math.round(Number(row.avg_turnaround_ms)) : null,
    avgTurnaroundFormatted: formatTurnaroundTime(Number(row.avg_turnaround_ms) || 0),
    medianTurnaroundMs: Number(row.median_turnaround_ms) ? Math.round(Number(row.median_turnaround_ms)) : null,
    medianTurnaroundFormatted: formatTurnaroundTime(Number(row.median_turnaround_ms) || 0),
    p95TurnaroundMs: Number(row.p95_turnaround_ms) ? Math.round(Number(row.p95_turnaround_ms)) : null,
    p95TurnaroundFormatted: formatTurnaroundTime(Number(row.p95_turnaround_ms) || 0),
    avgFeedbackDepth: Number(row.avg_feedback_depth) ? Math.round(Number(row.avg_feedback_depth)) : 0,
    richFeedbackRatioPercent: Number(row.rich_feedback_ratio_percent) || 0,
    activeProjectCount: Number(row.active_project_count) || 0,
    workloadBand: row.workload_band || 'healthy',
  }));

  return { summary, items, total, page, pageSize, hasMore: offset + items.length < total };
};

/**
 * Get detail for a specific mentor
 */
export const getMentorEffectivenessDetailService = async (mentorId) => {
  const [turnaroundRows, feedbackRows] = await Promise.all([
    getReviewTurnaroundStats(mentorId, 14),
    getFeedbackDepthStats(mentorId, 14),
  ]);

  const workloadRow = await getMentorWorkloadBand(mentorId);
  const recentCount = await getRecentReviewCount(mentorId, 7);

  if (!turnaroundRows || turnaroundRows.length === 0) {
    return null;
  }

  const turnaround = turnaroundRows[0];
  const feedback = feedbackRows[0] || {};
  const workload = workloadRow || { active_project_count: 0, workload_band: 'healthy' };

  return {
    mentorId: turnaround.mentor_id,
    mentorName: turnaround.mentor_name,
    metrics: {
      reviewCount: Number(turnaround.review_count) || 0,
      recentReviewCount: Number(recentCount) || 0,
      avgTurnaroundMs: Number(turnaround.avg_turnaround_ms) ? Math.round(Number(turnaround.avg_turnaround_ms)) : null,
      medianTurnaroundMs: Number(turnaround.median_turnaround_ms) ? Math.round(Number(turnaround.median_turnaround_ms)) : null,
      p95TurnaroundMs: Number(turnaround.p95_turnaround_ms) ? Math.round(Number(turnaround.p95_turnaround_ms)) : null,
      avgFeedbackDepth: Number(feedback.avg_feedback_depth) ? Math.round(Number(feedback.avg_feedback_depth)) : 0,
      richFeedbackRatioPercent: Number(feedback.rich_feedback_ratio_percent) || 0,
      activeProjectCount: Number(workload.active_project_count) || 0,
      workloadBand: workload.workload_band || 'healthy',
    },
  };
};

/**
 * Export mentor effectiveness data as CSV
 */
export const exportMentorEffectivenessServiceCSV = async () => {
  const { items } = await getMentorEffectivenessGridService({ pageSize: 10000 });

  const headers = [
    'Mentor Name',
    'Mentor ID',
    'Review Count',
    'Avg Turnaround (hours)',
    'Median Turnaround (hours)',
    'P95 Turnaround (hours)',
    'Avg Feedback Depth (chars)',
    'Rich Feedback %',
    'Active Projects',
    'Workload Band',
  ];

  const rows = items.map((m) => [
    m.mentorName || 'Unknown',
    m.mentorId || '—',
    m.reviewCount,
    m.avgTurnaroundMs ? (m.avgTurnaroundMs / (1000 * 60 * 60)).toFixed(2) : '—',
    m.medianTurnaroundMs ? (m.medianTurnaroundMs / (1000 * 60 * 60)).toFixed(2) : '—',
    m.p95TurnaroundMs ? (m.p95TurnaroundMs / (1000 * 60 * 60)).toFixed(2) : '—',
    m.avgFeedbackDepth,
    (Number(m.richFeedbackRatioPercent) || 0).toFixed(2),
    m.activeProjectCount,
    m.workloadBand,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  return csv;
};

/**
 * Export mentor effectiveness data as JSON
 */
export const exportMentorEffectivenessServiceJSON = async () => {
  return await getMentorEffectivenessGridService({ pageSize: 10000 });
};
