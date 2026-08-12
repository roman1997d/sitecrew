const pool = require('../../../db/pool');
const { getEmailControlMode, listEmailControlModes } = require('./modes');

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

async function isAutoModeEnabled(modeKey) {
  const map = await getAutoModeMap();
  return Boolean(map[modeKey]);
}

module.exports = {
  ensureEmailControlSettingsTable,
  getAutoModeMap,
  setAutoMode,
  setAutoModes,
  isAutoModeEnabled,
};
