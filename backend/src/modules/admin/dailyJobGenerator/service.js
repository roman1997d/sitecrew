const bcrypt = require('bcryptjs');
const pool = require('../../../db/pool');
const {
  TRADE_CATALOG,
  dayJobsTargetForDayNumber,
  londonDateParts,
  buildDailyJobPlan,
  slugify,
  randomInt,
} = require('./catalog');

const GENERATOR_EMAIL_DOMAIN = 'dailyjobs.fpd';
const GENERATOR_PASSWORD = process.env.DAILY_JOB_GENERATOR_PASSWORD || 'DailyJobs2026!';
const JOB_RETENTION_DAYS = 7;

let schemaReady = false;
let passwordHashPromise = null;

async function ensureSchema() {
  if (schemaReady) return;

  await pool.query(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_jobs_auto_generated_created
      ON jobs(auto_generated, created_at)
      WHERE auto_generated = TRUE
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_job_generator_state (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_run_date DATE,
      last_created_count INTEGER NOT NULL DEFAULT 0,
      last_deleted_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO daily_job_generator_state (id, enabled)
    VALUES (1, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);

  for (const entry of TRADE_CATALOG) {
    await pool.query(
      `INSERT INTO construction_trades (name, category)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [entry.trade, entry.category]
    );
  }

  schemaReady = true;
}

async function getPasswordHash() {
  if (!passwordHashPromise) {
    passwordHashPromise = bcrypt.hash(GENERATOR_PASSWORD, 10);
  }
  return passwordHashPromise;
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const raw = String(value);
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

async function getState() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT enabled, last_run_date, last_created_count, last_deleted_count, last_error, updated_at
     FROM daily_job_generator_state
     WHERE id = 1`
  );
  const row = result.rows[0];
  if (!row) {
    return {
      enabled: true,
      last_run_date: null,
      last_created_count: 0,
      last_deleted_count: 0,
      last_error: null,
      updated_at: null,
    };
  }
  return {
    ...row,
    last_run_date: toIsoDate(row.last_run_date),
  };
}

async function setEnabled(enabled) {
  await ensureSchema();
  await pool.query(
    `UPDATE daily_job_generator_state
     SET enabled = $1, updated_at = NOW()
     WHERE id = 1`,
    [Boolean(enabled)]
  );
  return getStatus();
}

async function updateState({
  lastRunDate = null,
  createdCount = 0,
  deletedCount = 0,
  error = null,
} = {}) {
  await pool.query(
    `UPDATE daily_job_generator_state
     SET last_run_date = COALESCE($1::date, last_run_date),
         last_created_count = $2,
         last_deleted_count = $3,
         last_error = $4,
         updated_at = NOW()
     WHERE id = 1`,
    [lastRunDate, createdCount, deletedCount, error]
  );
}

async function countOpenGeneratedJobs() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM jobs
     WHERE auto_generated = TRUE AND status = 'open'`
  );
  return result.rows[0]?.total || 0;
}

async function countGeneratorCompanies() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM users
     WHERE role = 'company' AND email ILIKE $1`,
    [`%@${GENERATOR_EMAIL_DOMAIN}`]
  );
  return result.rows[0]?.total || 0;
}

async function getStatus() {
  const state = await getState();
  const today = londonDateParts();
  const targetToday = dayJobsTargetForDayNumber(today.dayNumber);
  const [openJobs, companies] = await Promise.all([
    countOpenGeneratedJobs(),
    countGeneratorCompanies(),
  ]);

  return {
    enabled: Boolean(state.enabled),
    today: today.isoDate,
    dayNumber: today.dayNumber,
    targetToday,
    parity: today.dayNumber % 2 === 0 ? 'even' : 'odd',
    lastRunDate: state.last_run_date,
    lastCreatedCount: state.last_created_count || 0,
    lastDeletedCount: state.last_deleted_count || 0,
    lastError: state.last_error || null,
    updatedAt: state.updated_at,
    openGeneratedJobs: openJobs,
    generatorCompanies: companies,
    retentionDays: JOB_RETENTION_DAYS,
    alreadyRanToday: Boolean(state.last_run_date && state.last_run_date === today.isoDate),
    catalogTrades: TRADE_CATALOG.length,
  };
}

async function deleteExpiredGeneratedJobs(client = pool) {
  const deletedJobs = await client.query(
    `DELETE FROM jobs
     WHERE auto_generated = TRUE
       AND created_at < NOW() - ($1::text || ' days')::interval
     RETURNING id, company_id`,
    [String(JOB_RETENTION_DAYS)]
  );

  const companyIds = [...new Set(deletedJobs.rows.map((row) => row.company_id).filter(Boolean))];
  let deletedCompanies = 0;

  if (companyIds.length) {
    const orphaned = await client.query(
      `SELECT u.id
       FROM users u
       WHERE u.id = ANY($1::int[])
         AND u.email ILIKE $2
         AND NOT EXISTS (
           SELECT 1 FROM jobs j WHERE j.company_id = u.id
         )`,
      [companyIds, `%@${GENERATOR_EMAIL_DOMAIN}`]
    );

    if (orphaned.rows.length) {
      const ids = orphaned.rows.map((row) => row.id);
      await client.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids]);
      deletedCompanies = ids.length;
    }
  }

  return {
    deletedJobs: deletedJobs.rowCount || 0,
    deletedCompanies,
  };
}

async function emailExists(client, email) {
  const result = await client.query(
    'SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [email]
  );
  return result.rowCount > 0;
}

async function buildUniqueCompanyEmail(client, companyName) {
  const base = slugify(companyName).replace(/-/g, '').slice(0, 28) || 'company';
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = attempt === 0 ? '' : String(randomInt(10, 9999));
    const email = `jobs.${base}${suffix}@${GENERATOR_EMAIL_DOMAIN}`;
    if (!(await emailExists(client, email))) {
      return email;
    }
  }
  return `jobs.${base}${Date.now()}@${GENERATOR_EMAIL_DOMAIN}`;
}

async function createCompanyWithJobs(client, passwordHash, companyPlan) {
  const email = await buildUniqueCompanyEmail(client, companyPlan.companyName);
  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'company', 'active')
     RETURNING id`,
    [email, passwordHash]
  );
  const companyId = userResult.rows[0].id;
  const websiteSlug = slugify(companyPlan.companyName);

  await client.query(
    `INSERT INTO company_profiles (
       user_id, company_name, phone, description, website, head_office,
       business_type, trades, city, postcode, verification_status, plan
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'free')`,
    [
      companyId,
      companyPlan.companyName,
      `+44 1${randomInt(100, 999)} ${randomInt(100000, 999999)}`,
      `${companyPlan.companyName} is hiring across ${companyPlan.city} and the wider ${companyPlan.region} region.`,
      `https://www.${websiteSlug}.co.uk`,
      `${companyPlan.city} Office`,
      'Main Contractor',
      companyPlan.trades,
      companyPlan.city,
      companyPlan.postcode,
    ]
  );

  const createdJobs = [];
  for (const job of companyPlan.jobs) {
    const result = await client.query(
      `INSERT INTO jobs (
         company_id, created_by_user_id, title, description, city, postcode,
         trade_required, experience_required, start_date, duration, rate,
         workers_required, status, moderation_status, auto_generated
       )
       VALUES (
         $1, $1, $2, $3, $4, $5, $6, $7,
         CURRENT_DATE + $8::int, $9, $10, $11,
         'open', 'visible', TRUE
       )
       RETURNING id, title, trade_required, city, rate`,
      [
        companyId,
        job.title,
        job.description,
        job.city,
        job.postcode,
        job.trade,
        job.experienceRequired,
        job.startOffsetDays,
        job.duration,
        job.rate,
        job.workersRequired,
      ]
    );
    createdJobs.push(result.rows[0]);
  }

  return {
    companyId,
    email,
    companyName: companyPlan.companyName,
    jobs: createdJobs,
  };
}

async function runDailyJobGenerator({
  force = false,
  ignoreEnabled = false,
} = {}) {
  await ensureSchema();
  const state = await getState();
  const today = londonDateParts();
  const targetCount = dayJobsTargetForDayNumber(today.dayNumber);

  if (!ignoreEnabled && !state.enabled) {
    return {
      skipped: true,
      reason: 'disabled',
      status: await getStatus(),
    };
  }

  const alreadyRan = Boolean(state.last_run_date && state.last_run_date === today.isoDate);

  if (alreadyRan && !force) {
    const cleanup = await deleteExpiredGeneratedJobs();
    if (cleanup.deletedJobs > 0) {
      await updateState({
        lastRunDate: today.isoDate,
        createdCount: state.last_created_count || 0,
        deletedCount: cleanup.deletedJobs,
        error: null,
      });
    }
    return {
      skipped: true,
      reason: 'already_ran_today',
      deletedJobs: cleanup.deletedJobs,
      deletedCompanies: cleanup.deletedCompanies,
      status: await getStatus(),
    };
  }

  const passwordHash = await getPasswordHash();
  const plan = buildDailyJobPlan(targetCount);
  const client = await pool.connect();
  let createdCompanies = [];
  let cleanup = { deletedJobs: 0, deletedCompanies: 0 };

  try {
    await client.query('BEGIN');
    cleanup = await deleteExpiredGeneratedJobs(client);

    for (const companyPlan of plan.companies) {
      createdCompanies.push(await createCompanyWithJobs(client, passwordHash, companyPlan));
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    await updateState({
      lastRunDate: null,
      createdCount: 0,
      deletedCount: cleanup.deletedJobs || 0,
      error: error.message || 'Daily job generation failed.',
    });
    throw error;
  } finally {
    client.release();
  }

  const createdJobs = createdCompanies.reduce((sum, company) => sum + company.jobs.length, 0);

  await updateState({
    lastRunDate: today.isoDate,
    createdCount: createdJobs,
    deletedCount: cleanup.deletedJobs,
    error: null,
  });

  return {
    skipped: false,
    date: today.isoDate,
    parity: today.dayNumber % 2 === 0 ? 'even' : 'odd',
    targetCount,
    createdJobs,
    createdCompanies: createdCompanies.length,
    deletedJobs: cleanup.deletedJobs,
    deletedCompanies: cleanup.deletedCompanies,
    companies: createdCompanies.map((company) => ({
      id: company.companyId,
      name: company.companyName,
      email: company.email,
      jobs: company.jobs.map((job) => ({
        id: job.id,
        title: job.title,
        trade: job.trade_required,
        city: job.city,
        rate: job.rate,
      })),
    })),
    status: await getStatus(),
  };
}

module.exports = {
  ensureSchema,
  getStatus,
  setEnabled,
  runDailyJobGenerator,
  deleteExpiredGeneratedJobs,
  GENERATOR_EMAIL_DOMAIN,
  JOB_RETENTION_DAYS,
};
