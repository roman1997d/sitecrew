const { slugify, buildJobPath } = require('./publicJobs');

function getInitials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SC';
}

function buildCompanySlug(name, id) {
  return `${slugify(name)}-${id}`;
}

function parseCompanySlug(param) {
  const value = String(param || '').trim();
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function mapPublicCompanyProfile(data) {
  const profile = data.profile || {};
  const name = profile.company_name || 'SiteCrew Company';

  return {
    id: profile.user_id,
    name,
    slug: buildCompanySlug(name, profile.user_id),
    description: profile.description || 'This company is hiring construction workers on SiteCrew.',
    logo: profile.logo || '',
    initials: getInitials(name),
    city: profile.city || '',
    postcode: profile.postcode || '',
    location: profile.head_office || profile.city || profile.postcode || 'United Kingdom',
    website: profile.website || '',
    businessType: profile.business_type || '',
    trades: Array.isArray(profile.trades) ? profile.trades : [],
    verificationStatus: profile.verification_status || 'pending',
    verified: profile.verification_status === 'approved',
    ratingAverage: data.rating?.average || null,
    ratingCount: Number(data.rating?.count || 0),
    updatedAt: profile.updated_at || profile.created_at,
  };
}

function mapPublicCompanyJobs(jobs = []) {
  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    trade: job.trade_required || 'Construction',
    location: job.city || job.postcode || 'UK',
    rate: job.rate || 'Rate negotiable',
    description: job.description || '',
    url: buildJobPath(job),
  }));
}

function mapPublicCompanyReviews(reviews = []) {
  return reviews.map((review) => ({
    id: review.id,
    workerName: review.full_name || 'SiteCrew worker',
    workerInitials: getInitials(review.full_name || 'Worker'),
    workerPhoto: review.profile_photo || '',
    workerTrade: Array.isArray(review.trades) && review.trades.length ? review.trades.join(', ') : 'Worker',
    rating: review.rating,
    feedback: review.feedback || '',
    date: review.updated_at || review.created_at,
  }));
}

function getCompanyOrganizationSchema(company, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: canonicalUrl,
    description: company.description,
    logo: company.logo || undefined,
    address: company.city
      ? {
          '@type': 'PostalAddress',
          addressLocality: company.city,
          addressCountry: 'GB',
        }
      : undefined,
    aggregateRating: company.ratingCount
      ? {
          '@type': 'AggregateRating',
          ratingValue: company.ratingAverage,
          reviewCount: company.ratingCount,
        }
      : undefined,
  };
}

function getCompanyReviewSchemas(reviews = [], companyName = 'SiteCrew company') {
  return reviews
    .filter((review) => review.rating && (review.feedback || review.workerName))
    .slice(0, 10)
    .map((review) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Organization',
        name: companyName,
      },
      author: {
        '@type': 'Person',
        name: review.workerName || 'SiteCrew worker',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.feedback || undefined,
      datePublished: review.date || undefined,
    }));
}

function mapPublicCompanyCarouselItem(company) {
  const name = company.company_name || 'SiteCrew Company';
  const description = String(company.description || '').trim()
    || (company.open_job_count > 0
      ? `${company.open_job_count} open job${company.open_job_count === 1 ? '' : 's'} on SiteCrew.`
      : 'Verified construction company on SiteCrew.');

  return {
    id: company.user_id,
    name,
    slug: buildCompanySlug(name, company.user_id),
    city: company.city || 'UK',
    description: description.length > 140 ? `${description.slice(0, 137)}...` : description,
    logo: company.logo || '',
    initials: getInitials(name),
    openJobCount: Number(company.open_job_count || 0),
    themeClass: ['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6'][company.user_id % 6],
  };
}

module.exports = {
  buildCompanySlug,
  parseCompanySlug,
  mapPublicCompanyProfile,
  mapPublicCompanyJobs,
  mapPublicCompanyReviews,
  getCompanyOrganizationSchema,
  getCompanyReviewSchemas,
  mapPublicCompanyCarouselItem,
};
