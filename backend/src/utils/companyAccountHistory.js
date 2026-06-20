const pool = require('../db/pool');

async function logCompanyAccountHistory({
  companyId,
  actorId,
  actorEmail,
  action,
  reason,
}) {
  await pool.query(
    `INSERT INTO company_account_history (company_id, actor_id, actor_email, action, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [companyId, actorId, actorEmail, action, reason.trim()]
  );
}

module.exports = logCompanyAccountHistory;
