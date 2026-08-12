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
  getEmailTestMode,
  setEmailTestMode,
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

  const [resolved, testMode] = await Promise.all([
    resolveRecipients(modeKey, context),
    getEmailTestMode(),
  ]);

  const notes = [];
  if (resolved.meta?.note) notes.push(resolved.meta.note);
  if (resolved.meta?.eventDriven) {
    notes.push('Event-driven mode: manual send is empty unless a target event is provided. Automat sends live.');
  }
  if (testMode.enabled) {
    notes.push(`TEST MODE ON — every email is delivered only to ${testMode.email}.`);
  }

  return {
    mode: mode.key,
    audience: mode.audience,
    label: mode.label,
    trigger: mode.trigger,
    recipientCount: resolved.recipients.length,
    estimated: Boolean(resolved.meta?.jobsConsidered != null),
    countReady: true,
    sendReady: true,
    note: notes.length ? notes.join(' ') : null,
    emailConfigured: isEmailConfigured(),
    testMode,
  };
}

async function getOverview() {
  const [autoModes, testMode] = await Promise.all([
    getAutoModeMap(),
    getEmailTestMode(),
  ]);
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
    testMode,
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
  getEmailTestMode,
  setEmailTestMode,
};
