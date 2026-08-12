const pool = require('../../../db/pool');
const { getEmailControlMode, listEmailControlModes } = require('./modes');

let settingsTableReady = false;
let configTableReady = false;

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

async function ensureEmailControlConfigTable() {
  if (configTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_control_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      test_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      test_email TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    INSERT INTO email_control_config (id, test_mode_enabled, test_email)
    VALUES (1, FALSE, NULL)
    ON CONFLICT (id) DO NOTHING
  `);

  configTableReady = true;
}

async function getEmailTestMode() {
  await ensureEmailControlConfigTable();
  const result = await pool.query(
    `SELECT test_mode_enabled, test_email
     FROM email_control_config
     WHERE id = 1`
  );
  const row = result.rows[0] || {};
  const email = row.test_email ? String(row.test_email).trim().toLowerCase() : null;
  const enabled = Boolean(row.test_mode_enabled) && Boolean(email);
  return {
    enabled,
    email: enabled ? email : (email || null),
    configuredEmail: email,
  };
}

async function setEmailTestMode({ enabled, email = null }, actorId = null) {
  await ensureEmailControlConfigTable();

  if (enabled) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      const error = new Error('A valid test email address is required.');
      error.statusCode = 400;
      throw error;
    }

    await pool.query(
      `UPDATE email_control_config
       SET test_mode_enabled = TRUE,
           test_email = $1,
           updated_at = NOW(),
           updated_by = $2
       WHERE id = 1`,
      [normalized, actorId]
    );
  } else {
    await pool.query(
      `UPDATE email_control_config
       SET test_mode_enabled = FALSE,
           updated_at = NOW(),
           updated_by = $1
       WHERE id = 1`,
      [actorId]
    );
  }

  return getEmailTestMode();
}

/**
 * When test mode is on, force every outbound email to the saved test address.
 */
async function resolveOutboundEmail(originalTo) {
  const testMode = await getEmailTestMode();
  if (!testMode.enabled || !testMode.email) {
    return {
      to: originalTo,
      testMode: false,
      originalTo,
    };
  }
  return {
    to: testMode.email,
    testMode: true,
    originalTo,
    testEmail: testMode.email,
  };
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
      const value = row.auto_enabled;
      map[row.mode_key] = value === true || value === 't' || value === 'true' || value === 1 || value === '1';
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
  await ensureEmailControlSettingsTable();
  const result = await pool.query(
    `SELECT auto_enabled
     FROM email_control_settings
     WHERE mode_key = $1
     LIMIT 1`,
    [modeKey]
  );
  if (!result.rowCount) {
    return false;
  }
  // Accept real booleans and common PG/driver string forms.
  const value = result.rows[0].auto_enabled;
  return value === true || value === 't' || value === 'true' || value === 1 || value === '1';
}

module.exports = {
  ensureEmailControlSettingsTable,
  ensureEmailControlConfigTable,
  getAutoModeMap,
  setAutoMode,
  setAutoModes,
  isAutoModeEnabled,
  getEmailTestMode,
  setEmailTestMode,
  resolveOutboundEmail,
};
