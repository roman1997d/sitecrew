const bcrypt = require('bcryptjs');
const pool = require('../../../db/pool');
const {
  UK_CITIES,
  FIRST_NAMES,
  LAST_NAMES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  TRADES,
  EMAIL_PROVIDERS,
  JOB_TITLES,
  JOB_DESCRIPTIONS,
  pick,
  pickIndex,
  slugify,
  randomInt,
} = require('./names');

const FAKE_PASSWORD = process.env.FAKE_SIMULATOR_PASSWORD || 'SimFpd2026!';
const JOBS_PER_COMPANY = 3;
const FAKE_EMAIL_SQL = `%@%.fpd`;

async function hashPassword() {
  return bcrypt.hash(FAKE_PASSWORD, 10);
}

async function emailExists(client, email) {
  const result = await client.query('SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
  return result.rowCount > 0;
}

async function buildUniqueEmail(client, localPart, domain) {
  let attempt = 0;
  while (attempt < 20) {
    const suffix = attempt === 0 ? '' : String(randomInt(10, 9999));
    const email = `${localPart}${suffix}@${domain}`;
    if (!(await emailExists(client, email))) {
      return email;
    }
    attempt += 1;
  }
  return `${localPart}${Date.now()}@${domain}`;
}

function buildWorkerName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function buildCompanyName() {
  return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)} Ltd`;
}

function buildWorkerEmailLocal(fullName) {
  const [first, last] = fullName.toLowerCase().split(' ');
  const patterns = [
    `${first}.${last}`,
    `${first}${last}`,
    `${first[0]}${last}`,
    `${first}.${last[0]}`,
  ];
  return pick(patterns).replace(/[^a-z0-9.]/g, '').slice(0, 48);
}

function buildCompanyEmailParts(companyName) {
  const domain = `${slugify(companyName)}.fpd`;
  const local = pick(['hiring', 'jobs', 'recruitment', 'office', 'accounts', 'enquiries']);
  return { local, domain };
}

function pickUniqueFrom(list, count) {
  const pool = [...list];
  const chosen = [];
  while (chosen.length < count && pool.length) {
    const index = randomInt(0, pool.length - 1);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}

function buildJobBundle(city, trade, jobIndex) {
  const titleTemplate = pickIndex(JOB_TITLES, jobIndex);
  const descriptionTemplate = pickIndex(JOB_DESCRIPTIONS, jobIndex);
  const title = titleTemplate.replace('{trade}', trade);
  const description = descriptionTemplate
    .replace('{trade}', trade.toLowerCase())
    .replace('{city}', city);
  const dayRate = randomInt(160, 320);

  return {
    title,
    description,
    trade,
    rate: `£${dayRate}/day`,
    duration: pick(['2-4 weeks', '4-8 weeks', '3 months', '6+ months', 'Ongoing']),
    experienceRequired: pick(['1+ years', '2+ years', '3+ years', 'CSCS required']),
    workersRequired: randomInt(1, 4),
  };
}

async function createWorker(client, passwordHash, index) {
  const fullName = buildWorkerName();
  const [city, postcode] = pickIndex(UK_CITIES, index);
  const primaryTrade = pick(TRADES);
  const secondaryTrade = pick(TRADES.filter((trade) => trade !== primaryTrade));
  const provider = `${pick(EMAIL_PROVIDERS)}.fpd`;
  const email = await buildUniqueEmail(client, buildWorkerEmailLocal(fullName), provider);

  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'worker', 'active')
     RETURNING id, email`,
    [email, passwordHash]
  );
  const userId = userResult.rows[0].id;

  await client.query(
    `INSERT INTO worker_profiles (
       user_id, full_name, phone, trades, trade_interests, city, postcode,
       working_radius, availability_status, expected_rate, bio, years_experience,
       verification_status, has_uk_work_permit, data_consent
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, TRUE)`,
    [
      userId,
      fullName,
      `+44 7${randomInt(100, 999)} ${randomInt(100000, 999999)}`,
      [primaryTrade, secondaryTrade],
      [primaryTrade, secondaryTrade],
      city,
      postcode,
      `${randomInt(10, 40)} miles`,
      pick(['Available Now', 'Available Soon', 'Open to offers']),
      `£${randomInt(18, 32)}/hour`,
      `${primaryTrade} with site experience across ${city} and surrounding areas.`,
      randomInt(2, 15),
      pick(['approved', 'approved', 'pending']),
    ]
  );

  return { id: userId, email, fullName, city, trades: [primaryTrade, secondaryTrade] };
}

async function createCompanyWithJobs(client, passwordHash, index) {
  const companyName = buildCompanyName();
  const [city, postcode] = pickIndex(UK_CITIES, index + 3);
  const companyTrades = pickUniqueFrom(TRADES, JOBS_PER_COMPANY);
  const { local, domain } = buildCompanyEmailParts(companyName);
  const email = await buildUniqueEmail(client, local, domain);

  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'company', 'active')
     RETURNING id, email`,
    [email, passwordHash]
  );
  const userId = userResult.rows[0].id;
  const websiteSlug = slugify(companyName);

  await client.query(
    `INSERT INTO company_profiles (
       user_id, company_name, phone, description, website, head_office,
       business_type, trades, city, postcode, verification_status, plan
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'free')`,
    [
      userId,
      companyName,
      `+44 1${randomInt(100, 999)} ${randomInt(100000, 999999)}`,
      `${companyName} delivers reliable construction and fit-out services across ${city} and the wider UK.`,
      `https://www.${websiteSlug}.co.uk`,
      `${city} Head Office`,
      pick(['Main Contractor', 'Subcontractor', 'Developer', 'Specialist Contractor']),
      companyTrades,
      city,
      postcode,
    ]
  );

  const jobs = [];
  const usedTitles = new Set();
  for (let jobIndex = 0; jobIndex < JOBS_PER_COMPANY; jobIndex += 1) {
    const trade = companyTrades[jobIndex] || pickIndex(TRADES, jobIndex);
    let job = buildJobBundle(city, trade, jobIndex);
    let suffix = 0;
    while (usedTitles.has(job.title)) {
      suffix += 1;
      job = {
        ...job,
        title: `${job.title} (${city} ${suffix})`,
      };
    }
    usedTitles.add(job.title);
    const startOffset = randomInt(3, 21);
    const jobResult = await client.query(
      `INSERT INTO jobs (
         company_id, created_by_user_id, title, description, city, postcode,
         trade_required, experience_required, start_date, duration, rate,
         workers_required, status, moderation_status
       )
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + $8::int, $9, $10, $11, 'open', 'visible')
       RETURNING id, title`,
      [
        userId,
        job.title,
        job.description,
        city,
        postcode,
        job.trade,
        job.experienceRequired,
        startOffset,
        job.duration,
        job.rate,
        job.workersRequired,
      ]
    );
    jobs.push({ id: jobResult.rows[0].id, title: jobResult.rows[0].title });
  }

  return {
    id: userId,
    email,
    companyName,
    city,
    jobs,
  };
}

async function generateFakeWorkers(count) {
  const passwordHash = await hashPassword();
  const client = await pool.connect();
  const created = [];

  try {
    await client.query('BEGIN');
    for (let index = 0; index < count; index += 1) {
      created.push(await createWorker(client, passwordHash, index));
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    count: created.length,
    password: FAKE_PASSWORD,
    marker: 'All emails end with .fpd (e.g. name@gmail.fpd)',
    workers: created,
  };
}

async function generateFakeCompanies(count) {
  const passwordHash = await hashPassword();
  const client = await pool.connect();
  const created = [];

  try {
    await client.query('BEGIN');
    for (let index = 0; index < count; index += 1) {
      created.push(await createCompanyWithJobs(client, passwordHash, index));
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const jobCount = created.reduce((total, company) => total + company.jobs.length, 0);

  return {
    count: created.length,
    jobsCreated: jobCount,
    password: FAKE_PASSWORD,
    marker: 'All emails end with .fpd — search Users for ".fpd" to find simulator accounts',
    companies: created,
  };
}

async function getSimulatorStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE role = 'worker')::int AS workers,
       COUNT(*) FILTER (WHERE role = 'company')::int AS companies
     FROM users
     WHERE email ILIKE $1`,
    [FAKE_EMAIL_SQL]
  );

  const jobsResult = await pool.query(
    `SELECT COUNT(*)::int AS jobs
     FROM jobs j
     JOIN users u ON u.id = j.company_id
     WHERE u.email ILIKE $1`,
    [FAKE_EMAIL_SQL]
  );

  return {
    workers: result.rows[0]?.workers || 0,
    companies: result.rows[0]?.companies || 0,
    jobs: jobsResult.rows[0]?.jobs || 0,
    emailMarker: '*.fpd',
    passwordHint: FAKE_PASSWORD,
  };
}

async function purgeFakeAccounts() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const preview = await client.query(
      `SELECT id, email, role FROM users WHERE email ILIKE $1 ORDER BY id`,
      [FAKE_EMAIL_SQL]
    );
    const deleted = await client.query(
      `DELETE FROM users WHERE email ILIKE $1 RETURNING id, email, role`,
      [FAKE_EMAIL_SQL]
    );
    await client.query('COMMIT');

    return {
      deleted: deleted.rowCount,
      accounts: deleted.rows,
      previewCount: preview.rowCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  FAKE_PASSWORD,
  JOBS_PER_COMPANY,
  generateFakeWorkers,
  generateFakeCompanies,
  getSimulatorStats,
  purgeFakeAccounts,
};
