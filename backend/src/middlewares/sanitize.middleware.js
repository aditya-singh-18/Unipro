import xss from 'xss';

const filter = new xss.FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

const defaultUrlAllowlist = ['github.com', 'raw.githubusercontent.com', 'gitlab.com', 'bitbucket.org'];

const isBlockedProtocol = (value) => /^(javascript|data|vbscript|file):/i.test(value);

const isPrivateOrLinkLocalHost = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  );
};

const hostAllowed = (hostname) => {
  const storageHost = process.env.SUPABASE_STORAGE_URL
    ? (() => {
        try {
          return new URL(process.env.SUPABASE_STORAGE_URL).hostname.toLowerCase();
        } catch {
          return null;
        }
      })()
    : null;

  const backendHost = process.env.BACKEND_URL
    ? (() => {
        try {
          return new URL(process.env.BACKEND_URL).hostname.toLowerCase();
        } catch {
          return null;
        }
      })()
    : null;

  const allowlist = [storageHost, backendHost, ...defaultUrlAllowlist].filter(Boolean);
  const host = String(hostname || '').toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

export const sanitizeString = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  return filter.process(String(value)).trim();
};

export const sanitizeUrl = (value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const raw = String(value).trim();
  if (isBlockedProtocol(raw)) {
    console.warn('[SECURITY] Blocked URL:', raw);
    return null;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    console.warn('[SECURITY] Blocked URL:', raw);
    return null;
  }

  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && !isProduction)) {
    console.warn('[SECURITY] Blocked URL:', raw);
    return null;
  }

  if (isPrivateOrLinkLocalHost(parsed.hostname) && isProduction) {
    console.warn('[SECURITY] Blocked URL:', raw);
    return null;
  }

  if (!hostAllowed(parsed.hostname) && !(isPrivateOrLinkLocalHost(parsed.hostname) && !isProduction)) {
    console.warn('[SECURITY] Blocked URL:', raw);
    return null;
  }

  return parsed.toString();
};

export const sanitizeRequestBody = (fields = []) => {
  return (req, _res, next) => {
    for (const field of fields) {
      const fieldName = field?.name;
      const fieldType = field?.type || 'string';

      if (!fieldName || !Object.prototype.hasOwnProperty.call(req.body || {}, fieldName)) {
        continue;
      }

      if (fieldType === 'url') {
        req.body[fieldName] = sanitizeUrl(req.body[fieldName]);
      } else {
        req.body[fieldName] = sanitizeString(req.body[fieldName]);
      }
    }

    next();
  };
};
