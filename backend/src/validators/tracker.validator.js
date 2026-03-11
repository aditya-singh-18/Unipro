export const WEEK_STATES = ['pending', 'submitted', 'under_review', 'approved', 'rejected', 'missed', 'locked'];

export const TASK_STATES = ['todo', 'in_progress', 'review', 'done', 'blocked'];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const REVIEW_QUEUE_SORTS = ['pending_age', 'risk', 'deadline'];
export const SORT_ORDERS = ['asc', 'desc'];
export const RISK_LEVELS = ['low', 'medium', 'high'];

export const isValidWeekTransition = (from, to) => {
  const allowed = {
    pending: ['submitted', 'missed', 'locked'],
    submitted: ['under_review', 'approved', 'rejected', 'locked'],
    under_review: ['approved', 'rejected', 'locked'],
    approved: ['locked'],
    rejected: ['submitted', 'locked', 'missed'],
    missed: [],
    locked: [],
  };

  return allowed[from]?.includes(to) || false;
};

export const isValidTaskTransition = (from, to) => {
  const allowed = {
    todo: ['in_progress'],
    in_progress: ['review', 'blocked'],
    review: ['done', 'in_progress'],
    blocked: ['in_progress'],
    done: [],
  };

  return allowed[from]?.includes(to) || false;
};

export const normalizeReviewQueueParams = ({ sortBy, order, riskLevel, page, pageSize }) => {
  const normalizedSort = REVIEW_QUEUE_SORTS.includes(sortBy) ? sortBy : 'pending_age';
  const normalizedOrder = SORT_ORDERS.includes((order || '').toLowerCase()) ? order.toLowerCase() : 'desc';
  const normalizedRiskLevel = RISK_LEVELS.includes((riskLevel || '').toLowerCase()) ? riskLevel.toLowerCase() : null;
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));

  return {
    sortBy: normalizedSort,
    order: normalizedOrder,
    riskLevel: normalizedRiskLevel,
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
};
