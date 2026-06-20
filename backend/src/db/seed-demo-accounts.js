const bcrypt = require('bcryptjs');
const pool = require('./pool');

const DEMO_PASSWORD = 'password123';

const trades = [
  'Carpentry',
  'Drylining',
  'Electrical',
  'Plumbing',
  'Painting',
  'Bricklaying',
  'Roofing',
  'Groundworks',
  'Plastering',
  'Site Labour',
];

const cities = [
  ['Manchester', 'M1'],
  ['Liverpool', 'L1'],
  ['Leeds', 'LS1'],
  ['Birmingham', 'B1'],
  ['London', 'E1'],
  ['Bristol', 'BS1'],
  ['Glasgow', 'G1'],
  ['Cardiff', 'CF10'],
  ['Sheffield', 'S1'],
  ['Newcastle', 'NE1'],
];

const companyNames = [
  'Alderstone Construction',
  'Bluebrick Developments',
  'Cedarline Contractors',
  'Delta Site Works',
  'Evergreen Interiors',
  'ForgeBuild Group',
  'Granite & Beam Ltd',
  'Harbour Fit-Out',
  'IronGate Construction',
  'Junction Civil Works',
  'Keystone Projects',
  'Landmark Refurbishment',
  'MetroBuild Services',
  'Northstar Facades',
  'Oakfield Contractors',
  'Pioneer Site Solutions',
  'Quartz Property Works',
  'Riverside Developments',
  'Summit Build Partners',
  'Titan Drylining',
  'Union Trade Contractors',
  'Vector Construction',
  'Westline Projects',
  'Yorkshire Fit-Out',
  'Zenith Site Services',
];

const workerFirstNames = [
  'Adam',
  'Bogdan',
  'Carlos',
  'Daniel',
  'Elena',
  'Florin',
  'George',
  'Hanna',
  'Ivan',
  'Jakub',
  'Kamil',
  'Luca',
  'Marek',
  'Nikolai',
  'Owen',
  'Piotr',
  'Radu',
  'Sofia',
  'Tomasz',
  'Victor',
  'Wiktor',
  'Yuri',
  'Zara',
  'Mila',
  'Alex',
];

const workerLastNames = [
  'Andrews',
  'Balan',
  'Carter',
  'Dobre',
  'Evans',
  'Filip',
  'Green',
  'Hughes',
  'Ivanov',
  'Kowalski',
  'Lewandowski',
  'Marin',
  'Nowak',
  'Petrov',
  'Popescu',
  'Rossi',
  'Smith',
  'Taylor',
  'Vasilev',
  'Walker',
];

function pick(list, index) {
  return list[index % list.length];
}

async function upsertUser(client, { email, role }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const result = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       status = EXCLUDED.status,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [email, passwordHash, role]
  );
  return result.rows[0].id;
}

async function seedCompanies(client) {
  const ids = [];

  for (let index = 0; index < companyNames.length; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const [city, postcode] = pick(cities, index);
    const companyId = await upsertUser(client, {
      email: `demo-company-${number}@sitecrew.test`,
      role: 'company',
    });

    await client.query(
      `INSERT INTO company_profiles (
        user_id,
        company_name,
        phone,
        logo,
        description,
        website,
        head_office,
        business_type,
        trades,
        city,
        postcode,
        verification_status,
        plan
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        phone = EXCLUDED.phone,
        logo = EXCLUDED.logo,
        description = EXCLUDED.description,
        website = EXCLUDED.website,
        head_office = EXCLUDED.head_office,
        business_type = EXCLUDED.business_type,
        trades = EXCLUDED.trades,
        city = EXCLUDED.city,
        postcode = EXCLUDED.postcode,
        verification_status = EXCLUDED.verification_status,
        plan = EXCLUDED.plan,
        updated_at = CURRENT_TIMESTAMP`,
      [
        companyId,
        `${companyNames[index]} Demo`,
        `+44 7000 10${number}`,
        null,
        `${companyNames[index]} is a demo construction company for SiteCrew testing.`,
        `https://demo-company-${number}.sitecrew.test`,
        `${city} Head Office`,
        pick(['Main Contractor', 'Subcontractor', 'Developer', 'Facilities Management'], index),
        [pick(trades, index), pick(trades, index + 4), pick(trades, index + 8)],
        city,
        postcode,
        index % 5 === 0 ? 'pending' : 'approved',
        index % 3 === 0 ? 'pro' : 'free',
      ]
    );

    ids.push(companyId);
  }

  return ids;
}

async function seedWorkers(client) {
  const ids = [];

  for (let index = 0; index < 50; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const [city, postcode] = pick(cities, index);
    const primaryTrade = pick(trades, index);
    const secondaryTrade = pick(trades, index + 3);
    const fullName = `${pick(workerFirstNames, index)} ${pick(workerLastNames, index)}`;
    const workerId = await upsertUser(client, {
      email: `demo-worker-${number}@sitecrew.test`,
      role: 'worker',
    });

    await client.query(
      `INSERT INTO worker_profiles (
        user_id,
        full_name,
        phone,
        profile_photo,
        trades,
        experience,
        certificates,
        city,
        postcode,
        working_radius,
        availability_status,
        expected_rate,
        bio,
        work_locations,
        years_experience,
        last_companies,
        qualifications,
        has_uk_work_permit,
        is_english_native,
        native_language,
        english_level,
        has_car,
        can_use_car_for_work,
        data_consent,
        language_preference
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        profile_photo = EXCLUDED.profile_photo,
        trades = EXCLUDED.trades,
        experience = EXCLUDED.experience,
        certificates = EXCLUDED.certificates,
        city = EXCLUDED.city,
        postcode = EXCLUDED.postcode,
        working_radius = EXCLUDED.working_radius,
        availability_status = EXCLUDED.availability_status,
        expected_rate = EXCLUDED.expected_rate,
        bio = EXCLUDED.bio,
        work_locations = EXCLUDED.work_locations,
        years_experience = EXCLUDED.years_experience,
        last_companies = EXCLUDED.last_companies,
        qualifications = EXCLUDED.qualifications,
        has_uk_work_permit = EXCLUDED.has_uk_work_permit,
        is_english_native = EXCLUDED.is_english_native,
        native_language = EXCLUDED.native_language,
        english_level = EXCLUDED.english_level,
        has_car = EXCLUDED.has_car,
        can_use_car_for_work = EXCLUDED.can_use_car_for_work,
        data_consent = EXCLUDED.data_consent,
        language_preference = EXCLUDED.language_preference,
        updated_at = CURRENT_TIMESTAMP`,
      [
        workerId,
        `${fullName} Demo`,
        `+44 7700 20${number}`,
        null,
        [primaryTrade, secondaryTrade],
        `${2 + (index % 12)} years`,
        [pick(['CSCS Green', 'CSCS Gold', 'First Aid', 'IPAF', 'NVQ Level 2'], index)],
        city,
        postcode,
        `${15 + (index % 5) * 5} miles`,
        pick(['Available Now', 'Available Soon', 'Busy'], index),
        `GBP ${18 + (index % 18)}/hour`,
        `Demo worker profile for ${primaryTrade.toLowerCase()} and site work testing.`,
        [city, pick(cities, index + 1)[0], pick(cities, index + 2)[0]],
        2 + (index % 12),
        [pick(companyNames, index), pick(companyNames, index + 4), pick(companyNames, index + 8)],
        [pick(['CSCS', 'First Aid', 'IPAF', 'NVQ', 'ECS'], index)],
        true,
        index % 4 === 0,
        pick(['English', 'Romanian', 'Polish', 'Russian', 'Bulgarian'], index),
        pick(['Basic', 'Intermediate', 'Good', 'Fluent'], index),
        index % 2 === 0,
        index % 3 !== 0,
        true,
        pick(['en', 'ro', 'ru', 'pl', 'bg'], index),
      ]
    );

    ids.push(workerId);
  }

  return ids;
}

async function seedDemoAccounts() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const companyIds = await seedCompanies(client);
    const workerIds = await seedWorkers(client);
    await client.query('COMMIT');

    console.log(`Seeded ${companyIds.length} demo companies.`);
    console.log(`Seeded ${workerIds.length} demo worker users.`);
    console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoAccounts().catch((error) => {
  console.error(error);
  process.exit(1);
});
