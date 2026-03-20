import crypto from 'crypto';

const normalizeSegment = (value, fallback = 'GEN') => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

  return normalized || fallback;
};

export const generateStudentKey = (department, year) => {
  const dept = normalizeSegment(department, 'GEN');
  const yr = String(year || new Date().getFullYear()).trim().replace(/[^0-9]/g, '').slice(0, 4) || String(new Date().getFullYear());
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ENRL-${dept}-${yr}-${suffix}`;
};

export const generateMentorKey = () => {
  return `EMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const generateAdminKey = () => {
  return `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const generateUniqueUserKey = async (role, dbClient, department, year) => {
  const normalizedRole = String(role || '').toUpperCase();

  const keyFactory =
    normalizedRole === 'STUDENT'
      ? () => generateStudentKey(department, year)
      : normalizedRole === 'MENTOR'
        ? () => generateMentorKey()
        : () => generateAdminKey();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const candidate = keyFactory();
    const existsResult = await dbClient.query(
      'SELECT COUNT(*)::int AS total FROM users WHERE user_key = $1',
      [candidate]
    );

    if ((existsResult.rows?.[0]?.total || 0) === 0) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique user key after multiple attempts');
};
