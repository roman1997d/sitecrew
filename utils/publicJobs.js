function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'job';
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

function mapPublicJobCard(job, index = 0) {
  const location = job.city || job.postcode || 'UK';
  return {
    id: job.id,
    title: job.title,
    trade: job.trade_required || 'Construction',
    location,
    rate: formatPublicJobRate(job.rate),
    duration: job.duration || '',
    theme: getJobCardTheme(job.trade_required, index),
    url: `/jobs/${job.id}`,
    companyName: job.company_name || 'Company',
    description: job.description || '',
    createdAt: job.created_at,
  };
}

function mapPublicJobDetail(job) {
  return {
    ...mapPublicJobCard(job, 0),
    startDate: job.start_date,
    workersRequired: job.workers_required || 1,
    experienceRequired: job.experience_required || '',
    companyLogo: job.logo || '',
    companyId: job.company_id,
    status: job.status,
  };
}

function getJobPostingSchema(job, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: job.start_date || undefined,
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
    baseSalary: job.rate
      ? {
          '@type': 'MonetaryAmount',
          currency: 'GBP',
          value: {
            '@type': 'QuantitativeValue',
            value: job.rate,
            unitText: 'DAY',
          },
        }
      : undefined,
    directApply: true,
    url: canonicalUrl,
  };
}

module.exports = {
  slugify,
  mapPublicJobCard,
  mapPublicJobDetail,
  getJobPostingSchema,
};
