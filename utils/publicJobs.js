function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'job';
}

function buildJobSlug(job) {
  const trade = slugify(job.trade_required || job.trade || 'construction');
  const city = slugify(job.city || job.location || 'uk');
  const id = job.id;
  return `${trade}-${city}-${id}`;
}

function buildJobPath(job) {
  return `/jobs/${buildJobSlug(job)}`;
}

function parseJobIdFromSegment(segment) {
  const value = String(segment || '').trim();
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function getJobCardTheme(trade = '', index = 0) {
  const value = String(trade).toLowerCase();
  if (value.includes('dry')) return 'dryliner';
  if (value.includes('plaster')) return 'plasterer';
  if (value.includes('labour') || value.includes('labor')) return 'labourer';
  if (value.includes('electric')) return 'apex';
  if (value.includes('build')) return 'north';
  return ['dryliner', 'labourer', 'plasterer', 'apex', 'north'][index % 5];
}

function formatPublicJobRate(rate) {
  const raw = String(rate || '').trim();
  return raw || 'Rate negotiable';
}

function parseRateNumericValue(rate) {
  const match = String(rate || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

function formatSchemaDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function getJobValidThrough(job) {
  if (job.closes_at) {
    return formatSchemaDate(job.closes_at);
  }

  const posted = new Date(job.created_at);
  if (Number.isNaN(posted.getTime())) {
    return undefined;
  }

  const validThrough = new Date(posted);
  validThrough.setDate(validThrough.getDate() + 30);
  return validThrough.toISOString();
}

function mapPublicJobCard(job, index = 0) {
  const location = job.city || job.postcode || 'UK';
  const companyName = job.company_name || 'Company';
  const companyId = job.company_id || null;
  return {
    id: job.id,
    slug: buildJobSlug(job),
    title: job.title,
    trade: job.trade_required || 'Construction',
    location,
    rate: formatPublicJobRate(job.rate),
    duration: job.duration || '',
    theme: getJobCardTheme(job.trade_required, index),
    url: buildJobPath(job),
    companyName,
    companyId,
    companySlug: companyId ? `${slugify(companyName)}-${companyId}` : '',
    description: job.description || '',
    createdAt: job.created_at,
    closesAt: job.closes_at || null,
  };
}

function mapPublicJobDetail(job) {
  return {
    ...mapPublicJobCard(job, 0),
    startDate: job.start_date,
    workersRequired: job.workers_required || 1,
    experienceRequired: job.experience_required || '',
    companyLogo: job.logo || '',
    shareImage: job.share_image || '',
    companyId: job.company_id,
    status: job.status,
  };
}

function getJobPostingSchema(job, canonicalUrl) {
  const rateValue = parseRateNumericValue(job.rate);
  const tradeName = job.trade || job.trade_required || 'Construction';

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: getJobValidThrough(job),
    identifier: job.id
      ? {
          '@type': 'PropertyValue',
          name: 'SiteCrew',
          value: `sitecrew-job-${job.id}`,
        }
      : undefined,
    industry: 'Construction',
    occupationalCategory: tradeName,
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name || 'SiteCrew company',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city || 'United Kingdom',
        addressCountry: 'GB',
      },
    },
    baseSalary: rateValue
      ? {
          '@type': 'MonetaryAmount',
          currency: 'GBP',
          value: {
            '@type': 'QuantitativeValue',
            value: rateValue,
            unitText: 'DAY',
          },
        }
      : undefined,
    directApply: true,
    url: canonicalUrl,
  };
}

function getJobItemListSchema(jobs = [], listName = 'Construction jobs in the UK') {
  if (!jobs.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: job.url,
      name: job.title,
    })),
  };
}

module.exports = {
  slugify,
  buildJobSlug,
  buildJobPath,
  parseJobIdFromSegment,
  mapPublicJobCard,
  mapPublicJobDetail,
  getJobPostingSchema,
  getJobItemListSchema,
  parseRateNumericValue,
  getJobValidThrough,
  formatSchemaDate,
};
