const env = require('../config/env');

function isRecaptchaConfigured() {
  return Boolean(env.recaptchaSiteKey && env.recaptchaSecretKey);
}

function getRecaptchaPublicConfig() {
  return {
    type: 'v2',
    configured: isRecaptchaConfigured(),
    siteKeyPreview: env.recaptchaSiteKey ? `${env.recaptchaSiteKey.slice(0, 8)}...` : null,
  };
}

function mapRecaptchaError(errorCodes = []) {
  if (errorCodes.includes('invalid-input-secret')) {
    return 'Contact form security is misconfigured. Please contact support.';
  }

  if (errorCodes.includes('invalid-input-response') || errorCodes.includes('timeout-or-duplicate')) {
    return 'reCAPTCHA expired. Please tick the box again and resubmit.';
  }

  if (errorCodes.includes('missing-input-response')) {
    return 'Please tick the reCAPTCHA box before sending.';
  }

  return 'Security verification failed. Please try again.';
}

async function verifyRecaptchaToken(token) {
  if (!token) {
    return { success: false, error: 'Please tick the reCAPTCHA box before sending.' };
  }

  if (!isRecaptchaConfigured()) {
    return { success: false, error: 'Contact form security is not configured yet.' };
  }

  try {
    const params = new URLSearchParams({
      secret: env.recaptchaSecretKey,
      response: token,
    });

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const payload = await response.json().catch(() => ({}));

    if (!payload.success) {
      const errorCodes = payload['error-codes'] || [];
      console.error('reCAPTCHA verification failed:', { errorCodes, hostname: payload.hostname || null });
      return {
        success: false,
        error: mapRecaptchaError(errorCodes),
      };
    }

    return { success: true, hostname: payload.hostname || null };
  } catch (error) {
    console.error('reCAPTCHA verify request failed:', error.message);
    return { success: false, error: 'Security verification is temporarily unavailable. Please try again.' };
  }
}

module.exports = {
  isRecaptchaConfigured,
  getRecaptchaPublicConfig,
  verifyRecaptchaToken,
};
