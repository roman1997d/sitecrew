const env = require('../config/env');
const { getTextReviewStats } = require('./textReviewQueue');
const { getMediaReviewStats } = require('./mediaReviewActions');

async function checkAiScanService() {
  if (!env.aiScanEnabled) {
    return { ok: true, mode: 'local-rules-only', enabled: false };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${env.aiScanServiceUrl}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { ok: false, mode: 'local-rules-fallback', enabled: true };
    }

    const payload = await response.json();
    return {
      ok: true,
      mode: 'microservice',
      enabled: true,
      service: payload.service || 'ai-scan-service',
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'local-rules-fallback',
      enabled: true,
      error: error.message,
    };
  }
}

async function getModerationHealth() {
  const [aiScan, textReview, mediaReview] = await Promise.all([
    checkAiScanService(),
    getTextReviewStats(),
    getMediaReviewStats(),
  ]);

  return {
    aiScan,
    textReview,
    mediaReview,
  };
}

module.exports = {
  getModerationHealth,
  checkAiScanService,
};
