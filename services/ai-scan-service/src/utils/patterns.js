const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const SHORT_PHONE_REGEX = /\b\d{5,}\b/g;
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const CONTACT_INTENT_REGEX = /\b(?:contact|call|message|text|dm|whatsapp|telegram)\s*me[\w]*/i;
const OFF_PLATFORM_RATE_REGEX = /(?:£|\$|€|gbp|usd|eur)\s*\d+|\d+\s*(?:£|\$|€)|(?:per|\/)\s*hour|per\s*day/i;

const EXTERNAL_CONTACT_KEYWORDS = [
  'whatsapp',
  'whats app',
  'telegram',
  'discord',
  'signal',
  'viber',
  'wechat',
  'snapchat',
  'instagram dm',
  'contact me on',
  'contact me at',
  'message me on',
  'call me on',
  'text me on',
  'contact me',
  'call me',
  'message me',
  'text me',
  'dm me',
];

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  SHORT_PHONE_REGEX,
  URL_REGEX,
  CONTACT_INTENT_REGEX,
  OFF_PLATFORM_RATE_REGEX,
  EXTERNAL_CONTACT_KEYWORDS,
};
