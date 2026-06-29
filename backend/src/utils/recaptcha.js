const env = require('../config/env');

function isRecaptchaConfigured() {
  return Boolean(env.recaptchaSecretKey && env.recaptchaSiteKey);
}

function getRecaptchaPublicConfig() {
  return {
    configured: isRecaptchaConfigured(),
    siteKeyPreview: env.recaptchaSiteKey ? `${env.recaptchaSiteKey.slice(0, 8)}...` : null,
    minScore: env.recaptchaMinScore,
  };
}

function mapRecaptchaError(errorCodes = []) {
  if (errorCodes.includes('invalid-input-secret')) {
    return 'Contact form security is misconfigured on the server. The reCAPTCHA secret key is invalid.';
  }

  if (errorCodes.includes('invalid-input-response') || errorCodes.includes('timeout-or-duplicate')) {
    return 'Security verification expired. Please refresh the page and try again.';
  }

  if (errorCodes.includes('missing-input-response')) {
    return 'Security verification failed to load. Please refresh the page and try again.';
  }

  if (errorCodes.includes('bad-request')) {
    return 'Security verification failed. Please refresh the page and try again.';
  }

  return 'Security verification failed. Please try again.';
}

async function verifyRecaptchaToken(token, remoteIp, expectedAction = 'contact') {
  if (!token) {
    return { success: false, error: 'Security verification failed. Please refresh the page and try again.' };
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

  let payload = {};
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    payload = await response.json();
  } catch (error) {
    console.error('reCAPTCHA verify request failed:', error.message);
    return { success: false, error: 'Security verification is temporarily unavailable. Please try again.' };
  }

  if (!payload.success) {
    const errorCodes = payload['error-codes'] || [];
    console.error('reCAPTCHA verification failed:', {
      errorCodes,
      hostname: payload.hostname || null,
      action: payload.action || null,
      siteKeyPreview: env.recaptchaSiteKey ? `${env.recaptchaSiteKey.slice(0, 8)}...` : null,
    });
    return {
      success: false,
      error: mapRecaptchaError(errorCodes),
      errorCodes,
    };
  }

  if (expectedAction && payload.action && payload.action !== expectedAction) {
    console.error('reCAPTCHA action mismatch:', {
      expected: expectedAction,
      received: payload.action,
    });
    return {
      success: false,
      error: 'Security verification failed. Please refresh the page and try again.',
    };
  }

  if (typeof payload.score === 'number' && payload.score < env.recaptchaMinScore) {
    console.warn('reCAPTCHA score below threshold:', {
      score: payload.score,
      minScore: env.recaptchaMinScore,
      hostname: payload.hostname || null,
    });
    return {
      success: false,
      error: 'Your message could not be verified as genuine. Please try again.',
    };
  }

  return { success: true, score: payload.score, hostname: payload.hostname || null };
}

module.exports = {
  isRecaptchaConfigured,
  getRecaptchaPublicConfig,
  verifyRecaptchaToken,
};
