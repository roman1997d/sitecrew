const crypto = require('crypto');
const pool = require('../db/pool');
const env = require('../config/env');

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function createRawResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildPasswordResetUrl(rawToken) {
  const baseUrl = env.publicUrl.replace(/\/$/, '');
  return `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

async function invalidateActiveResetTokens(userId, client = pool) {
  await client.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP`,
    [userId]
  );
}

async function createPasswordResetToken(userId, client = pool) {
  const rawToken = createRawResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + env.passwordResetTtlMinutes * 60 * 1000);

  await invalidateActiveResetTokens(userId, client);
  await client.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return {
    rawToken,
    resetUrl: buildPasswordResetUrl(rawToken),
  };
}

async function findValidResetToken(rawToken, client = pool) {
  const tokenHash = hashResetToken(rawToken);
  const result = await client.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, u.email, u.status
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );

  return result.rows[0] || null;
}

async function markResetTokenUsed(tokenId, client = pool) {
  await client.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [tokenId]
  );
}

module.exports = {
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
  buildPasswordResetUrl,
};
