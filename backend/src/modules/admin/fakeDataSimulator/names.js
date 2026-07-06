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
  pick,
  pickIndex,
  slugify,
  randomInt,
};
