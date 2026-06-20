const { combineScanText } = require('../utils/normalize');
const { detectSpam } = require('../rules/spam');
const { detectScam } = require('../rules/scam');
const { detectExternalContact } = require('../rules/externalContact');
const { detectAbuse } = require('../rules/abuse');
const { detectJobQuality } = require('../rules/quality');
const { detectDuplicateContent } = require('../rules/duplicate');
const { detectNotAllowedTerms } = require('../rules/notAllowed');

function runRuleEngine(input) {
  const scanText = combineScanText(input);
  const spam = detectSpam(scanText);
  const scam = detectScam(scanText);
  const externalContact = detectExternalContact(scanText);
  const abuse = detectAbuse(scanText);
  const notAllowed = detectNotAllowedTerms(scanText, input.notAllowedTerms || []);
  const quality = detectJobQuality({
    text: input.text,
    title: input.title,
    contentType: input.contentType,
  });
  const duplicate = detectDuplicateContent({
    text: input.text,
    title: input.title,
    recentTexts: input.recentTexts,
  });

  const flags = [
    ...externalContact.flags,
    ...abuse.flags,
    ...duplicate.flags,
    ...notAllowed.flags,
  ];

  if (scam.score >= 70) {
    flags.push('possible_scam');
  }

  if (spam.score >= 70) {
    flags.push('possible_spam');
  }

  if (
    ['job_post', 'feed_post', 'company_profile'].includes(input.contentType)
    && externalContact.score > 0
  ) {
    scam.score = Math.max(scam.score, 75);
    if (!flags.includes('possible_scam')) {
      flags.push('possible_scam');
    }
  }

  if (notAllowed.score > 0) {
    scam.score = Math.max(scam.score, notAllowed.scamScore, notAllowed.score);
    spam.score = Math.max(spam.score, notAllowed.spamScore);
    abuse.score = Math.max(abuse.score, notAllowed.abuseScore, notAllowed.score);

    for (const flag of notAllowed.flags) {
      if (!flags.includes(flag)) {
        flags.push(flag);
      }
    }
  }

  return {
    scanText,
    scores: {
      spam: spam.score,
      scam: scam.score,
      abuse: abuse.score,
      quality: quality.score,
    },
    flags: [...new Set(flags)],
    matches: {
      spam: spam.matches,
      scam: scam.matches,
      externalContact: externalContact.matches,
      abuse: abuse.matches,
      quality: quality.matches,
      duplicate: duplicate.matches,
      notAllowed: notAllowed.matches,
    },
    duplicateScore: duplicate.score,
    externalContactScore: externalContact.score,
  };
}

module.exports = { runRuleEngine };
