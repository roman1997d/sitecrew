const app = require('./app');
const env = require('./config/env');
const { purgeDeletedUsersOlderThan24Hours } = require('./utils/deletedUserCleanup');

async function runDeletedUserCleanup() {
  try {
    const result = await purgeDeletedUsersOlderThan24Hours();
    if (result.deletedCount > 0) {
      console.log(`Purged ${result.deletedCount} deleted user account(s) after 24 hours.`);
    }
  } catch (error) {
    console.error('Deleted user cleanup failed:', error.message);
  }
}

app.listen(env.port, () => {
  console.log(`SiteCrew backend API running on http://localhost:${env.port}`);
  runDeletedUserCleanup();
  setInterval(runDeletedUserCleanup, 60 * 60 * 1000);
});
