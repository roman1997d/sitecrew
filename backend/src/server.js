const app = require('./app');
const env = require('./config/env');
const { purgeDeletedUsersOlderThan24Hours } = require('./utils/deletedUserCleanup');
const { runScheduledEmailControlJobs } = require('./modules/admin/emailControl');

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

async function runEmailControlSchedule() {
  try {
    const result = await runScheduledEmailControlJobs();
    if (result?.results?.length) {
      const sent = result.results.reduce((sum, item) => sum + (item.sentCount || 0), 0);
      console.log(`Email Control schedule ran ${result.results.length} mode(s), sent ${sent} email(s).`);
    }
  } catch (error) {
    console.error('Email Control schedule failed:', error.message);
  }
}

app.listen(env.port, () => {
  console.log(`SiteCrew backend API running on http://localhost:${env.port}`);
  runDeletedUserCleanup();
  setInterval(runDeletedUserCleanup, 60 * 60 * 1000);

  // Digests / unread reminders for modes with Automat enabled
  runEmailControlSchedule();
  setInterval(runEmailControlSchedule, 60 * 60 * 1000);
});
