const router = require('./routes');
const {
  getOverview,
  getAutoModeMap,
  isAutoModeEnabled,
  getRecipientEstimate,
  sendModeCampaign,
} = require('./service');
const { listEmailControlModes, getEmailControlMode } = require('./modes');

module.exports = {
  router,
  getOverview,
  getAutoModeMap,
  isAutoModeEnabled,
  getRecipientEstimate,
  sendModeCampaign,
  listEmailControlModes,
  getEmailControlMode,
};
