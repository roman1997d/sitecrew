const TRADE_LANDINGS = {
  electrician: {
    label: 'Electrician',
    filter: 'Electrician',
    intro: 'Browse open electrician jobs across the UK. SiteCrew connects qualified sparks with verified construction companies hiring for site work, commercial fit-outs, and residential projects.',
  },
  builder: {
    label: 'Builder',
    filter: 'Builder',
    intro: 'Find builder roles on live UK construction sites. Apply directly to hiring companies without agencies — from general building to site-based contracts nationwide.',
  },
  plumber: {
    label: 'Plumber',
    filter: 'Plumber',
    intro: 'Discover plumber jobs posted by verified UK companies. View rates, locations, and start dates, then apply with a free SiteCrew worker account.',
  },
  carpenter: {
    label: 'Carpenter',
    filter: 'Carpenter',
    intro: 'Carpenter and joinery jobs from companies hiring on SiteCrew. Browse open roles, compare day rates, and apply in minutes.',
  },
  dryliner: {
    label: 'Dryliner',
    filter: 'Dryliner',
    intro: 'Drylining and fixing jobs across the UK construction sector. SiteCrew lists live dryliner roles with transparent rates from verified employers.',
  },
  plasterer: {
    label: 'Plasterer',
    filter: 'Plasterer',
    intro: 'Plasterer jobs on commercial and residential projects. Find skilled work with UK companies posting directly on SiteCrew.',
  },
  bricklayer: {
    label: 'Bricklayer',
    filter: 'Bricklayer',
    intro: 'Bricklayer vacancies from construction companies hiring nationwide. View open contracts and apply without recruiter fees.',
  },
  labourer: {
    label: 'Labourer',
    filter: 'Labourer',
    intro: 'General labourer and site operative jobs updated on SiteCrew. Start with a free profile and apply to roles near you.',
  },
};

const CITY_LANDINGS = {
  london: {
    label: 'London',
    filter: 'London',
    intro: 'Construction jobs in London posted by verified companies. Browse live site roles across Greater London and apply directly on SiteCrew.',
  },
  manchester: {
    label: 'Manchester',
    filter: 'Manchester',
    intro: 'Open construction jobs in Manchester and Greater Manchester. Tradespeople can view rates and apply to companies hiring on SiteCrew.',
  },
  birmingham: {
    label: 'Birmingham',
    filter: 'Birmingham',
    intro: 'Construction vacancies in Birmingham from approved UK employers. Find your next site role and apply in minutes.',
  },
  leeds: {
    label: 'Leeds',
    filter: 'Leeds',
    intro: 'Leeds construction jobs across trades — from fit-out to new build. Browse roles and connect with hiring companies directly.',
  },
  liverpool: {
    label: 'Liverpool',
    filter: 'Liverpool',
    intro: 'Construction jobs in Liverpool and Merseyside. SiteCrew lists open roles with clear rates and company details.',
  },
  bristol: {
    label: 'Bristol',
    filter: 'Bristol',
    intro: 'Find construction work in Bristol on SiteCrew. Verified companies post live jobs for skilled trades and site labour.',
  },
  glasgow: {
    label: 'Glasgow',
    filter: 'Glasgow',
    intro: 'Glasgow construction jobs from companies hiring through SiteCrew. Browse open roles and apply with a free worker account.',
  },
  brighton: {
    label: 'Brighton',
    filter: 'Brighton',
    intro: 'Construction roles in Brighton and the South Coast. View current vacancies and apply directly to hiring companies.',
  },
};

const COMBO_LANDINGS = {
  'electrician-jobs-in-london': {
    label: 'Electrician jobs in London',
    tradeFilter: 'Electrician',
    cityFilter: 'London',
    intro: 'Electrician jobs in London from verified construction companies. Compare day rates, view project details, and apply on SiteCrew without agencies.',
  },
  'builder-jobs-in-manchester': {
    label: 'Builder jobs in Manchester',
    tradeFilter: 'Builder',
    cityFilter: 'Manchester',
    intro: 'Builder roles in Manchester and Greater Manchester. SiteCrew connects skilled builders with companies hiring for live site work.',
  },
  'dryliner-jobs-in-london': {
    label: 'Dryliner jobs in London',
    tradeFilter: 'Dryliner',
    cityFilter: 'London',
    intro: 'Drylining and fixing jobs in London. Browse open contracts from verified employers and apply with your SiteCrew worker profile.',
  },
};

function resolveJobLandingSlug(slug) {
  const trade = TRADE_LANDINGS[slug];
  if (trade) {
    return { type: 'trade', slug, ...trade };
  }

  const city = CITY_LANDINGS[slug];
  if (city) {
    return { type: 'city', slug, ...city };
  }

  const combo = COMBO_LANDINGS[slug];
  if (combo) {
    return { type: 'combo', slug, ...combo };
  }

  return null;
}

function getLandingSeo(landing, jobCount = 0) {
  const countSuffix = jobCount > 0 ? ` — ${jobCount} open now` : '';
  const path = `/jobs/${landing.slug}`;

  if (landing.type === 'trade') {
    return {
      path,
      title: `${landing.label} Jobs in the UK | SiteCrew${countSuffix}`,
      description: `Find ${landing.label.toLowerCase()} construction jobs across the UK. Browse ${jobCount || 'open'} roles, view rates, and apply directly on SiteCrew.`,
      eyebrow: `${landing.label} roles`,
      heading: `${landing.label} jobs in the UK`,
      intro: landing.intro,
    };
  }

  if (landing.type === 'city') {
    return {
      path,
      title: `Construction Jobs in ${landing.label} | SiteCrew${countSuffix}`,
      description: `Browse construction jobs in ${landing.label}. Open roles from verified UK companies — apply directly on SiteCrew.`,
      eyebrow: landing.label,
      heading: `Construction jobs in ${landing.label}`,
      intro: landing.intro,
    };
  }

  return {
    path,
    title: `${landing.label} | SiteCrew${countSuffix}`,
    description: `${landing.label} from verified UK construction companies. View rates and apply on SiteCrew.`,
    eyebrow: 'Matched roles',
    heading: landing.label,
    intro: landing.intro,
  };
}

function getLandingFilters(landing) {
  if (landing.type === 'trade') {
    return { trade: landing.filter, city: '' };
  }
  if (landing.type === 'city') {
    return { trade: '', city: landing.filter };
  }
  return { trade: landing.tradeFilter, city: landing.cityFilter };
}

function getAllLandingPaths() {
  return [
    ...Object.keys(TRADE_LANDINGS).map((slug) => `/jobs/${slug}`),
    ...Object.keys(CITY_LANDINGS).map((slug) => `/jobs/${slug}`),
    ...Object.keys(COMBO_LANDINGS).map((slug) => `/jobs/${slug}`),
  ];
}

function getTradeBrowseLinks() {
  return Object.entries(TRADE_LANDINGS).map(([slug, item]) => ({
    slug,
    label: item.label,
    path: `/jobs/${slug}`,
  }));
}

function getCityBrowseLinks() {
  return Object.entries(CITY_LANDINGS).map(([slug, item]) => ({
    slug,
    label: item.label,
    path: `/jobs/${slug}`,
  }));
}

module.exports = {
  TRADE_LANDINGS,
  CITY_LANDINGS,
  COMBO_LANDINGS,
  resolveJobLandingSlug,
  getLandingSeo,
  getLandingFilters,
  getAllLandingPaths,
  getTradeBrowseLinks,
  getCityBrowseLinks,
};
