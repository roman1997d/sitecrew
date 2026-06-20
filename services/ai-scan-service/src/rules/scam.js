const { normalizeText } = require('../utils/normalize');

const SCAM_PHRASES = [
  { phrase: 'pay registration fee', score: 95 },
  { phrase: 'registration fee', score: 90 },
  { phrase: 'deposit required', score: 90 },
  { phrase: 'send money first', score: 95 },
  { phrase: 'advance payment', score: 85 },
  { phrase: 'upfront payment', score: 85 },
  { phrase: 'pay upfront', score: 85 },
  { phrase: 'processing fee', score: 75 },
  { phrase: 'wire transfer', score: 70 },
  { phrase: 'crypto wallet', score: 65 },
  { phrase: 'gift card payment', score: 80 },
  { phrase: 'training fee before work', score: 90 },
];

function detectScam(text) {
  const normalized = normalizeText(text);
  let score = 0;
  const matches = [];

  for (const entry of SCAM_PHRASES) {
    if (normalized.includes(entry.phrase)) {
      score = Math.max(score, entry.score);
      matches.push(entry.phrase);
    }
  }

  return { score, matches };
}

module.exports = { detectScam, SCAM_PHRASES };
