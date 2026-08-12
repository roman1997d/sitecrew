const pool = require('../db/pool');

const SETTINGS_KEY = 'api_logs_auto_clean';
const ALLOWED_RETENTION_HOURS = [1, 6, 12, 24];
const DEFAULT_RETENTION_HOURS = 24;

function normalizeRetentionHours(value) {
  const hours = Number(value);
  if (!ALLOWED_RETENTION_HOURS.includes(hours)) {
    const error = new Error(`Auto clean retention must be one of: ${ALLOWED_RETENTION_HOURS.join(', ')} hours.`);
    error.status = 400;
    throw error;
  }
  return hours;
}

async function getApiLogsAutoCleanSettings() {
  const result = await pool.query(
    `SELECT value FROM ai_scan_settings WHERE key = $1`,
    [SETTINGS_KEY]
  );

  if (result.rowCount === 0) {
    return {
      autoCleanEnabled: false,
      retentionHours: DEFAULT_RETENTION_HOURS,
    };
  }

  const value = result.rows[0].value || {};
  let retentionHours = DEFAULT_RETENTION_HOURS;
  try {
    retentionHours = normalizeRetentionHours(value.retentionHours ?? DEFAULT_RETENTION_HOURS);
  } catch {
    retentionHours = DEFAULT_RETENTION_HOURS;
  }

  return {
    autoCleanEnabled: value.enabled === true || value.enabled === 'true',
    retentionHours,
  };
}

async function setApiLogsAutoCleanSettings({ autoCleanEnabled, retentionHours }) {
  const settings = {
    enabled: Boolean(autoCleanEnabled),
    retentionHours: normalizeRetentionHours(retentionHours ?? DEFAULT_RETENTION_HOURS),
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
    autoCleanEnabled: settings.enabled,
    retentionHours: settings.retentionHours,
  };
}

async function deleteApiLogsOlderThanHours(hours) {
  const retentionHours = normalizeRetentionHours(hours);
  const result = await pool.query(
    `DELETE FROM api_logs
     WHERE created_at < NOW() - ($1 * INTERVAL '1 hour')
     RETURNING id`,
    [retentionHours]
  );

  return {
    deletedCount: result.rowCount,
    retentionHours,
  };
}

async function purgeApiLogsByAutoCleanSettings() {
  const settings = await getApiLogsAutoCleanSettings();
  if (!settings.autoCleanEnabled) {
    return {
      autoCleanEnabled: false,
      deletedCount: 0,
      retentionHours: settings.retentionHours,
    };
  }

  const result = await deleteApiLogsOlderThanHours(settings.retentionHours);
  return {
    autoCleanEnabled: true,
    deletedCount: result.deletedCount,
    retentionHours: settings.retentionHours,
  };
}

module.exports = {
  getApiLogsAutoCleanSettings,
  setApiLogsAutoCleanSettings,
  deleteApiLogsOlderThanHours,
  purgeApiLogsByAutoCleanSettings,
  ALLOWED_RETENTION_HOURS,
  DEFAULT_RETENTION_HOURS,
};
