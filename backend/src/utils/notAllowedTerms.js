const pool = require('../db/pool');

const LEARNED_TERM_CATEGORIES = [
  { value: 'not_allowed_content', label: 'Blocked content (high risk)' },
  { value: 'swear_words', label: 'Swear words' },
  { value: 'spam', label: 'Spam' },
  { value: 'scam', label: 'Scam' },
  { value: 'abuse', label: 'Abuse / harassment' },
];

const ALLOWED_CATEGORIES = new Set(LEARNED_TERM_CATEGORIES.map((entry) => entry.value));

function normalizeCategory(category) {
  const value = String(category || 'not_allowed_content').toLowerCase().trim();
  return ALLOWED_CATEGORIES.has(value) ? value : 'not_allowed_content';
}

function riskScoreForCategory(category) {
  void category;
  return 90;
}

function parseRiskScore(value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      const error = new Error('Risk score must be an integer between 1 and 100.');
      error.status = 400;
      throw error;
    }
    return null;
  }

  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 100) {
    const error = new Error('Risk score must be an integer between 1 and 100.');
    error.status = 400;
    throw error;
  }

  return score;
}

async function getLearnModeEnabled() {
  const result = await pool.query(
    `SELECT value FROM ai_scan_settings WHERE key = 'learn_mode_enabled'`
  );

  if (result.rowCount === 0) {
    return false;
  }

  const value = result.rows[0].value;
  return value === true || value === 'true';
}

async function setLearnModeEnabled(enabled) {
  await pool.query(
    `INSERT INTO ai_scan_settings (key, value, updated_at)
     VALUES ('learn_mode_enabled', $1::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(Boolean(enabled))]
  );

  return { learnMode: Boolean(enabled) };
}

async function listNotAllowedTerms() {
  const result = await pool.query(
    `SELECT id, term, category, risk_score, created_at
     FROM ai_not_allowed_terms
     ORDER BY term ASC`
  );

  return result.rows;
}

async function addNotAllowedTerms(terms, {
  addedBy = null,
  sourceScanId = null,
  category = 'not_allowed_content',
  riskScore = null,
} = {}) {
  const normalizedCategory = normalizeCategory(category);
  const normalizedTerms = [...new Set(
    terms
      .map((term) => String(term || '').toLowerCase().trim())
      .filter((term) => term.length >= 1)
  )];

  if (!normalizedTerms.length) {
    return [];
  }

  const inserted = [];
  const resolvedRiskScore = parseRiskScore(riskScore) ?? riskScoreForCategory(normalizedCategory);

  for (const term of normalizedTerms) {
    const result = await pool.query(
      `INSERT INTO ai_not_allowed_terms (term, category, risk_score, source_scan_id, added_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (term) DO UPDATE SET
         category = EXCLUDED.category,
         risk_score = EXCLUDED.risk_score,
         source_scan_id = COALESCE(EXCLUDED.source_scan_id, ai_not_allowed_terms.source_scan_id),
         added_by = COALESCE(EXCLUDED.added_by, ai_not_allowed_terms.added_by)
       RETURNING id, term, category, risk_score, created_at`,
      [term, normalizedCategory, resolvedRiskScore, sourceScanId, addedBy]
    );
    inserted.push(result.rows[0]);
  }

  return inserted;
}

async function updateNotAllowedTermRiskScore(termId, riskScore) {
  const id = Number(termId);
  const score = parseRiskScore(riskScore, { required: true });

  if (!Number.isInteger(id) || id < 1) {
    const error = new Error('Invalid term id.');
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE ai_not_allowed_terms
     SET risk_score = $2
     WHERE id = $1
     RETURNING id, term, category, risk_score, created_at`,
    [id, score]
  );

  if (result.rowCount === 0) {
    const error = new Error('Learned term not found.');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function updateNotAllowedTermRiskScoreAndRescan(termId, riskScore) {
  const updated = await updateNotAllowedTermRiskScore(termId, riskScore);
  const { rescanPendingAiReviewContent } = require('./aiScanBackfill');
  await rescanPendingAiReviewContent();
  return updated;
}

async function addNotAllowedTermsAndRescan(terms, options = {}) {
  const inserted = await addNotAllowedTerms(terms, options);
  if (inserted.length > 0) {
    const { rescanPendingAiReviewContent } = require('./aiScanBackfill');
    await rescanPendingAiReviewContent();
  }
  return inserted;
}

module.exports = {
  LEARNED_TERM_CATEGORIES,
  getLearnModeEnabled,
  setLearnModeEnabled,
  listNotAllowedTerms,
  addNotAllowedTerms,
  addNotAllowedTermsAndRescan,
  updateNotAllowedTermRiskScore,
  updateNotAllowedTermRiskScoreAndRescan,
  normalizeCategory,
};
