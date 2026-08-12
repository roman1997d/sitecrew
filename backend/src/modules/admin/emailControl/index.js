const router = require('./routes');
const {
  getOverview,
  getAutoModeMap,
  isAutoModeEnabled,
  getRecipientEstimate,
  sendModeCampaign,
  setEmailTestMode,
  getEmailTestMode,
} = require('./service');
const { listEmailControlModes, getEmailControlMode } = require('./modes');
const {
  queueAutoMode,
  queueJobCreatedEmails,
  runScheduledEmailControlJobs,
} = require('./dispatcher');

module.exports = {
  router,
  getOverview,
  getAutoModeMap,
  isAutoModeEnabled,
  getRecipientEstimate,
  sendModeCampaign,
  setEmailTestMode,
  getEmailTestMode,
  listEmailControlModes,
  getEmailControlMode,
  queueAutoMode,
  queueJobCreatedEmails,
  runScheduledEmailControlJobs,
};
