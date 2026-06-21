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

const router = express.Router();

const credentialsSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const workerRegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    trades: z.array(z.string()).default([]),
    city: z.string().optional(),
    postcode: z.string().optional(),
  }),
});

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
  const { email, password, fullName, phone, trades, city, postcode } = req.validated.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const user = await createUser(client, { email, password, role: 'worker' });
    await client.query(
      `INSERT INTO worker_profiles (user_id, full_name, phone, trades, city, postcode)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, fullName, phone || null, trades, city || null, postcode || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ user, token: signToken(user) });
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
         plan_terms_accepted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [user.id, companyName, phone || null, website || null, city || null, postcode || null, planKey, termsVersion]
    );
    await client.query('COMMIT');
    res.status(201).json({ user, token: signToken(user) });
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

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
  });
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
