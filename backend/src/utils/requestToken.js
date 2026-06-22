const AUTH_COOKIE_NAME = 'sitecrewToken';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .filter(Boolean)
    .reduce((cookies, item) => {
      const [key, ...valueParts] = item.trim().split('=');
      cookies[key] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function shouldUseSecureCookie() {
  const publicUrl = process.env.PUBLIC_URL || process.env.API_BASE_URL || '';
  return process.env.NODE_ENV === 'production' || publicUrl.startsWith('https://');
}

function setAuthSessionCookie(res, token) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${Math.floor(AUTH_COOKIE_MAX_AGE_MS / 1000)}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (shouldUseSecureCookie()) {
    parts.push('Secure');
  }

  res.append('Set-Cookie', parts.join('; '));
}

function clearAuthSessionCookie(res) {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (shouldUseSecureCookie()) {
    parts.push('Secure');
  }

  res.append('Set-Cookie', parts.join('; '));
}

module.exports = {
  AUTH_COOKIE_NAME,
  getTokenFromRequest,
  setAuthSessionCookie,
  clearAuthSessionCookie,
};
