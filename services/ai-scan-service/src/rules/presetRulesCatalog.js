const { SPAM_PHRASES } = require('./spam');
const { SCAM_PHRASES } = require('./scam');
const { ABUSE_PHRASES, ABUSE_WORDS } = require('./abuse');
const { EXTERNAL_CONTACT_KEYWORDS } = require('../utils/patterns');

const VAGUE_JOB_PHRASES = [
  'need workers',
  'need people',
  'workers needed',
  'urgent workers',
  'hiring now',
  'apply now',
];

const PATTERN_RULES = [
  { term: 'Email address in text', category: 'external_contact', riskScore: 75, ruleType: 'pattern' },
  { term: 'Phone number in text', category: 'external_contact', riskScore: 80, ruleType: 'pattern' },
  { term: 'Short phone number with contact intent (5+ digits)', category: 'external_contact', riskScore: 85, ruleType: 'pattern' },
  { term: 'External URL / website link', category: 'external_contact', riskScore: 60, ruleType: 'pattern' },
  { term: 'Contact me / call me / text me (incl. typos)', category: 'external_contact', riskScore: 75, ruleType: 'pattern' },
  { term: 'Off-platform rate (£ per hour, $ per day, etc.)', category: 'external_contact', riskScore: 80, ruleType: 'pattern' },
  { term: 'Telegram @handle', category: 'external_contact', riskScore: 85, ruleType: 'pattern' },
  { term: 'Duplicate or near-duplicate post from same author', category: 'duplicate_content', riskScore: 90, ruleType: 'pattern' },
  { term: 'Job post too short / missing details', category: 'quality', riskScore: 35, ruleType: 'pattern' },
];

function mapPhraseEntries(entries, category) {
  return entries.map((entry) => ({
    term: entry.phrase || entry,
    category,
    riskScore: entry.score || (category === 'abuse' ? 85 : 90),
    ruleType: 'phrase',
  }));
}

function getPresetRiskRules() {
  const rules = [
    ...mapPhraseEntries(SPAM_PHRASES, 'spam'),
    ...mapPhraseEntries(SCAM_PHRASES, 'scam'),
    ...mapPhraseEntries(ABUSE_PHRASES.map((phrase) => ({ phrase, score: 85 })), 'abuse'),
    ...mapPhraseEntries(ABUSE_WORDS.map((word) => ({ phrase: word, score: 65 })), 'abuse'),
    ...EXTERNAL_CONTACT_KEYWORDS.map((keyword) => ({
      term: keyword,
      category: 'external_contact',
      riskScore: 70,
      ruleType: 'keyword',
    })),
    ...mapPhraseEntries(VAGUE_JOB_PHRASES.map((phrase) => ({ phrase, score: 25 })), 'quality'),
    ...PATTERN_RULES,
  ];

  return rules.sort((left, right) => {
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.term.localeCompare(right.term);
  });
}

module.exports = {
  getPresetRiskRules,
};
