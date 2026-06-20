const pool = require('../db/pool');

const SETTINGS_KEY = 'audit_auto_delete';
const DEFAULT_RETENTION_DAYS = 90;
const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 3650;

function normalizeRetentionDays(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
    const error = new Error(`Retention must be an integer between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS} days.`);
    error.status = 400;
    throw error;
  }
  return days;
}

async function getAuditAutoDeleteSettings() {
  const result = await pool.query(
    `SELECT value FROM ai_scan_settings WHERE key = $1`,
    [SETTINGS_KEY]
  );

  if (result.rowCount === 0) {
    return {
      autoDeleteEnabled: false,
      retentionDays: DEFAULT_RETENTION_DAYS,
    };
  }

  const value = result.rows[0].value || {};
  return {
    autoDeleteEnabled: value.enabled === true || value.enabled === 'true',
    retentionDays: normalizeRetentionDays(value.retentionDays ?? DEFAULT_RETENTION_DAYS),
  };
}

async function setAuditAutoDeleteSettings({ autoDeleteEnabled, retentionDays }) {
  const settings = {
    enabled: Boolean(autoDeleteEnabled),
    retentionDays: normalizeRetentionDays(retentionDays ?? DEFAULT_RETENTION_DAYS),
  };

  await pool.query(
    `INSERT INTO ai_scan_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = CURRENT_TIMESTAMP`,
    [SETTINGS_KEY, JSON.stringify(settings)]
  );

  return {
    autoDeleteEnabled: settings.enabled,
    retentionDays: settings.retentionDays,
  };
}

async function deleteAuditTrailsOlderThanDays(days) {
  const retentionDays = normalizeRetentionDays(days);
  const result = await pool.query(
    `DELETE FROM audit_trails
     WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
     RETURNING id`,
    [retentionDays]
  );

  return {
    deletedCount: result.rowCount,
    retentionDays,
  };
}

async function deleteAllAuditTrails() {
  const result = await pool.query('DELETE FROM audit_trails RETURNING id');
  return { deletedCount: result.rowCount };
}

async function purgeAuditTrailsByAutoDeleteSettings() {
  const settings = await getAuditAutoDeleteSettings();
  if (!settings.autoDeleteEnabled) {
    return {
      autoDeleteEnabled: false,
      deletedCount: 0,
      retentionDays: settings.retentionDays,
    };
  }

  const result = await deleteAuditTrailsOlderThanDays(settings.retentionDays);
  return {
    autoDeleteEnabled: true,
    deletedCount: result.deletedCount,
    retentionDays: settings.retentionDays,
  };
}

module.exports = {
  getAuditAutoDeleteSettings,
  setAuditAutoDeleteSettings,
  deleteAuditTrailsOlderThanDays,
  deleteAllAuditTrails,
  purgeAuditTrailsByAutoDeleteSettings,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
};
