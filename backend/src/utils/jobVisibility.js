const WORKER_APPLYABLE_MODERATION_STATUSES = new Set(['visible', 'flagged']);

const WORKER_APPLYABLE_JOB_SQL = `COALESCE(moderation_status, 'visible') IN ('visible', 'flagged')`;
const WORKER_APPLYABLE_JOB_SQL_J = `COALESCE(j.moderation_status, 'visible') IN ('visible', 'flagged')`;
const OPEN_WORKER_APPLYABLE_JOB_FILTER = `status = 'open' AND ${WORKER_APPLYABLE_JOB_SQL}`;
const OPEN_WORKER_APPLYABLE_JOB_FILTER_J = `j.status = 'open' AND ${WORKER_APPLYABLE_JOB_SQL_J}`;

function isWorkerApplyableJob(job) {
  if (!job || job.status !== 'open') return false;
  return WORKER_APPLYABLE_MODERATION_STATUSES.has(job.moderation_status || 'visible');
}

module.exports = {
  WORKER_APPLYABLE_JOB_SQL,
  WORKER_APPLYABLE_JOB_SQL_J,
  OPEN_WORKER_APPLYABLE_JOB_FILTER,
  OPEN_WORKER_APPLYABLE_JOB_FILTER_J,
  isWorkerApplyableJob,
};
