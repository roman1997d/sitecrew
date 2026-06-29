const env = require('../config/env');

function isRecaptchaConfigured() {
  return Boolean(env.recaptchaSecretKey);
}

async function verifyRecaptchaToken(token, remoteIp) {
  if (!token) {
    return { success: false, error: 'Please complete the reCAPTCHA challenge.' };
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
      error: 'reCAPTCHA verification failed. Please try again.',
    };
  }

  return { success: true };
}

module.exports = {
  isRecaptchaConfigured,
  verifyRecaptchaToken,
};
