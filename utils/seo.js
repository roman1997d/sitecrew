const SITE_NAME = 'SiteCrew';
const DEFAULT_DESCRIPTION = 'Connect with verified construction workers and companies across the UK. Post jobs, apply in minutes, and hire tradespeople directly — no agencies.';

function getSiteUrl() {
  const raw = process.env.PUBLIC_URL || process.env.API_BASE_URL || 'http://localhost:3000';
  return String(raw).replace(/\/$/, '');
}

function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function buildSeo(overrides = {}) {
  const path = overrides.path || '/';
  const siteUrl = getSiteUrl();

  return {
    siteName: SITE_NAME,
    siteUrl,
    path,
    title: overrides.title || `${SITE_NAME} — UK Construction Jobs`,
    description: overrides.description || DEFAULT_DESCRIPTION,
    canonical: overrides.canonical || absoluteUrl(path),
    ogType: overrides.ogType || 'website',
    ogImage: overrides.ogImage || absoluteUrl('/android-chrome-512x512.png'),
    robots: overrides.robots || 'index, follow',
    jsonLd: overrides.jsonLd || null,
  };
}

function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl('/android-chrome-512x512.png'),
    description: DEFAULT_DESCRIPTION,
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
  };
}

function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-GB',
  };
}

function getHomeFaqSchema() {
  const faqs = getHomeFaqItems();
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

function getHomeFaqItems() {
  return [
    {
      question: 'What is SiteCrew?',
      answer: 'SiteCrew is a UK construction recruitment platform that connects skilled tradespeople with companies hiring for site work. Workers can find jobs and companies can hire directly without agencies.',
    },
    {
      question: 'Is SiteCrew free to join?',
      answer: 'Workers can register and use core features to find construction jobs. Companies can choose a plan that fits their hiring needs when creating an account.',
    },
    {
      question: 'What construction trades are supported?',
      answer: 'SiteCrew supports trades across the UK construction industry, including electricians, builders, dryliners, plasterers, carpenters, labourers, plumbers, and more.',
    },
    {
      question: 'How do I apply for a construction job?',
      answer: 'Create a worker account, set your trade interests and availability, then browse matched jobs in your dashboard feed and apply directly to companies.',
    },
    {
      question: 'How can companies hire workers on SiteCrew?',
      answer: 'Companies register on SiteCrew, post open roles, review applicants, and message workers directly through the platform.',
    },
  ];
}

function getHomePageJsonLd() {
  return [
    getOrganizationSchema(),
    getWebsiteSchema(),
    getHomeFaqSchema(),
  ];
}

const SITEMAP_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/jobs', changefreq: 'daily', priority: '0.9' },
  { path: '/login', changefreq: 'monthly', priority: '0.8' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { path: '/contact', changefreq: 'yearly', priority: '0.5' },
];

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderSitemapXml(extraUrls = []) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const entries = [...SITEMAP_PAGES, ...extraUrls];
  const urls = entries.map((entry) => {
    const loc = escapeXml(absoluteUrl(entry.path));
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n');
}

function renderRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /worker/dashboard',
    'Disallow: /company/dashboard',
    'Disallow: /api/',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
  ].join('\n');
}

module.exports = {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  absoluteUrl,
  buildSeo,
  getHomeFaqItems,
  getHomePageJsonLd,
  renderSitemapXml,
  renderRobotsTxt,
};
