const fs = require('fs');
const env = require('../config/env');

let enterpriseClient;

function isEnterpriseMode() {
  return Boolean(env.recaptchaProjectId);
}

function hasGoogleCredentials() {
  const credentialsPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  return Boolean(credentialsPath && fs.existsSync(credentialsPath));
}

function isRecaptchaConfigured() {
  if (!env.recaptchaSiteKey) {
    return false;
  }

  if (isEnterpriseMode()) {
    return hasGoogleCredentials();
  }

  return Boolean(env.recaptchaSecretKey);
}

function getRecaptchaPublicConfig() {
  return {
    mode: isEnterpriseMode() ? 'enterprise' : 'standard',
    configured: isRecaptchaConfigured(),
    projectId: env.recaptchaProjectId || null,
    credentialsConfigured: hasGoogleCredentials(),
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

  return 'Security verification failed. Please try again.';
}

async function getEnterpriseClient() {
  if (!enterpriseClient) {
    const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
    enterpriseClient = new RecaptchaEnterpriseServiceClient();
  }

  return enterpriseClient;
}

async function verifyEnterpriseToken(token, expectedAction = 'contact') {
  const client = await getEnterpriseClient();
  const projectPath = client.projectPath(env.recaptchaProjectId);

  const [response] = await client.createAssessment({
    parent: projectPath,
    assessment: {
      event: {
        token,
        siteKey: env.recaptchaSiteKey,
      },
    },
  });

  const tokenProperties = response.tokenProperties || {};

  if (!tokenProperties.valid) {
    console.error('reCAPTCHA Enterprise token invalid:', {
      invalidReason: tokenProperties.invalidReason || null,
      hostname: tokenProperties.hostname || null,
      action: tokenProperties.action || null,
    });
    return {
      success: false,
      error: 'Security verification failed. Please refresh the page and try again.',
    };
  }

  if (expectedAction && tokenProperties.action && tokenProperties.action !== expectedAction) {
    console.error('reCAPTCHA Enterprise action mismatch:', {
      expected: expectedAction,
      received: tokenProperties.action,
    });
    return {
      success: false,
      error: 'Security verification failed. Please refresh the page and try again.',
    };
  }

  const score = response.riskAnalysis?.score ?? 0;
  if (score < env.recaptchaMinScore) {
    console.warn('reCAPTCHA Enterprise score below threshold:', {
      score,
      minScore: env.recaptchaMinScore,
      reasons: response.riskAnalysis?.reasons || [],
    });
    return {
      success: false,
      error: 'Your message could not be verified as genuine. Please try again.',
    };
  }

  return {
    success: true,
    score,
    hostname: tokenProperties.hostname || null,
  };
}

async function verifyStandardToken(token, remoteIp, expectedAction = 'contact') {
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
    const errorCodes = payload['error-codes'] || [];
    console.error('reCAPTCHA verification failed:', {
      errorCodes,
      hostname: payload.hostname || null,
      action: payload.action || null,
    });
    return {
      success: false,
      error: mapRecaptchaError(errorCodes),
      errorCodes,
    };
  }

  if (expectedAction && payload.action && payload.action !== expectedAction) {
    return {
      success: false,
      error: 'Security verification failed. Please refresh the page and try again.',
    };
  }

  if (typeof payload.score === 'number' && payload.score < env.recaptchaMinScore) {
    return {
      success: false,
      error: 'Your message could not be verified as genuine. Please try again.',
    };
  }

  return { success: true, score: payload.score, hostname: payload.hostname || null };
}

async function verifyRecaptchaToken(token, remoteIp, expectedAction = 'contact') {
  if (!token) {
    return { success: false, error: 'Security verification failed. Please refresh the page and try again.' };
  }

  if (!isRecaptchaConfigured()) {
    return { success: false, error: 'Contact form security is not configured yet.' };
  }

  try {
    if (isEnterpriseMode()) {
      return await verifyEnterpriseToken(token, expectedAction);
    }

    return await verifyStandardToken(token, remoteIp, expectedAction);
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
