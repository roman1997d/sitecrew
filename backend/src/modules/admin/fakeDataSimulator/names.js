const UK_CITIES = [
  ['London', 'E1 6AN'],
  ['Manchester', 'M1 1AE'],
  ['Birmingham', 'B1 1BB'],
  ['Leeds', 'LS1 4DY'],
  ['Glasgow', 'G1 1XQ'],
  ['Liverpool', 'L1 8JQ'],
  ['Bristol', 'BS1 4DJ'],
  ['Sheffield', 'S1 2HH'],
  ['Newcastle', 'NE1 7RU'],
  ['Nottingham', 'NG1 5FS'],
  ['Cardiff', 'CF10 1EP'],
  ['Edinburgh', 'EH1 1YZ'],
  ['Leicester', 'LE1 5WW'],
  ['Coventry', 'CV1 2WT'],
  ['Bradford', 'BD1 1HX'],
];

const FIRST_NAMES = [
  'James', 'Oliver', 'George', 'Harry', 'Jack', 'Charlie', 'Thomas', 'William', 'Alfie', 'Jacob',
  'Emily', 'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Isabella', 'Sophia', 'Grace', 'Lily',
  'Daniel', 'Matei', 'Andrei', 'Piotr', 'Jakub', 'Ivan', 'Marek', 'Stefan', 'Alexandru', 'Viktor',
  'Elena', 'Maria', 'Ana', 'Ioana', 'Katarzyna', 'Agnieszka', 'Natalia', 'Sofia', 'Yana', 'Irina',
];

const LAST_NAMES = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright',
  'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke',
  'Popescu', 'Ionescu', 'Stan', 'Marin', 'Dumitru', 'Kowalski', 'Nowak', 'Wojcik', 'Kowalczyk', 'Lewandowski',
  'Petrov', 'Ivanov', 'Vasilev', 'Georgiev', 'Nikolov', 'Horvat', 'Novak', 'Kovacs', 'Szabo', 'Toth',
];

const COMPANY_PREFIXES = [
  'North', 'South', 'East', 'West', 'Metro', 'Summit', 'Harbour', 'Oak', 'Stone', 'Iron',
  'Cedar', 'Riverside', 'Union', 'Pioneer', 'Keystone', 'Granite', 'Atlas', 'Beacon', 'Crown', 'Delta',
];

const COMPANY_SUFFIXES = [
  'Construction', 'Build Group', 'Contractors', 'Site Services', 'Developments', 'Projects',
  'Fit-Out', 'Civil Works', 'Refurbishment', 'Trade Solutions',
];

const TRADES = [
  'Electrician', 'Plumber', 'Carpenter', 'Bricklayer', 'Dryliner', 'Plasterer', 'Labourer',
  'Painter', 'Roofer', 'Groundworker', 'Steel Fixer', 'Scaffolder', 'Tiler', 'Joiner',
];

const EMAIL_PROVIDERS = ['gmail', 'outlook', 'hotmail', 'yahoo', 'icloud', 'live'];

const JOB_TITLES = [
  '{trade} - Commercial Project',
  'Experienced {trade} Required',
  '{trade} - Immediate Start',
  'Site {trade} - Long Term',
  '{trade} - Residential Refurb',
  'CSCS {trade} - Day Rate',
];

const JOB_DESCRIPTIONS = [
  'Busy site in {city}. CSCS card required. Tools and PPE provided on site. Rate negotiable for the right candidate.',
  'Established main contractor seeking reliable {trade} for ongoing work across Greater {city}. References preferred.',
  'Fit-out project starting next week. Must have previous site experience and right to work in the UK.',
  'Residential and commercial mix. Good team, consistent hours, paid weekly through SiteCrew.',
];

const CERTIFICATES = [
  'CSCS Green', 'CSCS Blue', 'CSCS Gold', 'CSCS Black', 'First Aid at Work', 'IPAF', 'PASMA',
  'ECS Gold Card', 'NVQ Level 2', 'NVQ Level 3', 'Asbestos Awareness', 'Manual Handling',
];

const QUALIFICATIONS = ['CSCS', 'ECS', 'NVQ Level 2', 'NVQ Level 3', 'First Aid', 'IPAF', 'City & Guilds'];

const NATIVE_LANGUAGES = ['English', 'Romanian', 'Polish', 'Bulgarian', 'Lithuanian', 'Portuguese', 'Spanish', 'Russian'];

const ENGLISH_LEVELS = ['Basic', 'Conversational', 'Good', 'Fluent', 'Native'];

const LANGUAGE_PREFERENCES = ['en', 'ro', 'pl', 'bg', 'lt', 'pt', 'es', 'ru'];

const LAST_COMPANIES = [
  'Alderstone Construction', 'Bluebrick Developments', 'Cedarline Contractors', 'Delta Site Works',
  'ForgeBuild Group', 'Harbour Fit-Out', 'IronGate Construction', 'Keystone Projects',
  'MetroBuild Services', 'Northstar Facades', 'Oakfield Contractors', 'Pioneer Site Solutions',
  'Riverside Developments', 'Summit Build Partners', 'Union Trade Contractors', 'Vector Construction',
];

const BIO_TEMPLATES = [
  '{trade} with {years} years on commercial and residential sites across {city}. Reliable, CSCS certified, and happy to travel within my radius.',
  'Experienced {trade} based in {city}. Strong references from main contractors and fit-out specialists. Available for day rate or long-term contracts.',
  'Site-ready {trade} covering {city} and surrounding areas. Punctual, safety-focused, and comfortable working in busy live environments.',
];

const FEED_POST_CAPTIONS = [
  'Finished first fix on a {city} office refurbishment — clean containment and testing signed off.',
  'Completed snagging and handover on a residential block in {city}. Client signed off with no punch list.',
  'Week on site as {trade}: metal stud partitions, boarding, and fire stopping to spec.',
  'Certification day complete — refreshed CSCS and updated site paperwork for upcoming projects.',
  'Progress update from a live commercial fit-out in {city}. Team hit programme milestones ahead of schedule.',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickIndex(list, index) {
  return list[index % list.length];
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40) || 'sitecrew';
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
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
};
