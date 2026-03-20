export const parsePagination = (query, options = {}) => {
  const maxLimit = options.maxLimit || 100;
  const defaultLimit = options.defaultLimit || 10;
  const minLimit = 1;

  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const rawLimit = parseInt(query?.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(minLimit, rawLimit), maxLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};
