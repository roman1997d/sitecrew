const { normalizeText } = require('../utils/normalize');
const {
  EMAIL_REGEX,
  PHONE_REGEX,
  SHORT_PHONE_REGEX,
  URL_REGEX,
  CONTACT_INTENT_REGEX,
  OFF_PLATFORM_RATE_REGEX,
  EXTERNAL_CONTACT_KEYWORDS,
} = require('../utils/patterns');

function detectExternalContact(text) {
  const normalized = normalizeText(text);
  const flags = [];
  const matches = [];
  let score = 0;

  for (const keyword of EXTERNAL_CONTACT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      matches.push(keyword);
      score = Math.max(score, 70);
    }
  }

  if (CONTACT_INTENT_REGEX.test(normalized)) {
    matches.push('contact_me');
    score = Math.max(score, 75);
  }

  if (/\btelegram\b.*@\w+/i.test(text) || /@\w+.*\btelegram\b/i.test(text)) {
    matches.push('telegram_handle');
    score = Math.max(score, 85);
  }

  const emails = text.match(EMAIL_REGEX) || [];
  if (emails.length > 0) {
    matches.push(...emails);
    score = Math.max(score, 75);
  }

  const phones = text.match(PHONE_REGEX) || [];
  if (phones.length > 0) {
    matches.push(...phones.map((phone) => phone.trim()));
    score = Math.max(score, 80);
  }

  const shortPhones = text.match(SHORT_PHONE_REGEX) || [];
  const hasContactIntent = score >= 70 || CONTACT_INTENT_REGEX.test(normalized);
  if (hasContactIntent && shortPhones.length > 0) {
    matches.push(...shortPhones.map((phone) => phone.trim()));
    score = Math.max(score, 85);
  }

  const urls = text.match(URL_REGEX) || [];
  if (urls.length > 0) {
    matches.push(...urls);
    score = Math.max(score, 60);
  }

  if (hasContactIntent && OFF_PLATFORM_RATE_REGEX.test(normalized)) {
    matches.push('off_platform_rate');
    score = Math.max(score, 80);
  }

  if (score > 0) {
    flags.push('external_contact');
  }

  return { score, flags, matches };
}

module.exports = { detectExternalContact };
