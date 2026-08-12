const { isEmailConfigured } = require('../../../utils/email');
const {
  getEmailControlMode,
  listEmailControlModes,
} = require('./modes');
const {
  ensureEmailControlSettingsTable,
  getAutoModeMap,
  setAutoMode,
  setAutoModes,
  isAutoModeEnabled,
} = require('./settings');
const { resolveRecipients } = require('./recipients');
const { runModeCampaign } = require('./dispatcher');

async function getRecipientEstimate(modeKey, context = {}) {
  const mode = getEmailControlMode(modeKey);
  if (!mode) {
    const error = new Error('Unknown email control mode.');
    error.statusCode = 404;
    throw error;
  }

  const resolved = await resolveRecipients(modeKey, context);
  return {
    mode: mode.key,
    audience: mode.audience,
    label: mode.label,
    trigger: mode.trigger,
    recipientCount: resolved.recipients.length,
    estimated: Boolean(resolved.meta?.jobsConsidered != null),
    countReady: true,
    sendReady: true,
    note: resolved.meta?.note
      || (resolved.meta?.eventDriven
        ? 'Event-driven mode: manual send is empty unless a target event is provided. Automat sends live.'
        : null),
    emailConfigured: isEmailConfigured(),
  };
}

async function getOverview() {
  const autoModes = await getAutoModeMap();
  const modes = listEmailControlModes().map((mode) => ({
    ...mode,
    autoEnabled: Boolean(autoModes[mode.key]),
    sendReady: true,
    countReady: true,
  }));

  return {
    ok: true,
    emailConfigured: isEmailConfigured(),
    modes,
    autoModes,
  };
}

async function sendModeCampaign(modeKey, options = {}) {
  return runModeCampaign(modeKey, options);
}

module.exports = {
  ensureEmailControlSettingsTable,
  getOverview,
  getAutoModeMap,
  setAutoMode,
  setAutoModes,
  getRecipientEstimate,
  sendModeCampaign,
  isAutoModeEnabled,
};
