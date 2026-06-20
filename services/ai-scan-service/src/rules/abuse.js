const { normalizeText } = require('../utils/normalize');

const ABUSE_PHRASES = [
  'you are an idiot',
  'you idiot',
  'stupid idiot',
  'kill yourself',
  'go die',
  'i will hurt you',
  'i will kill you',
  'fuck you',
  'piece of shit',
  'hate you',
  'shut up',
];

const ABUSE_WORDS = [
  'idiot',
  'moron',
  'retard',
  'bastard',
  'scum',
];

function detectAbuse(text) {
  const normalized = normalizeText(text);
  let score = 0;
  const matches = [];
  const flags = [];

  for (const phrase of ABUSE_PHRASES) {
    if (normalized.includes(phrase)) {
      score = Math.max(score, 85);
      matches.push(phrase);
    }
  }

  for (const word of ABUSE_WORDS) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(normalized)) {
      score = Math.max(score, 65);
      matches.push(word);
    }
  }

  if (score > 0) {
    flags.push('abusive_language');
  }

  return { score, flags, matches };
}

module.exports = { detectAbuse, ABUSE_PHRASES, ABUSE_WORDS };
