const env = require('../config/env');

function isRecaptchaConfigured() {
  return Boolean(env.recaptchaSecretKey);
}

async function verifyRecaptchaToken(token, remoteIp, expectedAction = 'contact') {
  if (!token) {
    return { success: false, error: 'Security verification failed. Please try again.' };
  }

  if (!isRecaptchaConfigured()) {
    return { success: false, error: 'Contact form security is not configured yet.' };
  }

  const params = new URLSearchParams({
    secret: env.recaptchaSecretKey,
    response: token,
  });

  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!payload.success) {
    return {
      success: false,
      error: 'Security verification failed. Please try again.',
    };
  }

  if (expectedAction && payload.action && payload.action !== expectedAction) {
    return {
      success: false,
      error: 'Security verification failed. Please try again.',
    };
  }

  if (typeof payload.score === 'number' && payload.score < env.recaptchaMinScore) {
    return {
      success: false,
      error: 'Your message could not be verified as genuine. Please try again.',
    };
  }

  return { success: true, score: payload.score };
}

module.exports = {
  isRecaptchaConfigured,
  verifyRecaptchaToken,
};
