const router = require('./routes');
const {
  ensureSchema,
  getStatus,
  setEnabled,
  runDailyJobGenerator,
  deleteExpiredGeneratedJobs,
} = require('./service');

module.exports = {
  router,
  ensureSchema,
  getStatus,
  setEnabled,
  runDailyJobGenerator,
  deleteExpiredGeneratedJobs,
};
