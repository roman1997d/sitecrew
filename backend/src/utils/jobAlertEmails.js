const pool = require('../db/pool');
const env = require('../config/env');
const { isEmailConfigured, sendNewJobAlertEmail } = require('./email');
const { jobMatchesTradeInterests } = require('./tradeMatching');
const { isWorkerApplyableJob } = require('./jobVisibility');

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

function getAlertReason(followsCompany, interestMatch) {
  if (followsCompany && interestMatch) {
    return 'both';
  }
  if (followsCompany) {
    return 'follow';
  }
  return 'interest';
}

async function findJobAlertRecipients(companyId, job) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       wp.full_name,
       wp.trade_interests,
       EXISTS(
         SELECT 1
         FROM follows f
         WHERE f.follower_id = u.id
           AND f.following_id = $1
       ) AS follows_company
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND (
         EXISTS(
           SELECT 1
           FROM follows f
           WHERE f.follower_id = u.id
             AND f.following_id = $1
         )
         OR COALESCE(cardinality(wp.trade_interests), 0) > 0
       )`,
    [companyId]
  );

  return result.rows
    .map((row) => {
      const interestMatch = jobMatchesTradeInterests(job, row.trade_interests || []);
      const followsCompany = Boolean(row.follows_company);
      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        alertReason: getAlertReason(followsCompany, interestMatch),
        followsCompany,
        interestMatch,
      };
    })
    .filter((row) => row.followsCompany || row.interestMatch);
}

function queueJobAlertEmails({ job, companyId, excludeUserId = null }) {
  if (!isEmailConfigured() || !isWorkerApplyableJob(job)) {
    return;
  }

  (async () => {
    try {
      const [companyName, recipients] = await Promise.all([
        getCompanyName(companyId),
        findJobAlertRecipients(companyId, job),
      ]);
      const jobUrl = buildJobUrl(job.id);

      recipients.forEach((recipient) => {
        if (excludeUserId && Number(recipient.id) === Number(excludeUserId)) {
          return;
        }

        sendNewJobAlertEmail({
          to: recipient.email,
          workerName: recipient.fullName,
          companyName,
          jobTitle: job.title,
          jobUrl,
          alertReason: recipient.alertReason,
        }).catch((error) => {
          console.error(`Job alert email failed for ${recipient.email}:`, error.message);
        });
      });
    } catch (error) {
      console.error('Job alert email queue failed:', error.message);
    }
  })();
}

module.exports = {
  buildJobUrl,
  findJobAlertRecipients,
  queueJobAlertEmails,
};
