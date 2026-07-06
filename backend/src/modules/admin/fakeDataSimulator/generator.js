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
  CERTIFICATES,
  QUALIFICATIONS,
  NATIVE_LANGUAGES,
  ENGLISH_LEVELS,
  LANGUAGE_PREFERENCES,
  LAST_COMPANIES,
  BIO_TEMPLATES,
  FEED_POST_CAPTIONS,
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

function buildWorkerProfileData(index, city, primaryTrade, secondaryTrade) {
  const yearsExperience = randomInt(2, 15);
  const isEnglishNative = index % 4 === 0;
  const nativeLanguage = isEnglishNative ? 'English' : pick(NATIVE_LANGUAGES.filter((lang) => lang !== 'English'));
  const englishLevel = isEnglishNative ? 'Native' : pick(ENGLISH_LEVELS.filter((level) => level !== 'Native'));
  const hasCar = index % 2 === 0;
  const canUseCarForWork = hasCar && index % 3 !== 0;
  const hasHealthIssues = index % 17 === 0;
  const verificationStatus = pick(['approved', 'approved', 'approved', 'pending']);
  const qualificationBadgeColor = pick(['green', 'green', 'blue', 'gold']);
  const nearbyCities = pickUniqueFrom(
    UK_CITIES.map(([name]) => name).filter((name) => name !== city),
    2
  );

  const bioTemplate = pick(BIO_TEMPLATES);
  const bio = bioTemplate
    .replace('{trade}', primaryTrade.toLowerCase())
    .replace('{years}', String(yearsExperience))
    .replace('{city}', city);

  return {
    phone: `+44 7${randomInt(100, 999)} ${randomInt(100000, 999999)}`,
    trades: [primaryTrade, secondaryTrade],
    tradeInterests: [primaryTrade, secondaryTrade],
    experience: `${yearsExperience} years`,
    certificates: pickUniqueFrom(CERTIFICATES, randomInt(2, 4)),
    city,
    workingRadius: `${randomInt(10, 40)} miles`,
    availabilityStatus: pick(['Available Now', 'Available Soon', 'Open to offers']),
    expectedRate: `£${randomInt(18, 32)}/hour`,
    bio,
    workLocations: [city, ...nearbyCities],
    yearsExperience,
    lastCompanies: pickUniqueFrom(LAST_COMPANIES, 3),
    qualifications: pickUniqueFrom(QUALIFICATIONS, randomInt(2, 3)),
    hasUkWorkPermit: true,
    isEnglishNative,
    nativeLanguage,
    englishLevel,
    hasCar,
    canUseCarForWork,
    hasHealthIssues,
    healthIssuesDetails: hasHealthIssues ? 'Minor back strain — no restrictions on site duties.' : null,
    languagePreference: isEnglishNative ? 'en' : pick(LANGUAGE_PREFERENCES.filter((code) => code !== 'en')),
    verificationStatus,
    qualificationBadgeColor,
  };
}

function buildFeedPostCaption(city, trade) {
  return pick(FEED_POST_CAPTIONS)
    .replace('{city}', city)
    .replace('{trade}', trade.toLowerCase());
}

async function createWorkerFeedPosts(client, userId, city, trade) {
  const postTypes = pickUniqueFrom(['work_completed', 'progress', 'skills', 'certification'], 2);
  for (const postType of postTypes) {
    await client.query(
      `INSERT INTO feed_posts (
         author_id, created_by_user_id, post_type, caption, media_urls, tags, location, project_size, duration, moderation_status
       )
       VALUES ($1, $1, $2, $3, '{}', $4, $5, $6, $7, 'visible')`,
      [
        userId,
        postType,
        buildFeedPostCaption(city, trade),
        [trade.toLowerCase(), 'site-work'],
        city,
        pick(['Small', 'Medium', 'Large']),
        pick(['2 days', '1 week', '3 weeks', '6 weeks']),
      ]
    );
  }
}

async function createWorker(client, passwordHash, index) {
  const fullName = buildWorkerName();
  const [city, postcode] = pickIndex(UK_CITIES, index);
  const primaryTrade = pick(TRADES);
  const secondaryTrade = pick(TRADES.filter((trade) => trade !== primaryTrade));
  const provider = `${pick(EMAIL_PROVIDERS)}.fpd`;
  const email = await buildUniqueEmail(client, buildWorkerEmailLocal(fullName), provider);
  const profile = buildWorkerProfileData(index, city, primaryTrade, secondaryTrade);

  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'worker', 'active')
     RETURNING id, email`,
    [email, passwordHash]
  );
  const userId = userResult.rows[0].id;

  await client.query(
    `INSERT INTO worker_profiles (
       user_id, full_name, phone, profile_photo, trades, trade_interests, experience, certificates,
       city, postcode, working_radius, availability_status, expected_rate, bio, work_locations,
       years_experience, last_companies, qualifications, has_uk_work_permit, is_english_native,
       native_language, english_level, has_car, can_use_car_for_work, has_health_issues,
       health_issues_details, data_consent, language_preference, verification_status,
       qualification_badge_color
     )
     VALUES (
       $1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
       $18, $19, $20, $21, $22, $23, $24, $25, TRUE, $26, $27, $28
     )`,
    [
      userId,
      fullName,
      profile.phone,
      profile.trades,
      profile.tradeInterests,
      profile.experience,
      profile.certificates,
      profile.city,
      postcode,
      profile.workingRadius,
      profile.availabilityStatus,
      profile.expectedRate,
      profile.bio,
      profile.workLocations,
      profile.yearsExperience,
      profile.lastCompanies,
      profile.qualifications,
      profile.hasUkWorkPermit,
      profile.isEnglishNative,
      profile.nativeLanguage,
      profile.englishLevel,
      profile.hasCar,
      profile.canUseCarForWork,
      profile.hasHealthIssues,
      profile.healthIssuesDetails,
      profile.languagePreference,
      profile.verificationStatus,
      profile.qualificationBadgeColor,
    ]
  );

  await createWorkerFeedPosts(client, userId, city, primaryTrade);

  return { id: userId, email, fullName, city, trades: profile.trades };
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
