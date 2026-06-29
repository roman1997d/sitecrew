const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../../db/pool');
const env = require('../../config/env');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { getLatestSalesPlanTerms } = require('../../utils/accessPlans');
const { setAuthSessionCookie, clearAuthSessionCookie } = require('../../utils/requestToken');
const { isEmailConfigured, sendPasswordResetEmail } = require('../../utils/email');
const {
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
} = require('../../utils/passwordReset');

const router = express.Router();

const credentialsSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8),
  }),
});

const PASSWORD_RESET_GENERIC_MESSAGE = 'If an account exists for this email, you will receive reset instructions shortly.';

const workerRegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().trim().min(2, 'Full name is required.'),
    phone: z.string().optional(),
    trade: z.string().trim().min(2).optional(),
    trades: z.array(z.string().trim().min(1)).optional(),
    city: z.string().trim().optional(),
    postcode: z.string().optional(),
  }),
});

function getRegistrationTrade(body = {}) {
  const directTrade = String(body.trade || '').trim();
  if (directTrade.length >= 2) {
    return directTrade;
  }

  const legacyTrades = Array.isArray(body.trades) ? body.trades : [];
  const firstLegacyTrade = String(legacyTrades[0] || '').trim();
  return firstLegacyTrade.length >= 2 ? firstLegacyTrade : '';
}

async function resolveConstructionTrade(client, tradeName) {
  const result = await client.query(
    `SELECT name
     FROM construction_trades
     WHERE name ILIKE $1
     ORDER BY
       CASE WHEN lower(name) = lower($1) THEN 0
            WHEN name ILIKE $2 THEN 1
            ELSE 2 END,
       name ASC
     LIMIT 1`,
    [tradeName.trim(), `${tradeName.trim()}%`]
  );

  return result.rows[0]?.name || null;
}

const companyRegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    companyName: z.string().min(2),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    planKey: z.enum(['free', 'pro', 'ultra']),
    termsVersion: z.number().int().positive(),
    termsAccepted: z.literal(true),
  }),
});

function signToken(user) {
  return jwt.sign(
    { role: user.role, email: user.email },
    env.jwtSecret,
    { subject: String(user.id), expiresIn: env.jwtExpiresIn }
  );
}

function sendAuthResponse(res, statusCode, user) {
  const token = signToken(user);
  setAuthSessionCookie(res, token);
  res.status(statusCode).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
  });
}

async function createUser(client, { email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await client.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, status, created_at`,
    [email, passwordHash, role]
  );
  return result.rows[0];
}

router.post('/register-worker', validate(workerRegisterSchema), asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, city, postcode } = req.validated.body;
  const trade = getRegistrationTrade(req.validated.body);

  if (!trade) {
    return res.status(400).json({ error: 'Please select your trade from the suggestions.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const canonicalTrade = await resolveConstructionTrade(client, trade);
    if (!canonicalTrade) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Please select a valid trade from the suggestions.' });
    }

    const user = await createUser(client, { email, password, role: 'worker' });
    await client.query(
      `INSERT INTO worker_profiles (
         user_id,
         full_name,
         phone,
         trades,
         trade_interests,
         city,
         postcode
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        fullName,
        phone || null,
        [canonicalTrade],
        [canonicalTrade],
        city || null,
        postcode || null,
      ]
    );
    await client.query('COMMIT');
    sendAuthResponse(res, 201, user);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

router.post('/register-company', validate(companyRegisterSchema), asyncHandler(async (req, res) => {
  const {
    email,
    password,
    companyName,
    phone,
    website,
    city,
    postcode,
    planKey,
    termsVersion,
  } = req.validated.body;

  const latestTerms = await getLatestSalesPlanTerms(pool);
  if (!latestTerms.version) {
    return res.status(400).json({ error: 'Sales plan terms are not available yet. Please try again later.' });
  }
  if (termsVersion !== latestTerms.version) {
    return res.status(400).json({ error: 'Please review and accept the latest terms and conditions.' });
  }

  const planExists = await pool.query(
    'SELECT 1 FROM company_access_plans WHERE plan_key = $1',
    [planKey]
  );
  if (planExists.rowCount === 0) {
    return res.status(400).json({ error: 'Selected plan is not available.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const user = await createUser(client, { email, password, role: 'company' });
    await client.query(
      `INSERT INTO company_profiles (
         user_id,
         company_name,
         phone,
         website,
         city,
         postcode,
         plan,
         plan_terms_version,
         plan_terms_accepted_at,
         plan_purchased_at,
         plan_expires_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
         CASE WHEN $7 = 'free' THEN NULL ELSE CURRENT_TIMESTAMP + INTERVAL '1 month' END
       )`,
      [user.id, companyName, phone || null, website || null, city || null, postcode || null, planKey, termsVersion]
    );
    await client.query('COMMIT');
    sendAuthResponse(res, 201, user);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

router.post('/login', validate(credentialsSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (result.rowCount === 0 || result.rows[0].status !== 'active') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  sendAuthResponse(res, 200, user);
}));

router.post('/logout', (req, res) => {
  clearAuthSessionCookie(res);
  res.json({ ok: true });
});

router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.validated.body;

  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Password reset email is not configured yet. Please try again later.' });
  }

  const result = await pool.query(
    `SELECT id, email, status
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );

  if (result.rowCount > 0 && result.rows[0].status === 'active') {
    const user = result.rows[0];
    const { resetUrl } = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });
  }

  res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
}));

router.get('/reset-password/:token', asyncHandler(async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Reset token is required.' });
  }

  const resetToken = await findValidResetToken(token);
  if (!resetToken || resetToken.status !== 'active') {
    return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired.' });
  }

  res.json({ valid: true, email: resetToken.email });
}));

router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.validated.body;
  const resetToken = await findValidResetToken(token);

  if (!resetToken || resetToken.status !== 'active') {
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users
       SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [resetToken.user_id, passwordHash]
    );
    await markResetTokenUsed(resetToken.id, client);
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND used_at IS NULL`,
      [resetToken.user_id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.json({ message: 'Your password has been updated. You can sign in now.' });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  let profile = null;

  if (req.user.role === 'worker') {
    profile = (await pool.query('SELECT * FROM worker_profiles WHERE user_id = $1', [req.user.id])).rows[0] || null;
  }

  if (req.user.role === 'company') {
    profile = (await pool.query('SELECT * FROM company_profiles WHERE user_id = $1', [req.user.id])).rows[0] || null;
  }

  res.json({ user: req.user, profile });
}));

module.exports = router;
