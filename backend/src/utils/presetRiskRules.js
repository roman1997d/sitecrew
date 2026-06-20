const { getPresetRiskRules } = require('../../../services/ai-scan-service/src/rules/presetRulesCatalog');

function listPresetRiskRules() {
  return getPresetRiskRules();
}

module.exports = {
  listPresetRiskRules,
};
