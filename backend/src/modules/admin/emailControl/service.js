const pool = require('../../../db/pool');
const { isEmailConfigured } = require('../../../utils/email');
const {
  getEmailControlMode,
  listEmailControlModes,
} = require('./modes');

let settingsTableReady = false;

async function ensureEmailControlSettingsTable() {
  if (settingsTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_control_settings (
      mode_key TEXT PRIMARY KEY,
      auto_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  settingsTableReady = true;
}

async function getAutoModeMap() {
  await ensureEmailControlSettingsTable();
  const result = await pool.query(
    'SELECT mode_key, auto_enabled FROM email_control_settings'
  );
  const map = {};
  for (const mode of listEmailControlModes()) {
    map[mode.key] = false;
  }
  for (const row of result.rows) {
    if (Object.prototype.hasOwnProperty.call(map, row.mode_key)) {
      map[row.mode_key] = Boolean(row.auto_enabled);
    }
  }
  return map;
}

async function setAutoMode(modeKey, enabled, actorId = null) {
  const mode = getEmailControlMode(modeKey);
  if (!mode) {
    const error = new Error('Unknown email control mode.');
    error.statusCode = 404;
    throw error;
  }

  await ensureEmailControlSettingsTable();
  await pool.query(
    `INSERT INTO email_control_settings (mode_key, auto_enabled, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (mode_key) DO UPDATE
     SET auto_enabled = EXCLUDED.auto_enabled,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by`,
    [modeKey, Boolean(enabled), actorId]
  );

  return getAutoModeMap();
}

async function setAutoModes(partialModes, actorId = null) {
  const entries = Object.entries(partialModes || {});
  for (const [modeKey, enabled] of entries) {
    if (!getEmailControlMode(modeKey)) {
      const error = new Error(`Unknown email control mode: ${modeKey}`);
      error.statusCode = 400;
      throw error;
    }
    await setAutoMode(modeKey, enabled, actorId);
  }
  return getAutoModeMap();
}

async function countActiveWorkersWithInterests() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND COALESCE(cardinality(wp.trade_interests), 0) > 0`
  );
  return result.rows[0]?.count || 0;
}

async function countActiveWorkersWithLocation() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND (
         NULLIF(BTRIM(COALESCE(wp.city, '')), '') IS NOT NULL
         OR NULLIF(BTRIM(COALESCE(wp.postcode, '')), '') IS NOT NULL
         OR COALESCE(cardinality(wp.work_locations), 0) > 0
       )`
  );
  return result.rows[0]?.count || 0;
}

async function countActiveWorkersWithInterestsAndLocation() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND COALESCE(cardinality(wp.trade_interests), 0) > 0
       AND (
         NULLIF(BTRIM(COALESCE(wp.city, '')), '') IS NOT NULL
         OR NULLIF(BTRIM(COALESCE(wp.postcode, '')), '') IS NOT NULL
         OR COALESCE(cardinality(wp.work_locations), 0) > 0
       )`
  );
  return result.rows[0]?.count || 0;
}

async function countWorkersFollowingCompanies() {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT u.id)::int AS count
     FROM users u
     JOIN follows f ON f.follower_id = u.id
     JOIN users c ON c.id = f.following_id AND c.role = 'company'
     WHERE u.role = 'worker'
       AND u.status = 'active'`
  );
  return result.rows[0]?.count || 0;
}

async function countIncompleteWorkerProfiles() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND (
         NULLIF(BTRIM(COALESCE(wp.profile_photo, '')), '') IS NULL
         OR COALESCE(cardinality(wp.trade_interests), 0) = 0
         OR (
           NULLIF(BTRIM(COALESCE(wp.city, '')), '') IS NULL
           AND NULLIF(BTRIM(COALESCE(wp.postcode, '')), '') IS NULL
           AND COALESCE(cardinality(wp.work_locations), 0) = 0
         )
       )`
  );
  return result.rows[0]?.count || 0;
}

async function countWorkersMissingExpectedRate() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'
       AND NULLIF(BTRIM(COALESCE(wp.expected_rate, '')), '') IS NULL`
  );
  return result.rows[0]?.count || 0;
}

async function countActiveCompanies() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     WHERE u.role = 'company'
       AND u.status = 'active'`
  );
  return result.rows[0]?.count || 0;
}

async function countCompaniesWithPlanExpiringSoon() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN company_profiles cp ON cp.user_id = u.id
     WHERE u.role = 'company'
       AND u.status = 'active'
       AND cp.plan_expires_at IS NOT NULL
       AND cp.plan_expires_at <= NOW() + INTERVAL '14 days'`
  );
  return result.rows[0]?.count || 0;
}

/**
 * Returns audience / pending recipient estimate for a mode.
 * Event-driven modes may return 0 until pending-event queries are implemented.
 */
async function getRecipientEstimate(modeKey) {
  const mode = getEmailControlMode(modeKey);
  if (!mode) {
    const error = new Error('Unknown email control mode.');
    error.statusCode = 404;
    throw error;
  }

  let recipientCount = 0;
  let note = null;
  let estimated = true;

  switch (modeKey) {
    case 'interests':
    case 'job-prices-interests':
      recipientCount = await countActiveWorkersWithInterests();
      note = 'Audience estimate: active workers with trade interests.';
      break;
    case 'location':
      recipientCount = await countActiveWorkersWithLocation();
      note = 'Audience estimate: active workers with a location set.';
      break;
    case 'interests-location':
      recipientCount = await countActiveWorkersWithInterestsAndLocation();
      note = 'Audience estimate: active workers with interests and location.';
      break;
    case 'followed-company-jobs':
      recipientCount = await countWorkersFollowingCompanies();
      note = 'Audience estimate: workers following at least one company.';
      break;
    case 'profile-incomplete':
      recipientCount = await countIncompleteWorkerProfiles();
      note = 'Workers missing photo, interests, or location.';
      estimated = false;
      break;
    case 'expected-rate-missing':
      recipientCount = await countWorkersMissingExpectedRate();
      note = 'Workers without expected rate.';
      estimated = false;
      break;
    case 'company-matched-workers':
    case 'company-rates-digest':
      recipientCount = await countActiveCompanies();
      note = 'Audience estimate: active company accounts.';
      break;
    case 'company-plan-expiry':
      recipientCount = await countCompaniesWithPlanExpiringSoon();
      note = 'Companies with plan expiring within 14 days.';
      estimated = false;
      break;
    default:
      recipientCount = 0;
      note = mode.countReady
        ? 'Recipient query not implemented yet for this mode.'
        : 'Event-driven mode: count will use pending trigger events.';
      break;
  }

  return {
    mode: mode.key,
    audience: mode.audience,
    label: mode.label,
    trigger: mode.trigger,
    recipientCount,
    estimated,
    countReady: mode.countReady,
    sendReady: mode.sendReady,
    note,
    emailConfigured: isEmailConfigured(),
  };
}

async function getOverview() {
  const autoModes = await getAutoModeMap();
  const modes = listEmailControlModes().map((mode) => ({
    ...mode,
    autoEnabled: Boolean(autoModes[mode.key]),
  }));

  return {
    ok: true,
    emailConfigured: isEmailConfigured(),
    modes,
    autoModes,
  };
}

/**
 * Manual send entry-point.
 * Pipeline is prepared (validate + estimate + audit); actual SMTP per mode comes next.
 */
async function sendModeCampaign(modeKey, { actorId = null, dryRun = false } = {}) {
  const estimate = await getRecipientEstimate(modeKey);
  const mode = getEmailControlMode(modeKey);

  if (!mode.sendReady) {
    return {
      ok: true,
      status: 'prepared',
      dryRun: Boolean(dryRun),
      mode: mode.key,
      audience: mode.audience,
      recipientCount: estimate.recipientCount,
      sentCount: 0,
      emailConfigured: estimate.emailConfigured,
      message:
        'Mode is registered and ready for backend send implementation. No emails were sent yet.',
      note: estimate.note,
    };
  }

  if (!estimate.emailConfigured) {
    const error = new Error('Email service is not configured.');
    error.statusCode = 503;
    throw error;
  }

  // Future: resolve recipients, render template, send via utils/email.js
  return {
    ok: true,
    status: 'sent',
    dryRun: Boolean(dryRun),
    mode: mode.key,
    audience: mode.audience,
    recipientCount: estimate.recipientCount,
    sentCount: dryRun ? 0 : estimate.recipientCount,
    emailConfigured: true,
    message: dryRun ? 'Dry run completed.' : 'Emails queued/sent.',
    actorId,
  };
}

async function isAutoModeEnabled(modeKey) {
  const map = await getAutoModeMap();
  return Boolean(map[modeKey]);
}

module.exports = {
  ensureEmailControlSettingsTable,
  getOverview,
  getAutoModeMap,
  setAutoMode,
  setAutoModes,
  getRecipientEstimate,
  sendModeCampaign,
  isAutoModeEnabled,
};
