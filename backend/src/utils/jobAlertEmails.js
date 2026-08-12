const pool = require('../db/pool');
const env = require('../config/env');
const { isEmailConfigured } = require('./email');
const { isWorkerApplyableJob } = require('./jobVisibility');
const { queueJobCreatedEmails } = require('../modules/admin/emailControl/dispatcher');

function buildJobUrl(jobId) {
  return `${env.publicUrl.replace(/\/$/, '')}/jobs/${jobId}`;
}

async function getCompanyName(companyId) {
  const result = await pool.query(
    'SELECT company_name FROM company_profiles WHERE user_id = $1',
    [companyId]
  );
  return result.rows[0]?.company_name || 'A company';
}

function queueJobAlertEmails({ job, companyId, excludeUserId = null }) {
  if (!isEmailConfigured() || !isWorkerApplyableJob(job)) {
    return;
  }

  (async () => {
    try {
      const companyName = await getCompanyName(companyId);
      queueJobCreatedEmails({
        job,
        companyId,
        companyName,
        excludeUserId,
      });
    } catch (error) {
      console.error('Job alert email queue failed:', error.message);
    }
  })();
}

module.exports = {
  buildJobUrl,
  queueJobAlertEmails,
  getCompanyName,
};
