const { buildRiskReason } = require('./riskReason');

function clampRisk(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function mergeScores(ruleScores, aiScores) {
  if (!aiScores) {
    return { ...ruleScores };
  }

  return {
    spam: Math.max(ruleScores.spam, aiScores.spam),
    scam: Math.max(ruleScores.scam, aiScores.scam),
    abuse: Math.max(ruleScores.abuse, aiScores.abuse),
    quality: Math.min(ruleScores.quality, aiScores.quality),
  };
}

function qualityRiskContribution(qualityScore, contentType) {
  if (!['job_post', 'company_profile', 'worker_profile'].includes(contentType)) {
    return 0;
  }

  if (qualityScore >= 70) {
    return 0;
  }

  return clampRisk((70 - qualityScore) * 0.6);
}

function buildRecommendation(overallRisk) {
  if (overallRisk <= 30) {
    return 'publish';
  }

  if (overallRisk <= 70) {
    return 'moderation_queue';
  }

  return 'require_admin_review';
}

function buildMessage(safe) {
  return safe
    ? 'Acest conținut pare sigur'
    : 'Acest conținut pare suspect';
}

function calculateRisk({
  contentType,
  scores,
  flags,
  duplicateScore,
  externalContactScore,
  matches = {},
}) {
  const mergedFlags = [...flags];
  let overallRisk = Math.max(scores.spam, scores.scam, scores.abuse);

  overallRisk = Math.max(
    overallRisk,
    qualityRiskContribution(scores.quality, contentType),
  );

  if (externalContactScore > 0 || mergedFlags.includes('external_contact')) {
    const alreadyScoredAsScam = scores.scam >= 75;
    const externalPenalty = ['job_post', 'company_profile', 'feed_post'].includes(contentType)
      ? (alreadyScoredAsScam ? 3 : 25)
      : 15;
    overallRisk += externalPenalty;
  }

  if (duplicateScore >= 70 || mergedFlags.includes('duplicate_content')) {
    overallRisk += 20;
  }

  if (scores.scam >= 70 && !mergedFlags.includes('possible_scam')) {
    mergedFlags.push('possible_scam');
  }

  if (scores.spam >= 70 && !mergedFlags.includes('possible_spam')) {
    mergedFlags.push('possible_spam');
  }

  if (mergedFlags.includes('not_allowed_content')) {
    overallRisk = Math.max(overallRisk, 90);
  }

  overallRisk = clampRisk(overallRisk);
  const safe = overallRisk <= 30;

  return {
    safe,
    overallRisk,
    recommendation: buildRecommendation(overallRisk),
    message: buildMessage(safe),
    riskReason: buildRiskReason({ overallRisk, flags: [...new Set(mergedFlags)], matches }),
    scores,
    flags: [...new Set(mergedFlags)],
  };
}

module.exports = {
  mergeScores,
  calculateRisk,
  buildRiskReason,
};
