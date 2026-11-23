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
    intro: 'Looking for plasterer jobs in the UK? SiteCrew lists live plastering roles from verified construction companies — skim, board finish, and commercial packages. Browse rates, location, and start dates, then apply directly without an agency.',
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
  sheffield: {
    label: 'Sheffield',
    filter: 'Sheffield',
    intro: 'Construction jobs in Sheffield and South Yorkshire. Browse open site roles from verified employers on SiteCrew.',
  },
  nottingham: {
    label: 'Nottingham',
    filter: 'Nottingham',
    intro: 'Find construction work in Nottingham and the East Midlands. Apply directly to companies hiring on SiteCrew.',
  },
  cardiff: {
    label: 'Cardiff',
    filter: 'Cardiff',
    intro: 'Cardiff construction vacancies across trades. View live jobs and connect with hiring companies in Wales.',
  },
  edinburgh: {
    label: 'Edinburgh',
    filter: 'Edinburgh',
    intro: 'Edinburgh construction jobs from verified UK companies. Browse roles and apply with a free SiteCrew account.',
  },
  newcastle: {
    label: 'Newcastle',
    filter: 'Newcastle',
    intro: 'Construction roles in Newcastle and the North East. SiteCrew lists open jobs with rates and company details.',
  },
  southampton: {
    label: 'Southampton',
    filter: 'Southampton',
    intro: 'Southampton construction jobs on live projects. Find skilled trade work and apply without agencies.',
  },
};

const POPULAR_COMBO_SLUGS = [
  'electrician-jobs-in-london',
  'builder-jobs-in-manchester',
  'dryliner-jobs-in-london',
  'plumber-jobs-in-birmingham',
  'carpenter-jobs-in-london',
  'labourer-jobs-in-manchester',
  'bricklayer-jobs-in-leeds',
  'plasterer-jobs-in-bristol',
  'plasterer-jobs-in-london',
  'plasterer-jobs-in-manchester',
  'plasterer-jobs-in-birmingham',
  'dryliner-jobs-in-manchester',
  'electrician-jobs-in-birmingham',
  'labourer-jobs-in-london',
];

// Natural-language aliases people (and AI assistants) type, mapped to trade hubs.
const TRADE_LANDING_ALIASES = {
  'plasterer-jobs-uk': 'plasterer',
  'plasterer-jobs': 'plasterer',
  'find-plasterer-jobs-uk': 'plasterer',
  'plastering-jobs-uk': 'plasterer',
  'electrician-jobs-uk': 'electrician',
  'electrician-jobs': 'electrician',
  'find-electrician-jobs-uk': 'electrician',
  'dryliner-jobs-uk': 'dryliner',
  'dryliner-jobs': 'dryliner',
  'drylining-jobs-uk': 'dryliner',
  'plumber-jobs-uk': 'plumber',
  'plumber-jobs': 'plumber',
  'carpenter-jobs-uk': 'carpenter',
  'carpenter-jobs': 'carpenter',
  'bricklayer-jobs-uk': 'bricklayer',
  'bricklayer-jobs': 'bricklayer',
  'labourer-jobs-uk': 'labourer',
  'labourer-jobs': 'labourer',
  'builder-jobs-uk': 'builder',
  'builder-jobs': 'builder',
  'construction-jobs-uk': null,
};

function buildComboSlug(tradeSlug, citySlug) {
  return `${tradeSlug}-jobs-in-${citySlug}`;
}

function buildComboIntro(trade, city) {
  return `Browse ${trade.label.toLowerCase()} jobs in ${city.label}. Open roles from verified UK construction companies on SiteCrew — view rates and apply directly.`;
}

function buildComboLandings() {
  const combos = {};

  Object.entries(TRADE_LANDINGS).forEach(([tradeSlug, trade]) => {
    Object.entries(CITY_LANDINGS).forEach(([citySlug, city]) => {
      const slug = buildComboSlug(tradeSlug, citySlug);
      combos[slug] = {
        label: `${trade.label} jobs in ${city.label}`,
        tradeFilter: trade.filter,
        cityFilter: city.filter,
        intro: buildComboIntro(trade, city),
      };
    });
  });

  return combos;
}

const COMBO_LANDINGS = buildComboLandings();

function resolveJobLandingSlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(TRADE_LANDING_ALIASES, normalized)) {
    const tradeKey = TRADE_LANDING_ALIASES[normalized];
    if (tradeKey && TRADE_LANDINGS[tradeKey]) {
      return {
        type: 'trade',
        slug: normalized,
        canonicalTradeSlug: tradeKey,
        ...TRADE_LANDINGS[tradeKey],
      };
    }
    if (tradeKey === null) {
      return {
        type: 'city',
        slug: normalized,
        label: 'United Kingdom',
        filter: '',
        intro: 'Browse open construction jobs across the UK on SiteCrew. Filter by trade and city, view day rates, and apply directly to verified companies — no recruitment agency required.',
        isUkWide: true,
      };
    }
  }

  const trade = TRADE_LANDINGS[normalized];
  if (trade) {
    return { type: 'trade', slug: normalized, ...trade };
  }

  const city = CITY_LANDINGS[normalized];
  if (city) {
    return { type: 'city', slug: normalized, ...city };
  }

  const combo = COMBO_LANDINGS[normalized];
  if (combo) {
    return { type: 'combo', slug: normalized, ...combo };
  }

  return null;
}

function getLandingFaqItems(landing) {
  if (!landing) return [];

  if (landing.type === 'trade') {
    const trade = landing.label.toLowerCase();
    return [
      {
        question: `Where can I find ${trade} jobs in the UK?`,
        answer: `SiteCrew lists live ${trade} jobs from verified UK construction companies. Browse ${landing.label} vacancies, compare day rates and locations, then apply directly without an agency.`,
      },
      {
        question: `Do I need an agency to get ${trade} work?`,
        answer: `No. On SiteCrew you apply straight to the hiring company. Create a free worker account, set your trade interests, and apply to open ${trade} roles.`,
      },
      {
        question: `Are ${trade} jobs on SiteCrew paid roles?`,
        answer: `Yes. Companies post real site vacancies with rates, duration, and start details where available. Always check the job card for CSCS or ticket requirements before you apply.`,
      },
    ];
  }

  if (landing.type === 'city' || landing.isUkWide) {
    const place = landing.isUkWide ? 'the UK' : landing.label;
    return [
      {
        question: `How do I find construction jobs in ${place}?`,
        answer: `Use SiteCrew to browse open construction jobs in ${place}. Filter by trade, review company details and rates, then apply with a free worker account.`,
      },
      {
        question: 'Is SiteCrew only for agencies?',
        answer: 'No. SiteCrew is built for direct hiring between construction companies and tradespeople across the UK.',
      },
    ];
  }

  return [
    {
      question: `Are there open ${landing.label.toLowerCase()} on SiteCrew?`,
      answer: `Yes — SiteCrew shows live vacancies matching ${landing.label}. View rates and apply directly to the company posting the role.`,
    },
  ];
}

function getLandingFaqSchema(landing) {
  const faqs = getLandingFaqItems(landing);
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function getLandingSeo(landing, jobCount = 0) {
  const countSuffix = jobCount > 0 ? ` — ${jobCount} open now` : '';
  const path = `/jobs/${landing.slug}`;

  if (landing.type === 'trade') {
    return {
      path,
      title: `${landing.label} Jobs in the UK | SiteCrew${countSuffix}`,
      description: `Find ${landing.label.toLowerCase()} jobs in the UK on SiteCrew. Browse ${jobCount || 'open'} live construction vacancies, compare day rates, and apply directly to companies — no agency.`,
      eyebrow: `${landing.label} roles`,
      heading: `${landing.label} jobs in the UK`,
      intro: landing.intro,
      faqItems: getLandingFaqItems(landing),
    };
  }

  if (landing.type === 'city') {
    const placeLabel = landing.isUkWide ? 'the UK' : landing.label;
    return {
      path,
      title: `Construction Jobs in ${landing.isUkWide ? 'the UK' : landing.label} | SiteCrew${countSuffix}`,
      description: `Browse construction jobs in ${placeLabel}. Open roles from verified UK companies — apply directly on SiteCrew.`,
      eyebrow: landing.isUkWide ? 'UK roles' : landing.label,
      heading: `Construction jobs in ${placeLabel}`,
      intro: landing.intro,
      faqItems: getLandingFaqItems(landing),
    };
  }

  return {
    path,
    title: `${landing.label} | SiteCrew${countSuffix}`,
    description: `${landing.label} from verified UK construction companies. View rates and apply on SiteCrew.`,
    eyebrow: 'Matched roles',
    heading: landing.label,
    intro: landing.intro,
    faqItems: getLandingFaqItems(landing),
  };
}

function getLandingFilters(landing) {
  if (landing.type === 'trade') {
    return { trade: landing.filter, city: '' };
  }
  if (landing.type === 'city') {
    return { trade: '', city: landing.filter || '' };
  }
  return { trade: landing.tradeFilter, city: landing.cityFilter };
}

function getAllLandingPaths() {
  return [
    ...Object.keys(TRADE_LANDINGS).map((slug) => `/jobs/${slug}`),
    ...Object.keys(TRADE_LANDING_ALIASES).map((slug) => `/jobs/${slug}`),
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

function getPopularLandingLinks(limit = 8) {
  return POPULAR_COMBO_SLUGS
    .filter((slug) => COMBO_LANDINGS[slug])
    .slice(0, limit)
    .map((slug) => ({
      slug,
      path: `/jobs/${slug}`,
      label: COMBO_LANDINGS[slug].label,
    }));
}

module.exports = {
  TRADE_LANDINGS,
  CITY_LANDINGS,
  COMBO_LANDINGS,
  TRADE_LANDING_ALIASES,
  resolveJobLandingSlug,
  getLandingSeo,
  getLandingFaqItems,
  getLandingFaqSchema,
  getLandingFilters,
  getAllLandingPaths,
  getTradeBrowseLinks,
  getCityBrowseLinks,
  getPopularLandingLinks,
  buildComboLandings,
};
