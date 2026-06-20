const { normalizeText, tokenize } = require('../utils/normalize');

function jaccardSimilarity(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = leftTokens.size + rightTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function detectDuplicateContent({ text, title, recentTexts = [] }) {
  const current = normalizeText([title, text].filter(Boolean).join(' '));
  const flags = [];
  const matches = [];
  let score = 0;

  if (!current || recentTexts.length === 0) {
    return { score, flags, matches };
  }

  for (const previous of recentTexts) {
    const previousNormalized = normalizeText(previous);
    if (!previousNormalized) {
      continue;
    }

    if (previousNormalized === current) {
      score = 100;
      matches.push(previous);
      break;
    }

    const similarity = jaccardSimilarity(current, previousNormalized);
    if (similarity >= 0.85) {
      score = Math.max(score, 90);
      matches.push(previous);
    } else if (similarity >= 0.7) {
      score = Math.max(score, 70);
      matches.push(previous);
    }
  }

  if (score >= 70) {
    flags.push('duplicate_content');
  }

  return { score, flags, matches };
}

module.exports = { detectDuplicateContent };
