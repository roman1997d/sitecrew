const app = require('./app');
const env = require('./config/env');
const { purgeDeletedUsersOlderThan24Hours } = require('./utils/deletedUserCleanup');
const { runScheduledEmailControlJobs } = require('./modules/admin/emailControl');
const { runDailyJobGenerator } = require('./modules/admin/dailyJobGenerator');
const { purgeApiLogsByAutoCleanSettings } = require('./utils/apiLogMaintenance');

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

async function runApiLogsAutoClean() {
  try {
    const result = await purgeApiLogsByAutoCleanSettings();
    if (result?.autoCleanEnabled && result.deletedCount > 0) {
      console.log(
        `API logs auto-clean removed ${result.deletedCount} log(s) older than ${result.retentionHours}h.`
      );
    }
  } catch (error) {
    console.error('API logs auto-clean failed:', error.message);
  }
}

async function runDailyJobsSchedule() {
  try {
    const result = await runDailyJobGenerator();
    if (result?.skipped) {
      if (result.reason === 'already_ran_today' && result.deletedJobs > 0) {
        console.log(`Daily jobs cleanup removed ${result.deletedJobs} expired generated job(s).`);
      }
      return;
    }
    console.log(
      `Daily jobs generator created ${result.createdJobs} job(s) for ${result.date} (${result.parity}), deleted ${result.deletedJobs} expired.`
    );
  } catch (error) {
    console.error('Daily jobs generator failed:', error.message);
  }
}

app.listen(env.port, () => {
  console.log(`SiteCrew backend API running on http://localhost:${env.port}`);
  runDeletedUserCleanup();
  setInterval(runDeletedUserCleanup, 60 * 60 * 1000);

  // Digests / unread reminders for modes with Automat enabled
  runEmailControlSchedule();
  setInterval(runEmailControlSchedule, 60 * 60 * 1000);

  // Auto-clean API logs when enabled (supports 1h retention)
  runApiLogsAutoClean();
  setInterval(runApiLogsAutoClean, 15 * 60 * 1000);

  // Fresh UK construction jobs: 14 on even calendar days, 7 on odd; expire after 7 days
  runDailyJobsSchedule();
  setInterval(runDailyJobsSchedule, 60 * 60 * 1000);
});
