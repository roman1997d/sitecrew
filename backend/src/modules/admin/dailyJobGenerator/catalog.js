/**
 * Seed catalog for the daily job generator.
 * Day rates are CIS-style UK market bands (2026), aligned with Indeed/recruiter guides.
 * Regional multipliers adjust the mid-point within each trade band.
 */

const REGION_MULTIPLIERS = {
  London: 1.22,
  'South East': 1.1,
  'South West': 1.04,
  Midlands: 1.0,
  'North West': 0.96,
  Yorkshire: 0.95,
  'North East': 0.9,
  Scotland: 0.95,
  Wales: 0.9,
  'Northern Ireland': 0.88,
};

/** @type {{ name: string, region: string, postcode: string }[]} */
const UK_LOCATIONS = [
  { name: 'London', region: 'London', postcode: 'E1 6AN' },
  { name: 'Croydon', region: 'London', postcode: 'CR0 1XP' },
  { name: 'Romford', region: 'London', postcode: 'RM1 3RL' },
  { name: 'Reading', region: 'South East', postcode: 'RG1 1LZ' },
  { name: 'Brighton', region: 'South East', postcode: 'BN1 1GE' },
  { name: 'Oxford', region: 'South East', postcode: 'OX1 1BX' },
  { name: 'Southampton', region: 'South East', postcode: 'SO14 2AQ' },
  { name: 'Maidstone', region: 'South East', postcode: 'ME14 1JQ' },
  { name: 'Bristol', region: 'South West', postcode: 'BS1 4DJ' },
  { name: 'Plymouth', region: 'South West', postcode: 'PL1 1EA' },
  { name: 'Exeter', region: 'South West', postcode: 'EX1 1GE' },
  { name: 'Swindon', region: 'South West', postcode: 'SN1 1EE' },
  { name: 'Birmingham', region: 'Midlands', postcode: 'B1 1BB' },
  { name: 'Coventry', region: 'Midlands', postcode: 'CV1 2WT' },
  { name: 'Nottingham', region: 'Midlands', postcode: 'NG1 5FS' },
  { name: 'Leicester', region: 'Midlands', postcode: 'LE1 5WW' },
  { name: 'Derby', region: 'Midlands', postcode: 'DE1 2AY' },
  { name: 'Northampton', region: 'Midlands', postcode: 'NN1 1EE' },
  { name: 'Manchester', region: 'North West', postcode: 'M1 1AE' },
  { name: 'Liverpool', region: 'North West', postcode: 'L1 8JQ' },
  { name: 'Preston', region: 'North West', postcode: 'PR1 2AR' },
  { name: 'Chester', region: 'North West', postcode: 'CH1 2AR' },
  { name: 'Leeds', region: 'Yorkshire', postcode: 'LS1 4DY' },
  { name: 'Sheffield', region: 'Yorkshire', postcode: 'S1 2HH' },
  { name: 'Bradford', region: 'Yorkshire', postcode: 'BD1 1HX' },
  { name: 'Hull', region: 'Yorkshire', postcode: 'HU1 1AA' },
  { name: 'York', region: 'Yorkshire', postcode: 'YO1 7HH' },
  { name: 'Newcastle', region: 'North East', postcode: 'NE1 7RU' },
  { name: 'Sunderland', region: 'North East', postcode: 'SR1 1PN' },
  { name: 'Middlesbrough', region: 'North East', postcode: 'TS1 1JH' },
  { name: 'Durham', region: 'North East', postcode: 'DH1 3NJ' },
  { name: 'Edinburgh', region: 'Scotland', postcode: 'EH1 1YZ' },
  { name: 'Glasgow', region: 'Scotland', postcode: 'G1 1XQ' },
  { name: 'Aberdeen', region: 'Scotland', postcode: 'AB10 1AN' },
  { name: 'Dundee', region: 'Scotland', postcode: 'DD1 1DB' },
  { name: 'Inverness', region: 'Scotland', postcode: 'IV1 1PP' },
  { name: 'Cardiff', region: 'Wales', postcode: 'CF10 1EP' },
  { name: 'Swansea', region: 'Wales', postcode: 'SA1 3SN' },
  { name: 'Newport', region: 'Wales', postcode: 'NP20 1DA' },
  { name: 'Wrexham', region: 'Wales', postcode: 'LL11 1AR' },
  { name: 'Belfast', region: 'Northern Ireland', postcode: 'BT1 5GS' },
  { name: 'Derry', region: 'Northern Ireland', postcode: 'BT48 6AF' },
  { name: 'Lisburn', region: 'Northern Ireland', postcode: 'BT28 1AB' },
];

/**
 * Base CIS day-rate bands (GBP). Midpoint is adjusted by region multiplier,
 * then clamped to [min, max] so London does not invent unrealistic highs.
 *
 * priceWork is optional and only set for trades commonly measured on UK sites
 * (m², per thousand bricks, etc.). Labour, plant, gate, security, and management
 * stay day-rate only.
 */
const TRADE_CATALOG = [
  {
    trade: 'Bricklayer', category: 'Brickwork', dayMin: 180, dayMax: 280,
    experience: ['CSCS Blue', '2+ years', '3+ years'],
    priceWork: { unit: '/1000 bricks', min: 480, max: 700, chance: 0.45 },
  },
  { trade: 'Electrician', category: 'Electrical', dayMin: 200, dayMax: 320, experience: ['ECS Gold', '18th Edition', '3+ years'] },
  { trade: 'Plumber', category: 'Mechanical', dayMin: 190, dayMax: 300, experience: ['CSCS', 'Gas Safe preferred', '2+ years'] },
  {
    trade: 'Painter and Decorator', category: 'Finishing', dayMin: 160, dayMax: 220,
    experience: ['CSCS', '1+ years', '2+ years'],
    priceWork: { unit: '/m²', min: 4, max: 9, chance: 0.4 },
  },
  {
    trade: 'Dryliner', category: 'Interiors', dayMin: 180, dayMax: 280,
    experience: ['CSCS', '2+ years', 'Boarding experience'],
    priceWork: { unit: '/m²', min: 5, max: 11, chance: 0.55 },
  },
  {
    trade: 'Plasterer', category: 'Finishing', dayMin: 170, dayMax: 270,
    experience: ['CSCS', '2+ years', 'Solid & skim'],
    priceWork: { unit: '/m²', min: 4.5, max: 9, chance: 0.55 },
  },
  {
    trade: 'Taper and Jointer', category: 'Interiors', dayMin: 180, dayMax: 280,
    experience: ['CSCS', 'Tape & joint', '2+ years'],
    priceWork: { unit: '/m²', min: 4, max: 8.5, chance: 0.55 },
  },
  { trade: 'Carpenter', category: 'Carpentry', dayMin: 180, dayMax: 270, experience: ['CSCS', '2+ years', '1st/2nd fix'] },
  { trade: 'Joiner', category: 'Carpentry', dayMin: 180, dayMax: 270, experience: ['CSCS', '2+ years', 'Shop/site joinery'] },
  {
    trade: 'Roofer', category: 'Roofing', dayMin: 180, dayMax: 270,
    experience: ['CSCS', 'Working at height', '2+ years'],
    priceWork: { unit: '/m²', min: 22, max: 48, chance: 0.35 },
  },
  { trade: 'Groundworker', category: 'Groundworks', dayMin: 160, dayMax: 230, experience: ['CSCS', 'CPCS preferred', '1+ years'] },
  { trade: 'Scaffolder', category: 'Access', dayMin: 180, dayMax: 280, experience: ['CISRS', 'CSCS', '2+ years'] },
  {
    trade: 'Tiler', category: 'Finishing', dayMin: 170, dayMax: 250,
    experience: ['CSCS', '2+ years', 'Wall & floor'],
    priceWork: { unit: '/m²', min: 22, max: 45, chance: 0.5 },
  },
  { trade: 'General Labourer', category: 'Site Operations', dayMin: 120, dayMax: 180, experience: ['CSCS Green', 'Reliable', '1+ years'] },
  { trade: 'Skilled Labourer', category: 'Site Operations', dayMin: 140, dayMax: 190, experience: ['CSCS', 'Multi-trade help', '2+ years'] },
  { trade: 'Gate Man', category: 'Site Operations', dayMin: 130, dayMax: 175, experience: ['CSCS', 'Traffic awareness', 'Banksman preferred'] },
  { trade: 'Traffic Marshal', category: 'Site Operations', dayMin: 130, dayMax: 180, experience: ['CSCS', 'Banksman ticket', '1+ years'] },
  { trade: 'Site Security', category: 'Security', dayMin: 120, dayMax: 160, experience: ['SIA preferred', 'CSCS', 'Night shifts OK'] },
  { trade: 'Site Supervisor', category: 'Management', dayMin: 220, dayMax: 320, experience: ['SMSTS', 'CSCS Gold/Black', '3+ years'] },
  { trade: 'Site Manager', category: 'Management', dayMin: 260, dayMax: 400, experience: ['SMSTS', 'CSCS Black', '5+ years'] },
  { trade: 'Assistant Site Manager', category: 'Management', dayMin: 200, dayMax: 300, experience: ['SSSTS', 'CSCS', '2+ years'] },
  { trade: 'Steel Erector', category: 'Structural', dayMin: 200, dayMax: 300, experience: ['CSCS', 'Working at height', '2+ years'] },
  {
    trade: 'Ceiling Fixer', category: 'Interiors', dayMin: 170, dayMax: 250,
    experience: ['CSCS', 'MF ceilings', '2+ years'],
    priceWork: { unit: '/m²', min: 6, max: 13, chance: 0.45 },
  },
  {
    trade: 'Floor Layer', category: 'Flooring', dayMin: 170, dayMax: 240,
    experience: ['CSCS', 'Vinyl/LVT', '2+ years'],
    priceWork: { unit: '/m²', min: 8, max: 16, chance: 0.5 },
  },
  { trade: 'Gas Engineer', category: 'Mechanical', dayMin: 210, dayMax: 310, experience: ['Gas Safe', 'CSCS', '3+ years'] },
  { trade: 'Heating Engineer', category: 'Mechanical', dayMin: 200, dayMax: 300, experience: ['Gas Safe preferred', 'CSCS', '2+ years'] },
  { trade: 'Pipefitter', category: 'Mechanical', dayMin: 200, dayMax: 300, experience: ['CSCS', 'Industrial preferred', '2+ years'] },
  { trade: 'Plant Operator', category: 'Plant', dayMin: 160, dayMax: 240, experience: ['CPCS', 'CSCS', '2+ years'] },
  { trade: 'Excavator Operator', category: 'Plant', dayMin: 170, dayMax: 250, experience: ['CPCS 360', 'CSCS', '2+ years'] },
  { trade: 'Telehandler Operator', category: 'Plant', dayMin: 155, dayMax: 220, experience: ['CPCS Telehandler', 'CSCS', '1+ years'] },
  { trade: 'Forklift Driver', category: 'Plant', dayMin: 140, dayMax: 190, experience: ['RTITB/CPCS', 'CSCS', '1+ years'] },
  { trade: 'Dumper Driver', category: 'Plant', dayMin: 140, dayMax: 190, experience: ['CPCS Dumpers', 'CSCS', '1+ years'] },
  { trade: 'Crane Operator', category: 'Lifting', dayMin: 220, dayMax: 340, experience: ['CPCS Crane', 'CSCS', '3+ years'] },
  { trade: 'Banksman', category: 'Site Operations', dayMin: 140, dayMax: 190, experience: ['Banksman ticket', 'CSCS', '1+ years'] },
  { trade: 'Fire Stopper', category: 'Fire Safety', dayMin: 180, dayMax: 260, experience: ['CSCS', 'Firestopping certs', '2+ years'] },
  {
    trade: 'Insulation Installer', category: 'Insulation', dayMin: 160, dayMax: 230,
    experience: ['CSCS', 'Cavity/loft', '1+ years'],
    priceWork: { unit: '/m²', min: 8, max: 18, chance: 0.4 },
  },
  {
    trade: 'Cladder', category: 'Envelope', dayMin: 180, dayMax: 270,
    experience: ['CSCS', 'Facade experience', '2+ years'],
    priceWork: { unit: '/m²', min: 28, max: 55, chance: 0.35 },
  },
  { trade: 'Glazier', category: 'Envelope', dayMin: 180, dayMax: 260, experience: ['CSCS', 'Curtain walling preferred', '2+ years'] },
  { trade: 'Window Fitter', category: 'Envelope', dayMin: 160, dayMax: 230, experience: ['CSCS', 'uPVC/aluminium', '1+ years'] },
  { trade: 'Demolition Operative', category: 'Demolition', dayMin: 160, dayMax: 230, experience: ['CSCS Demolition', 'Asbestos awareness', '2+ years'] },
  {
    trade: 'Concrete Finisher', category: 'Concrete', dayMin: 170, dayMax: 240,
    experience: ['CSCS', 'Power float', '2+ years'],
    priceWork: { unit: '/m²', min: 6, max: 14, chance: 0.35 },
  },
  { trade: 'Shuttering Carpenter', category: 'Concrete', dayMin: 180, dayMax: 270, experience: ['CSCS', 'Formwork', '2+ years'] },
  { trade: 'Rebar Fixer', category: 'Concrete', dayMin: 170, dayMax: 250, experience: ['CSCS', 'Steel fixing', '2+ years'] },
  { trade: 'Quantity Surveyor', category: 'Professional', dayMin: 250, dayMax: 380, experience: ['RICS preferred', '3+ years', 'Commercial'] },
  { trade: 'Site Engineer', category: 'Professional', dayMin: 220, dayMax: 340, experience: ['Degree/HNC', 'Setting out', '2+ years'] },
  { trade: 'Welder', category: 'Structural', dayMin: 180, dayMax: 280, experience: ['Coded preferred', 'CSCS', '2+ years'] },
  { trade: 'Multi Trader', category: 'General Construction', dayMin: 160, dayMax: 230, experience: ['CSCS', 'Multi-trade', '2+ years'] },
  { trade: 'Kitchen Fitter', category: 'Interiors', dayMin: 170, dayMax: 250, experience: ['CSCS', 'Joinery fit-out', '2+ years'] },
  { trade: 'Bathroom Fitter', category: 'Interiors', dayMin: 170, dayMax: 250, experience: ['CSCS', 'Wet rooms', '2+ years'] },
  { trade: 'Air Conditioning Engineer', category: 'Mechanical', dayMin: 200, dayMax: 310, experience: ['F-Gas', 'CSCS', '2+ years'] },
];

const COMPANY_PREFIXES = [
  'Crown', 'Harbour', 'Summit', 'Keystone', 'Granite', 'Atlas', 'Beacon', 'Oakfield', 'Riverside',
  'Pioneer', 'Northstar', 'IronGate', 'Cedarline', 'Bluebrick', 'Alderstone', 'Forge', 'Union',
  'Metro', 'Delta', 'Vector', 'Horizon', 'Sterling', 'Ashford', 'Bramley', 'Caledonia', 'Cambrian',
];

const COMPANY_SUFFIXES = [
  'Construction', 'Developments', 'Contractors', 'Build Group', 'Site Services', 'Projects',
  'Fit-Out', 'Civil Works', 'Homes', 'Interiors', 'Facades', 'M&E', 'Trade Solutions',
];

const DAY_RATE_TITLE_TEMPLATES = [
  'Experienced {trade} Required',
  '{trade} — Immediate Start',
  '{trade} Needed — {city}',
  'CSCS {trade} — Day Rate',
  '{trade} — Commercial Project',
  'Reliable {trade} for Ongoing Works',
  '{trade} — Residential & Commercial',
  'Site {trade} — Long Term Contract',
];

const PRICE_WORK_TITLE_TEMPLATES = [
  '{trade} — Price Work',
  '{trade} Price Work — {city}',
  'Measured {trade} Work Available',
  '{trade} — Paid {unitLabel}',
  'CSCS {trade} — Price Work Package',
  '{trade} Gang Wanted — Price Work',
];

const DAY_RATE_DESCRIPTION_TEMPLATES = [
  'Main contractor seeking a reliable {trade} for a live project in {city} ({region}). CSCS required. Rate shown is indicative of current local market for this trade.',
  'Busy site in {city}. Looking for an experienced {trade} to join the team. Tools and PPE expected. Weekly pay, clear programme, good supervision on site.',
  '{company} has an opening for a {trade} across {city} and surrounding areas. Must have right to work in the UK and recent site references.',
  'Fit-out / construction package in {city}. {trade} required for day-rate CIS engagement. Start date flexible for the right candidate.',
  'Long-running programme in {region}. We need a {trade} who can hit the ground running. Safety-first culture, consistent hours, site induction provided.',
];

const PRICE_WORK_DESCRIPTION_TEMPLATES = [
  'Price-work package for a {trade} in {city} ({region}). Measured work paid {rate}. CSCS required. Output and quality checked against drawings and site programme.',
  '{company} needs an experienced {trade} on measured rates in {city}. Good run of work, weekly measure and payment. Bring your own tools unless agreed otherwise.',
  'Busy site in {city} offering {trade} price work at around {rate}. Suitable for productive tradespeople used to measured finishing / boarding / laying work.',
  'Measured {trade} package across {region}. Rate guide {rate}. Must have recent UK site references and right to work.',
];

const DURATIONS = ['2-4 weeks', '4-6 weeks', '6-8 weeks', '3 months', '6+ months', 'Ongoing'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'company';
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundToFive(value) {
  return Math.round(value / 5) * 5;
}

function roundMoney(value, { wholeNumbers = false } = {}) {
  if (wholeNumbers) {
    return Math.round(value);
  }
  return Math.round(value * 2) / 2;
}

function formatMoney(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function unitLabelForPriceWork(unit) {
  if (unit === '/m²') return 'per m²';
  if (unit === '/1000 bricks') return 'per 1000 bricks';
  return String(unit || '').replace(/^\//, 'per ');
}

function shouldUsePriceWork(tradeEntry) {
  const priceWork = tradeEntry?.priceWork;
  if (!priceWork || priceWork.min == null || priceWork.max == null) {
    return false;
  }
  const chance = typeof priceWork.chance === 'number' ? priceWork.chance : 0.4;
  return Math.random() < chance;
}

function dayJobsTargetForDayNumber(dayNumber) {
  return Number(dayNumber) % 2 === 0 ? 14 : 7;
}

function dayJobsTargetForDate(date = new Date()) {
  return dayJobsTargetForDayNumber(date.getDate());
}

function londonDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const get = (type) => parts.find((part) => part.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    isoDate: `${year}-${month}-${day}`,
    dayNumber: Number(day),
    year: Number(year),
    month: Number(month),
  };
}

function dayRateForTradeAndRegion(tradeEntry, region) {
  const multiplier = REGION_MULTIPLIERS[region] || 1;
  const mid = (tradeEntry.dayMin + tradeEntry.dayMax) / 2;
  const jitter = 1 + (Math.random() * 0.12 - 0.06);
  const raw = mid * multiplier * jitter;
  const dayRate = roundToFive(clamp(raw, tradeEntry.dayMin, Math.round(tradeEntry.dayMax * Math.max(1, multiplier))));
  return `£${dayRate}/day`;
}

function priceWorkRateForTradeAndRegion(tradeEntry, region) {
  const priceWork = tradeEntry.priceWork;
  const multiplier = REGION_MULTIPLIERS[region] || 1;
  const mid = (priceWork.min + priceWork.max) / 2;
  const jitter = 1 + (Math.random() * 0.1 - 0.05);
  const wholeNumbers = priceWork.unit === '/1000 bricks' || priceWork.max >= 20;
  const raw = mid * multiplier * jitter;
  const value = roundMoney(
    clamp(raw, priceWork.min, priceWork.max * Math.max(1, multiplier)),
    { wholeNumbers }
  );
  return `£${formatMoney(value)}${priceWork.unit}`;
}

function rateForTradeAndRegion(tradeEntry, region, { preferPriceWork = null } = {}) {
  const usePriceWork = preferPriceWork == null
    ? shouldUsePriceWork(tradeEntry)
    : Boolean(preferPriceWork) && Boolean(tradeEntry.priceWork);

  if (usePriceWork) {
    return {
      rate: priceWorkRateForTradeAndRegion(tradeEntry, region),
      payType: 'price_work',
      unit: tradeEntry.priceWork.unit,
    };
  }

  return {
    rate: dayRateForTradeAndRegion(tradeEntry, region),
    payType: 'day_rate',
    unit: '/day',
  };
}

function buildCompanyName() {
  return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)} Ltd`;
}

function buildJobPayload({ tradeEntry, location, companyName, titleIndex = 0 }) {
  const pricing = rateForTradeAndRegion(tradeEntry, location.region);
  const isPriceWork = pricing.payType === 'price_work';
  const titlePool = isPriceWork ? PRICE_WORK_TITLE_TEMPLATES : DAY_RATE_TITLE_TEMPLATES;
  const descriptionPool = isPriceWork ? PRICE_WORK_DESCRIPTION_TEMPLATES : DAY_RATE_DESCRIPTION_TEMPLATES;
  const titleTemplate = titlePool[titleIndex % titlePool.length];
  const descriptionTemplate = pick(descriptionPool);
  const unitLabel = isPriceWork ? unitLabelForPriceWork(pricing.unit) : 'day rate';

  const title = titleTemplate
    .replace('{trade}', tradeEntry.trade)
    .replace('{city}', location.name)
    .replace('{unitLabel}', unitLabel);
  const description = descriptionTemplate
    .replace(/\{trade\}/g, tradeEntry.trade)
    .replace(/\{city\}/g, location.name)
    .replace(/\{region\}/g, location.region)
    .replace(/\{company\}/g, companyName)
    .replace(/\{rate\}/g, pricing.rate);

  return {
    title,
    description,
    trade: tradeEntry.trade,
    city: location.name,
    postcode: location.postcode,
    region: location.region,
    rate: pricing.rate,
    payType: pricing.payType,
    experienceRequired: pick(tradeEntry.experience),
    duration: pick(DURATIONS),
    workersRequired: randomInt(1, 3),
    startOffsetDays: randomInt(2, 18),
  };
}

/**
 * Build a balanced set of job blueprints for one day.
 * Spreads trades and UK regions; companies get 1–2 jobs each.
 */
function buildDailyJobPlan(count) {
  const trades = shuffle(TRADE_CATALOG);
  const locations = shuffle(UK_LOCATIONS);
  const jobsNeeded = Math.max(1, Number(count) || 7);
  const blueprints = [];

  for (let i = 0; i < jobsNeeded; i += 1) {
    const tradeEntry = trades[i % trades.length];
    const location = locations[i % locations.length];
    blueprints.push({ tradeEntry, location, order: i });
  }

  // Group into companies of 1–2 jobs (prefer pairs when even count)
  const companies = [];
  let index = 0;
  while (index < blueprints.length) {
    const remaining = blueprints.length - index;
    const jobsForCompany = remaining === 1 ? 1 : (remaining === 3 ? 1 : 2);
    const slice = blueprints.slice(index, index + jobsForCompany);
    const companyName = buildCompanyName();
    companies.push({
      companyName,
      city: slice[0].location.name,
      postcode: slice[0].location.postcode,
      region: slice[0].location.region,
      trades: [...new Set(slice.map((item) => item.tradeEntry.trade))],
      jobs: slice.map((item, jobIndex) => buildJobPayload({
        tradeEntry: item.tradeEntry,
        location: item.location,
        companyName,
        titleIndex: item.order + jobIndex,
      })),
    });
    index += jobsForCompany;
  }

  return {
    targetCount: jobsNeeded,
    companyCount: companies.length,
    companies,
  };
}

module.exports = {
  REGION_MULTIPLIERS,
  UK_LOCATIONS,
  TRADE_CATALOG,
  dayJobsTargetForDate,
  dayJobsTargetForDayNumber,
  londonDateParts,
  buildDailyJobPlan,
  slugify,
  pick,
  randomInt,
};
