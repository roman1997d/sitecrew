const { normalizeText } = require('../utils/normalize');

function detectNotAllowedTerms(text, terms = []) {
  const normalized = normalizeText(text);
  let score = 0;
  let spamScore = 0;
  let scamScore = 0;
  let abuseScore = 0;
  const matches = [];
  const flags = [];

  for (const entry of terms) {
    const term = String(entry.term || entry).toLowerCase().trim();
    if (!term) {
      continue;
    }

    if (!normalized.includes(term)) {
      continue;
    }

    const termScore = Number(entry.risk_score) || 90;
    const category = String(entry.category || 'not_allowed_content').toLowerCase();
    score = Math.max(score, termScore);
    matches.push({ term, category });

    if (category === 'spam') {
      spamScore = Math.max(spamScore, termScore);
      flags.push('possible_spam');
      continue;
    }

    if (category === 'scam') {
      scamScore = Math.max(scamScore, termScore);
      flags.push('possible_scam');
      continue;
    }

    if (category === 'abuse' || category === 'swear_words') {
      abuseScore = Math.max(abuseScore, termScore);
      flags.push('abusive_language');
      flags.push('not_allowed_content');
      continue;
    }

    flags.push('not_allowed_content');
  }

  return {
    score,
    spamScore,
    scamScore,
    abuseScore,
    flags: [...new Set(flags)],
    matches,
  };
}

module.exports = { detectNotAllowedTerms };
