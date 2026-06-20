function formatCategoryLabel(category) {
  return String(category || 'blocked content').replace(/_/g, ' ');
}

function formatMatchList(matches, limit = 3) {
  if (!Array.isArray(matches) || !matches.length) {
    return '';
  }

  return matches
    .slice(0, limit)
    .map((match) => {
      if (typeof match === 'string') {
        return `"${match}"`;
      }

      if (match?.term) {
        return `"${match.term}"`;
      }

      return String(match);
    })
    .join(', ');
}

function buildRiskReason({
  overallRisk = 0,
  flags = [],
  matches = {},
} = {}) {
  if (overallRisk <= 30) {
    return null;
  }

  const reasons = [];

  if (matches.notAllowed?.length) {
    const learned = matches.notAllowed.map((match) => {
      if (typeof match === 'string') {
        return `"${match}"`;
      }

      const label = formatCategoryLabel(match.category);
      return `"${match.term}" (${label})`;
    });
    reasons.push(`learned blocked word(s): ${learned.join(', ')}`);
  }

  if (matches.spam?.length) {
    reasons.push(`spam phrase(s): ${formatMatchList(matches.spam)}`);
  }

  if (matches.scam?.length) {
    reasons.push(`scam phrase(s): ${formatMatchList(matches.scam)}`);
  }

  if (matches.abuse?.length) {
    reasons.push(`abusive language: ${formatMatchList(matches.abuse)}`);
  }

  if (matches.externalContact?.length) {
    reasons.push(`external contact detail(s): ${formatMatchList(matches.externalContact)}`);
  } else if (flags.includes('external_contact')) {
    reasons.push('external contact details detected');
  }

  if (matches.duplicate?.length || flags.includes('duplicate_content')) {
    reasons.push('duplicate or near-duplicate content');
  }

  if (matches.quality?.length) {
    reasons.push(`low quality content: ${formatMatchList(matches.quality)}`);
  }

  if (flags.includes('possible_scam') && !reasons.some((entry) => entry.includes('scam'))) {
    reasons.push('possible scam pattern');
  }

  if (flags.includes('possible_spam') && !reasons.some((entry) => entry.includes('spam'))) {
    reasons.push('possible spam pattern');
  }

  if (flags.includes('not_allowed_content') && !matches.notAllowed?.length) {
    reasons.push('blocked content rule matched');
  }

  if (flags.includes('abusive_language') && !matches.abuse?.length && !matches.notAllowed?.length) {
    reasons.push('abusive language detected');
  }

  if (!reasons.length) {
    reasons.push('automated moderation rules flagged this content');
  }

  return `Reason why this post is under risk is: ${reasons.join('; ')}.`;
}

module.exports = {
  buildRiskReason,
};
