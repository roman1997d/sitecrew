const routes = require('./routes');

function isFakeDataSimulatorEnabled() {
  return process.env.ENABLE_FAKE_DATA_SIMULATOR === 'true';
}

module.exports = {
  isFakeDataSimulatorEnabled,
  router: routes,
};
