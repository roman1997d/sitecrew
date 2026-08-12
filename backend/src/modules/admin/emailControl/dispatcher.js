const { isEmailConfigured, sendNotificationEmail, sendNewJobAlertEmail } = require('../../../utils/email');
const env = require('../../../config/env');
const { getAutoModeMap, isAutoModeEnabled } = require('./settings');
const { resolveRecipients, resolveJobEventRecipients, siteUrl } = require('./recipients');
const { buildEmailContent } = require('./content');
const { getEmailControlMode } = require('./modes');

async function sendWithConcurrency(items, worker, concurrency = 5) {
  const queue = items.slice();
  let sentCount = 0;
  let failedCount = 0;
  const errors = [];

  async function runNext() {
    const item = queue.shift();
    if (!item) return;
    try {
      await worker(item);
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      if (errors.length < 5) {
        errors.push(error.message);
      }
    }
    await runNext();
  }

  const starters = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(starters);
  return { sentCount, failedCount, errors };
}

async function deliverToRecipient(modeKey, recipient, context = {}) {
  const content = buildEmailContent(modeKey, recipient, context);

  // Reuse polished job-alert template when we have a single job context
  if (
    context.job
    && ['interests', 'location', 'interests-location', 'followed-company-jobs'].includes(modeKey)
  ) {
    let alertReason = 'interest';
    if (recipient.followMatch && recipient.interestMatch) alertReason = 'both';
    else if (recipient.followMatch) alertReason = 'follow';
    else if (recipient.locationMatch && !recipient.interestMatch) alertReason = 'interest';

    await sendNewJobAlertEmail({
      to: recipient.email,
      workerName: recipient.name,
      companyName: context.companyName || context.job.company_name || 'A company',
      jobTitle: context.job.title,
      jobUrl: siteUrl(`/jobs/${context.job.id}`),
      alertReason,
    });
    return;
  }

  await sendNotificationEmail({
    to: recipient.email,
    name: recipient.name,
    subject: content.subject,
    intro: content.intro,
    details: content.details,
    ctaLabel: content.ctaLabel,
    ctaUrl: content.ctaUrl,
  });
}

async function runModeCampaign(modeKey, {
  dryRun = false,
  context = {},
  actorId = null,
} = {}) {
  const mode = getEmailControlMode(modeKey);
  if (!mode) {
    const error = new Error('Unknown email control mode.');
    error.statusCode = 404;
    throw error;
  }

  const resolved = await resolveRecipients(modeKey, context);
  const recipients = resolved.recipients || [];

  if (dryRun) {
    return {
      ok: true,
      status: 'dry_run',
      mode: modeKey,
      audience: mode.audience,
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      emailConfigured: isEmailConfigured(),
      message: `Dry run: ${recipients.length} recipient(s) would be emailed.`,
      note: resolved.meta?.note || null,
      actorId,
    };
  }

  if (!isEmailConfigured()) {
    const error = new Error('Email service is not configured.');
    error.statusCode = 503;
    throw error;
  }

  if (!recipients.length) {
    return {
      ok: true,
      status: 'empty',
      mode: modeKey,
      audience: mode.audience,
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      emailConfigured: true,
      message: resolved.meta?.eventDriven
        ? 'No recipients for a manual blast. This mode sends on live events when Automat is enabled.'
        : 'No matching recipients found for this mode right now.',
      note: resolved.meta?.note || null,
      actorId,
    };
  }

  const { sentCount, failedCount, errors } = await sendWithConcurrency(
    recipients,
    (recipient) => deliverToRecipient(modeKey, recipient, context)
  );

  return {
    ok: true,
    status: failedCount && !sentCount ? 'failed' : 'sent',
    mode: modeKey,
    audience: mode.audience,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    emailConfigured: true,
    message: `Sent ${sentCount}/${recipients.length} email(s)${failedCount ? `, ${failedCount} failed` : ''}.`,
    errors,
    actorId,
  };
}

function queueAutoMode(modeKey, context = {}) {
  if (!isEmailConfigured()) return;

  (async () => {
    try {
      const enabled = await isAutoModeEnabled(modeKey);
      if (!enabled) return;

      if (context.targetUserId) {
        const resolved = await resolveRecipients(modeKey, context);
        if (!resolved.recipients.length) return;
        await deliverToRecipient(modeKey, resolved.recipients[0], context);
        return;
      }

      await runModeCampaign(modeKey, { context });
    } catch (error) {
      console.error(`Email Control auto mode "${modeKey}" failed:`, error.message);
    }
  })();
}

function queueJobCreatedEmails({ job, companyId, companyName, excludeUserId = null }) {
  if (!isEmailConfigured()) return;

  (async () => {
    try {
      const autoModes = await getAutoModeMap();
      const enabledModes = [
        'interests',
        'location',
        'interests-location',
        'followed-company-jobs',
      ].filter((mode) => autoModes[mode]);

      if (!enabledModes.length) {
        return;
      }

      const recipients = (await resolveJobEventRecipients(job, companyId, enabledModes))
        .filter((recipient) => !(excludeUserId && Number(recipient.userId) === Number(excludeUserId)));

      await sendWithConcurrency(recipients, async (recipient) => {
        // Prefer the most specific mode hit for template reason
        const modeKey = recipient.modesHit.includes('interests-location')
          ? 'interests-location'
          : recipient.modesHit[0];
        await deliverToRecipient(modeKey, recipient, {
          job,
          companyName,
        });
      });
    } catch (error) {
      console.error('Email Control job-created queue failed:', error.message);
    }
  })();
}

const SCHEDULED_MODES = [
  'unread-12h',
  'company-unread-12h',
  'job-prices-interests',
  'profile-incomplete',
  'expected-rate-missing',
  'availability-reminder',
  'company-plan-expiry',
  'company-matched-workers',
  'company-rates-digest',
];

async function runScheduledEmailControlJobs() {
  if (!isEmailConfigured()) {
    return { skipped: true, reason: 'email_not_configured' };
  }

  const autoModes = await getAutoModeMap();
  const results = [];

  for (const mode of SCHEDULED_MODES) {
    if (!autoModes[mode]) continue;
    try {
      const result = await runModeCampaign(mode);
      results.push({ mode, ...result });
    } catch (error) {
      results.push({ mode, status: 'failed', message: error.message });
      console.error(`Scheduled email mode "${mode}" failed:`, error.message);
    }
  }

  return { ok: true, results };
}

module.exports = {
  runModeCampaign,
  queueAutoMode,
  queueJobCreatedEmails,
  runScheduledEmailControlJobs,
  deliverToRecipient,
  SCHEDULED_MODES,
};
