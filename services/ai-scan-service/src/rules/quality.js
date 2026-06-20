const { normalizeText } = require('../utils/normalize');

const VAGUE_JOB_PHRASES = [
  'need workers',
  'need people',
  'workers needed',
  'urgent workers',
  'hiring now',
  'apply now',
];

function detectJobQuality({ text, title, contentType }) {
  if (!['job_post', 'company_profile'].includes(contentType)) {
    return { score: 100, matches: [] };
  }

  const combined = normalizeText([title, text].filter(Boolean).join(' '));
  let score = 100;
  const matches = [];

  if (combined.length < 20) {
    score = Math.min(score, 20);
    matches.push('too_short');
  } else if (combined.length < 50) {
    score = Math.min(score, 45);
    matches.push('short_description');
  }

  for (const phrase of VAGUE_JOB_PHRASES) {
    if (combined.includes(phrase) && combined.length < 80) {
      score = Math.min(score, 25);
      matches.push(phrase);
    }
  }

  const detailSignals = [
    'experience',
    'certificate',
    'city',
    'location',
    'rate',
    'pay',
    'salary',
    'hours',
    'start date',
    'trade',
    'dryliner',
    'electrician',
    'plumber',
  ];

  const hasDetail = detailSignals.some((signal) => combined.includes(signal));
  if (!hasDetail && combined.length < 100) {
    score = Math.min(score, 35);
    matches.push('missing_job_details');
  }

  return { score, matches };
}

module.exports = { detectJobQuality };
