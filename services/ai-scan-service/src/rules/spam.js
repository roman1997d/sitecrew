const { normalizeText } = require('../utils/normalize');

const SPAM_PHRASES = [
  { phrase: 'earn money fast', score: 80 },
  { phrase: 'click here', score: 60 },
  { phrase: 'visit my website', score: 55 },
  { phrase: '100% guaranteed', score: 70 },
  { phrase: 'make money online', score: 75 },
  { phrase: 'limited time offer', score: 50 },
  { phrase: 'act now', score: 45 },
  { phrase: 'free money', score: 80 },
  { phrase: 'work from home guaranteed', score: 65 },
  { phrase: 'no experience needed earn', score: 55 },
];

function detectSpam(text) {
  const normalized = normalizeText(text);
  let score = 0;
  const matches = [];

  for (const entry of SPAM_PHRASES) {
    if (normalized.includes(entry.phrase)) {
      score = Math.max(score, entry.score);
      matches.push(entry.phrase);
    }
  }

  return { score, matches };
}

module.exports = { detectSpam, SPAM_PHRASES };
