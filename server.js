const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const {
  buildSeo,
  getHomeFaqItems,
  getHomePageJsonLd,
  renderSitemapXml,
  renderRobotsTxt,
} = require('./utils/seo');
const {
  mapPublicJobCard,
  mapPublicJobDetail,
  getJobPostingSchema,
} = require('./utils/publicJobs');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID || 'G-RQRV1DW5GG';
app.locals.googleAnalyticsId = GOOGLE_ANALYTICS_ID;
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_PUBLIC_URL = process.env.ADMIN_PUBLIC_URL || 'https://admin.sitecrew.uk';
const ADMIN_HOST = process.env.ADMIN_HOST || 'admin.sitecrew.uk';
const API_BASE_URL = process.env.API_BASE_URL || PUBLIC_URL;
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@sitecrew.uk';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

function getRequestHost(req) {
  const forwarded = req.headers['x-forwarded-host'] || req.headers.host || '';
  return String(forwarded).split(',')[0].trim().split(':')[0].toLowerCase();
}

function isAdminHost(req) {
  return getRequestHost(req) === ADMIN_HOST.toLowerCase();
}

function getPublicApiBaseUrl(req) {
  return isAdminHost(req) ? ADMIN_PUBLIC_URL : PUBLIC_URL;
}

app.use((req, res, next) => {
  res.locals.apiBaseUrl = getPublicApiBaseUrl(req);
  next();
});

app.use((req, res, next) => {
  if (isAdminHost(req) && req.path === '/') {
    return res.redirect('/admin/login');
  }

  if (!isAdminHost(req) && (req.path === '/admin' || req.path.startsWith('/admin/'))) {
    return res.redirect(`${ADMIN_PUBLIC_URL}${req.path}`);
  }

  if (isAdminHost(req) && !req.path.startsWith('/admin') && !req.path.startsWith('/api')) {
    const publicAsset = req.path.startsWith('/uploads/')
      || req.path.startsWith('/css/')
      || req.path.startsWith('/js/')
      || req.path === '/favicon.ico';
    if (!publicAsset) {
      return res.redirect('/admin/login');
    }
  }

  return next();
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(renderRobotsTxt());
});

app.get('/sitemap.xml', async (req, res) => {
  let extraUrls = [];
  try {
    const jobs = await fetchAllPublicOpenJobs();
    extraUrls = jobs.map((job) => ({
      path: job.url,
      changefreq: 'weekly',
      priority: '0.7',
    }));
  } catch (error) {
    // Keep static sitemap entries when the API is unavailable.
  }

  res.type('application/xml');
  res.send(renderSitemapXml(extraUrls));
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .filter(Boolean)
    .reduce((cookies, item) => {
      const [key, ...valueParts] = item.trim().split('=');
      cookies[key] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
}

function getSafeReturnPath(value, fallback = '/worker/dashboard') {
  const path = String(value || '').trim();
  if (!path.startsWith('/') || path.startsWith('//')) {
    return fallback;
  }
  return path;
}

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.sitecrewToken;

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_INTERNAL_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const session = await response.json();
  if (['admin', 'superadmin'].includes(session.user?.role)) {
    return null;
  }

  return { ...session, token };
}

async function getAdminSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.sitecrewAdminToken;

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_INTERNAL_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const session = await response.json();
  if (!['admin', 'superadmin'].includes(session.user?.role)) {
    return null;
  }

  return { ...session, token };
}

async function requireWorkerAuth(req, res, next) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      const returnPath = encodeURIComponent(getSafeReturnPath(req.originalUrl));
      return res.redirect(`/auth/restore?return=${returnPath}`);
    }
    if (session.user.role !== 'worker') {
      return res.redirect('/');
    }

    req.sessionUser = session.user;
    req.sessionProfile = session.profile;
    req.authToken = session.token;
    return next();
  } catch (error) {
    return res.redirect('/auth/restore');
  }
}

async function requireCompanyAuth(req, res, next) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      const returnPath = encodeURIComponent(getSafeReturnPath(req.originalUrl, '/company/dashboard'));
      return res.redirect(`/auth/restore?return=${returnPath}`);
    }
    if (session.user.role !== 'company') {
      return res.redirect('/');
    }

    req.sessionUser = session.user;
    req.sessionProfile = session.profile;
    req.authToken = session.token;
    return next();
  } catch (error) {
    return res.redirect('/auth/restore?return=%2Fcompany%2Fdashboard');
  }
}

async function requireAdminAuth(req, res, next) {
  try {
    const session = await getAdminSessionFromRequest(req);
    if (!session) {
      return res.redirect('/admin/login');
    }

    req.sessionUser = session.user;
    req.authToken = session.token;
    return next();
  } catch (error) {
    return res.redirect('/admin/login');
  }
}

async function apiGet(pathname, token) {
  const response = await fetch(`${API_INTERNAL_URL}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${pathname}`);
  }

  return response.json();
}

function getInitials(name = 'SC') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function timeAgo(dateValue) {
  const date = new Date(dateValue);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  const unit = units.find(([, size]) => seconds >= size);

  if (!unit) return 'Just now';

  const value = Math.floor(seconds / unit[1]);
  return unit[0].length === 1 ? `${value}${unit[0]} ago` : `${value} ${unit[0]}${value > 1 ? 's' : ''} ago`;
}

function getWorkerCertification(profile) {
  if (profile?.verification_status === 'approved') {
    return 'Profile Verified';
  }

  if (profile?.certificates?.length) {
    return profile.certificates.join(', ');
  }

  return 'Profile pending';
}

function getWorkerQualifications(profile) {
  if (profile?.qualifications?.length) {
    return profile.qualifications.join(', ');
  }

  if (profile?.certificates?.length) {
    return profile.certificates.join(', ');
  }

  return '';
}

function formatWorker(profile) {
  const name = profile?.full_name || 'SiteCrew Worker';
  const trades = profile?.trades?.length ? profile.trades.join(', ') : 'Construction worker';

  return {
    id: profile?.user_id,
    name,
    initials: getInitials(name),
    profilePhoto: profile?.profile_photo,
    trade: trades,
    location: profile?.city || profile?.postcode || 'Location not set',
    experience: profile?.experience || 'Experience not set',
    certification: getWorkerCertification(profile),
    qualifications: getWorkerQualifications(profile),
    qualificationBadgeColor: profile?.qualification_badge_color || 'green',
    verificationRequested: Boolean(profile?.verification_requested_at),
    verified: profile?.verification_status === 'approved',
    status: profile?.availability_status || 'Availability not set',
    expectedRate: profile?.expected_rate,
    bio: profile?.bio,
    languagePreference: profile?.language_preference || '',
  };
}

function mapStory(story) {
  const isWorkerStory = story.story_author_role === 'worker' || (!story.company_id && story.author_id);
  const label = story.story_author_name || story.company_name || story.full_name || 'Story';
  const avatar = story.story_author_avatar || story.logo || story.profile_photo;
  return {
    id: story.id,
    companyId: story.company_id,
    authorId: story.author_id || story.company_id,
    authorRole: isWorkerStory ? 'worker' : 'company',
    label,
    type: isWorkerStory ? 'worker' : 'company',
    content: getInitials(label).slice(0, 1),
    logo: avatar,
    mediaUrl: story.media_url,
    caption: story.caption || 'Company story',
    createdAt: story.created_at,
    time: timeAgo(story.created_at),
    expiresAt: story.expires_at,
    active: true,
  };
}

function groupStories(stories = []) {
  const groups = new Map();
  stories
    .map(mapStory)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .forEach((story) => {
      const key = `${story.authorRole}:${story.authorId || story.companyId || story.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          companyId: story.companyId,
          label: story.label,
          type: story.type,
          content: story.content,
          logo: story.logo,
          active: story.active,
          stories: [],
        });
      }
      groups.get(key).stories.push(story);
    });

  return Array.from(groups.values());
}

function mapPinnedCompany(company) {
  const name = company.company_name || company.name || 'Company';
  return {
    id: company.following_id || company.user_id || company.id,
    initial: getInitials(name).slice(0, 1),
    name,
    detail: company.role === 'company' ? 'Following company' : 'Following',
  };
}

function mapJob(job, index = 0, appliedJobIds = new Set()) {
  const postedByName = job.created_by_name || job.company_name || 'Company';
  const postedByRole = job.created_by_role || 'company';
  const postedById = job.created_by_id || job.company_id;
  return {
    id: job.id,
    companyId: job.company_id,
    createdAt: job.created_at,
    hasApplied: appliedJobIds.has(Number(job.id)),
    type: 'job',
    company: job.company_name || 'Company',
    initial: getInitials(job.company_name || 'C').slice(0, 1),
    logo: job.logo,
    location: job.city || job.postcode || 'Remote',
    time: timeAgo(job.created_at),
    postedBy: {
      id: postedById,
      name: postedByName,
      url: postedByRole === 'worker' ? `/workers/${postedById}/profile` : `/companies/${postedById}`,
    },
    badge: job.status === 'open' ? 'Open' : 'Closed',
    title: job.title,
    description: job.description,
    meta: [job.rate, job.city || job.postcode || null, job.start_date ? `Starts ${new Date(job.start_date).toLocaleDateString('en-GB')}` : null, job.duration, `${job.workers_required || 1} worker${job.workers_required === 1 ? '' : 's'}`].filter(Boolean),
    theme: index % 2 === 0 ? 'apex' : 'north',
  };
}

function formatRate(value, suffix) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return `£${numeric % 1 === 0 ? numeric.toFixed(0) : numeric.toFixed(2)} ${suffix}`;
}

function getFirstMediaUrl(mediaUrls) {
  if (Array.isArray(mediaUrls)) return mediaUrls[0] || null;
  if (typeof mediaUrls === 'string') {
    try {
      const parsed = JSON.parse(mediaUrls);
      return Array.isArray(parsed) ? parsed[0] || null : mediaUrls;
    } catch (error) {
      return mediaUrls;
    }
  }
  return null;
}

function getPublicAssetUrl(mediaUrl) {
  if (!mediaUrl) return null;
  let assetPath = mediaUrl;
  if (/^https?:\/\//i.test(mediaUrl)) {
    try {
      assetPath = new URL(mediaUrl).pathname;
    } catch (error) {
      return mediaUrl;
    }
  }
  return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
}

app.locals.assetPath = getPublicAssetUrl;

function getApiAssetUrl(mediaUrl) {
  const publicPath = getPublicAssetUrl(mediaUrl);
  if (!publicPath) return null;
  if (/^https?:\/\//i.test(publicPath)) return publicPath;
  return `${PUBLIC_URL}${publicPath}`;
}

function getDailyRateInsightDate() {
  const now = new Date();
  const dailyCreatedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  return {
    date: dailyCreatedAt.toISOString().slice(0, 10),
    createdAt: dailyCreatedAt.toISOString(),
    displayDate: dailyCreatedAt.toLocaleDateString('en-GB'),
  };
}

function buildDailyRateInsight(rates = [], feedback = {}) {
  const visibleRates = rates
    .map((rate) => ({
      trade: rate.trade_name,
      hourly: formatRate(rate.hourly_rate, 'per h'),
      day: formatRate(rate.day_rate, 'per day'),
      sqm: formatRate(rate.sqm_rate, 'per m2'),
    }))
    .filter((rate) => rate.hourly || rate.day || rate.sqm);

  if (!visibleRates.length) return null;

  const daily = getDailyRateInsightDate();
  return {
    id: `daily-rate-${daily.date}`,
    type: 'rateInsight',
    insightDate: daily.date,
    createdAt: daily.createdAt,
    author: 'SiteCrew Market Rates',
    initials: 'SC',
    subtitle: `Daily average rates · ${daily.displayDate}`,
    title: 'Average rates for your trade interests',
    caption: 'These are indicative market averages for the trades you selected in My trade interest.',
    rates: visibleRates,
    feedback: {
      upCount: Number(feedback.upCount || feedback.up_count || 0),
      downCount: Number(feedback.downCount || feedback.down_count || 0),
      userVote: feedback.userVote || feedback.user_vote || null,
    },
  };
}

function mapFeedPost(post, index = 0) {
  const isCompany = post.author_role === 'company';
  const author = post.author_name || (isCompany ? 'Company' : 'Worker');
  const postedByName = post.created_by_name || author;
  const postedByRole = post.created_by_role || post.author_role;
  const postedById = post.created_by_id || post.author_id;
  const mediaUrl = getPublicAssetUrl(getFirstMediaUrl(post.media_urls));
  const mediaType = mediaUrl && /\.(mp4|webm|mov|m4v)$/i.test(mediaUrl) ? 'video' : 'image';
  return {
    id: post.id,
    companyId: isCompany ? post.author_id : null,
    authorId: post.author_id,
    createdAt: post.created_at,
    type: isCompany ? 'companyPost' : 'post',
    author,
    initials: getInitials(author),
    subtitle: `${isCompany ? 'Company update' : 'Worker post'} · ${post.location || 'SiteCrew'} · ${timeAgo(post.created_at)}`,
    postedBy: {
      id: postedById,
      name: postedByName,
      url: postedByRole === 'worker' ? `/workers/${postedById}/profile` : `/companies/${postedById}`,
    },
    title: post.title || (isCompany ? 'Company update' : 'Work update'),
    mediaUrl,
    mediaSrc: mediaUrl,
    mediaType,
    mediaClass: ['media-site-1', 'media-site-2', 'media-progress', 'media-cert'][index % 4],
    video: false,
    caption: post.caption,
    tags: (post.tags || []).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
    likeCount: Number(post.like_count || 0),
    commentCount: Number(post.comment_count || 0),
    likedByMe: Boolean(post.liked_by_me),
    savedByMe: Boolean(post.saved_by_me),
    authorVerified: post.author_verification_status === 'approved',
    comments: [],
  };
}

function mapProfilePost(post, index = 0) {
  const mediaUrl = getPublicAssetUrl(getFirstMediaUrl(post.media_urls));
  const mediaType = mediaUrl && /\.(mp4|webm|mov|m4v)$/i.test(mediaUrl) ? 'video' : 'image';
  return {
    id: post.id,
    title: post.title || (post.post_type ? post.post_type.replaceAll('_', ' ') : 'Work update'),
    location: post.location || 'SiteCrew',
    date: timeAgo(post.created_at),
    mediaClass: ['media-site-1', 'media-site-2', 'media-progress', 'media-cert'][index % 4],
    mediaUrl,
    mediaSrc: mediaUrl,
    mediaType,
    caption: post.posted_for_company ? `${post.caption} · for ${post.posted_for_company}` : post.caption,
    tags: (post.tags || []).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
  };
}

function mapSavedPost(post, index = 0) {
  const mediaUrl = getPublicAssetUrl(getFirstMediaUrl(post.media_urls));
  const mediaType = mediaUrl && /\.(mp4|webm|mov|m4v)$/i.test(mediaUrl) ? 'video' : 'image';
  const isCompany = post.author_role === 'company';
  const author = post.author_name || (isCompany ? 'Company' : 'Worker');
  return {
    id: post.id,
    author,
    authorUrl: isCompany ? `/companies/${post.author_id}` : `/workers/${post.author_id}/profile`,
    title: post.title || (post.post_type ? post.post_type.replaceAll('_', ' ') : 'Work update'),
    location: post.location || 'SiteCrew',
    date: timeAgo(post.created_at),
    savedAt: timeAgo(post.saved_at),
    mediaClass: ['media-site-1', 'media-site-2', 'media-progress', 'media-cert'][index % 4],
    mediaUrl,
    mediaSrc: mediaUrl,
    mediaType,
    caption: post.caption,
    tags: (post.tags || []).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
  };
}

function mapCompanyRow(company) {
  const name = company.company_name || company.full_name || company.name || 'SiteCrew member';
  const role = company.role || 'company';
  const id = company.following_id || company.follower_id || company.id || company.user_id;
  return {
    id,
    role,
    initial: getInitials(name).slice(0, 1),
    name,
    avatar: company.logo || company.profile_photo || company.avatar || null,
    url: role === 'worker' ? `/workers/${id}/profile` : `/companies/${id}`,
    detail: role === 'company' ? 'Company profile' : 'Worker profile',
  };
}

function formatCompany(profile) {
  const name = profile?.company_name || 'SiteCrew Company';

  return {
    name,
    initials: getInitials(name),
    logo: profile?.logo,
    location: profile?.head_office || profile?.city || profile?.postcode || 'Location not set',
    headOffice: profile?.head_office || '',
    businessType: profile?.business_type || '',
    trades: Array.isArray(profile?.trades) ? profile.trades : [],
    email: profile?.email || '',
    phone: profile?.phone || '',
    website: profile?.website || '',
    city: profile?.city || '',
    postcode: profile?.postcode || '',
    verified: profile?.verification_status === 'approved',
    rating: 'No rating yet',
    plan: profile?.plan || 'free',
    description: profile?.description || 'Company profile pending.',
  };
}

function mapCompanyReview(review) {
  const name = review.full_name || 'SiteCrew worker';
  return {
    id: review.id,
    workerId: review.worker_id,
    workerName: name,
    workerInitials: getInitials(name),
    workerPhoto: review.profile_photo,
    workerTrade: Array.isArray(review.trades) && review.trades.length ? review.trades.join(', ') : 'Worker',
    rating: review.rating,
    feedback: review.feedback,
    date: review.updated_at || review.created_at,
  };
}

function mapCompanyJob(job) {
  return {
    id: job.id,
    title: job.title,
    location: job.city || job.postcode || 'Location not set',
    applicants: job.application_count || 0,
    status: job.status === 'open' ? 'Open' : 'Closed',
    trade: job.trade_required,
    rate: job.rate,
    city: job.city || '',
    postcode: job.postcode || '',
    description: job.description || '',
    experienceRequired: job.experience_required || '',
    certificatesRequired: Array.isArray(job.certificates_required) ? job.certificates_required.join(', ') : '',
    startDate: job.start_date ? new Date(job.start_date).toISOString().slice(0, 10) : '',
    duration: job.duration || '',
    workersRequired: job.workers_required || 1,
  };
}

function mapApplicant(application) {
  return {
    id: application.id,
    workerId: application.worker_id,
    name: application.full_name || 'Worker',
    profilePhoto: application.profile_photo,
    trade: Array.isArray(application.trades) && application.trades.length ? application.trades[0] : 'Trade not set',
    experience: application.experience || 'Experience not set',
    availability: application.availability_status || 'Availability not set',
    status: application.status || 'pending',
    jobTitle: application.job_title || 'Job application',
    rating: '4.8',
    match: application.match?.score || 0,
    savedContact: Boolean(application.saved_contact),
  };
}

function mapTeamMember(application) {
  const name = application.full_name || 'Worker';
  return {
    applicationId: application.id,
    id: application.worker_id,
    name,
    initial: getInitials(name).slice(0, 1),
    profilePhoto: application.profile_photo,
    trade: Array.isArray(application.trades) && application.trades.length ? application.trades.join(', ') : 'Trade not set',
    experience: application.experience || 'Experience not set',
    city: application.city || 'Location not set',
    availability: application.availability_status || 'Availability not set',
    jobTitle: application.job_title || 'Company job',
    certificates: Array.isArray(application.certificates) && application.certificates.length ? application.certificates.join(', ') : 'No certificates added',
    canPostJobs: Boolean(application.can_post_jobs),
    canPostCompanyPosts: Boolean(application.can_post_company_posts),
    isLeader: Boolean(application.can_post_jobs || application.can_post_company_posts),
  };
}

function mapRecommendedWorker(item) {
  const worker = item.worker || item;
  return {
    id: worker.user_id,
    name: worker.full_name || 'Worker',
    trade: Array.isArray(worker.trades) && worker.trades.length ? worker.trades.join(', ') : 'Trade not set',
    location: worker.city || worker.postcode || 'Location not set',
    availability: worker.availability_status || 'Availability not set',
    score: item.match?.score || 0,
  };
}

function mapCompanyFeedPost(post, index = 0) {
  const mediaUrl = getPublicAssetUrl(getFirstMediaUrl(post.media_urls));
  const mediaType = mediaUrl && /\.(mp4|webm|mov|m4v)$/i.test(mediaUrl) ? 'video' : 'image';
  return {
    id: post.id,
    title: post.title || (post.post_type ? post.post_type.replaceAll('_', ' ') : 'Company update'),
    caption: post.caption,
    location: post.location || 'SiteCrew',
    time: timeAgo(post.created_at),
    mediaClass: ['company-feed-site', 'company-feed-progress', 'company-feed-crew'][index % 3],
    mediaUrl,
    mediaSrc: mediaUrl,
    mediaType,
    tags: post.tags || [],
  };
}

function getUnreadMessageCount(conversations = []) {
  return conversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0);
}

async function buildCompanyDashboard(token, companyId, profile) {
  const [jobs, feed, notifications, conversations, companyPublicData] = await Promise.all([
    apiGet('/api/jobs?status=', token),
    apiGet('/api/feed', token),
    apiGet('/api/notifications', token),
    apiGet('/api/conversations', token),
    apiGet(`/api/companies/${companyId}`, token),
  ]);

  const ownJobsRaw = (jobs.jobs || []).filter((job) => Number(job.company_id) === Number(companyId));
  const ownJobsWithApplicants = await Promise.all(ownJobsRaw.map(async (job) => {
    try {
      const applications = await apiGet(`/api/jobs/${job.id}/applications`, token);
      const activeApplications = (applications.applications || []).filter((application) => application.status !== 'unhired');
      return { ...job, application_count: activeApplications.length, applications: activeApplications };
    } catch (error) {
      return { ...job, application_count: 0, applications: [] };
    }
  }));

  const firstOpenJob = ownJobsWithApplicants.find((job) => job.status === 'open') || ownJobsWithApplicants[0];
  let recommendedWorkers = [];
  if (firstOpenJob) {
    try {
      const matches = await apiGet(`/api/jobs/${firstOpenJob.id}/matches`, token);
      recommendedWorkers = (matches.matches || []).slice(0, 4).map(mapRecommendedWorker);
    } catch (error) {
      recommendedWorkers = [];
    }
  }

  const savedContacts = await apiGet('/api/companies/contacts', token).catch(() => ({ contacts: [] }));
  const savedContactWorkerIds = new Set((savedContacts.contacts || []).map((contact) => Number(contact.worker_id)));

  const applicants = ownJobsWithApplicants
    .flatMap((job) => (job.applications || []).map((application) => ({
      ...application,
      job_title: job.title,
      saved_contact: savedContactWorkerIds.has(Number(application.worker_id)),
    })))
    .filter((application) => !(application.saved_contact && application.status === 'rejected'))
    .map(mapApplicant)
    .sort((a, b) => a.jobTitle.localeCompare(b.jobTitle) || a.name.localeCompare(b.name));

  const teamByWorker = new Map();
  ownJobsWithApplicants
    .flatMap((job) => (job.applications || []).map((application) => ({
      ...application,
      job_title: job.title,
    })))
    .filter((application) => application.status === 'accepted')
    .forEach((application) => {
      if (!teamByWorker.has(application.worker_id)) {
        teamByWorker.set(application.worker_id, mapTeamMember(application));
      }
    });
  const teamMembers = Array.from(teamByWorker.values());

  const openJobs = ownJobsWithApplicants.filter((job) => job.status === 'open');
  const workersNeeded = openJobs.reduce((total, job) => total + (job.workers_required || 0), 0);
  const companyPosts = (feed.posts || [])
    .filter((post) => Number(post.author_id) === Number(companyId))
    .slice(0, 3)
    .map(mapCompanyFeedPost);
  const companyRatingCount = Number(companyPublicData.rating?.count || 0);
  const companyRatingAverage = companyPublicData.rating?.average || null;
  const notificationItems = notifications.notifications || [];
  const unreadNotifications = notificationItems.filter((item) => !item.read_at);

  return {
    company: {
      ...formatCompany(profile),
      rating: companyRatingCount ? `${companyRatingAverage} (${companyRatingCount})` : 'No rating yet',
    },
    jobs: ownJobsWithApplicants.map(mapCompanyJob),
    applicants,
    teamMembers,
    recommendedWorkers,
    companyPosts,
    companyReviews: (companyPublicData.reviews || []).slice(0, 4).map(mapCompanyReview),
    conversations: (conversations.conversations || []).slice(0, 3),
    notifications: unreadNotifications.slice(0, 6),
    insights: {
      activeJobs: openJobs.length,
      workersNeeded,
      responseRate: '85%',
    },
  };
}

async function buildWorkerDashboard(token, userId, profile) {
  const [feed, stories, jobs, applications, notifications, follows, conversations] = await Promise.all([
    apiGet('/api/feed', token),
    apiGet('/api/stories/companies', token),
    apiGet('/api/jobs', token),
    apiGet('/api/applications/me', token),
    apiGet('/api/notifications', token),
    apiGet('/api/follows/me', token),
    apiGet('/api/conversations', token),
  ]);

  const worker = formatWorker(profile);
  const quickJobs = (jobs.jobs || []).slice(0, 4).map((job) => ({
    title: job.title,
    detail: [job.city, job.rate].filter(Boolean).join(' · '),
  }));

  const followedUserIds = new Set(
    (follows.following || []).map((item) => Number(item.following_id))
  );
  followedUserIds.add(Number(userId));
  const followedCompanyIds = new Set(
    (follows.following || [])
      .filter((item) => item.role === 'company')
      .map((item) => Number(item.following_id))
  );
  const personalizedPosts = (feed.posts || []).filter((post) => {
    const authorId = Number(post.author_id);
    const creatorId = Number(post.created_by_id || post.author_id);
    return post.author_role === 'company' || followedUserIds.has(authorId) || followedUserIds.has(creatorId);
  });
  const appliedJobIds = new Set((applications.applications || []).map((application) => Number(application.job_id)));
  const acceptedApplication = (applications.applications || []).find((application) => application.status === 'accepted');
  worker.currentCompany = acceptedApplication?.company_name || null;
  worker.workingAt = worker.currentCompany ? `Working at ${worker.currentCompany}` : 'Self employed';
  const tradeInterests = Array.isArray(profile.trade_interests) ? profile.trade_interests : [];
  const interestedJobs = tradeInterests.length
    ? (jobs.jobs || []).filter((job) => tradeInterests.some((trade) =>
      String(job.trade_required || '').toLowerCase() === String(trade).toLowerCase()
    ))
    : (jobs.jobs || []);
  let dailyRateInsight = null;
  if (tradeInterests.length) {
    try {
      const daily = getDailyRateInsightDate();
      const rateSummary = await apiGet(`/api/jobs/trades/rates?names=${encodeURIComponent(tradeInterests.join(','))}`, token);
      let feedback = {};
      try {
        const rateFeedback = await apiGet(`/api/jobs/trades/rates/feedback?date=${daily.date}`, token);
        feedback = rateFeedback.feedback || {};
      } catch (error) {
        feedback = {};
      }
      dailyRateInsight = buildDailyRateInsight(rateSummary.rates || [], feedback);
    } catch (error) {
      dailyRateInsight = null;
    }
  }

  let pinnedAds = [];
  let regularAds = [];
  try {
    const marketplaceFeed = await apiGet('/api/marketplace/ads/feed', token);
    pinnedAds = marketplaceFeed.pinnedAds || [];
    regularAds = marketplaceFeed.regularAds || [];
  } catch (error) {
    pinnedAds = [];
    regularAds = [];
  }

  const chronologicalFeedItems = [
    ...(dailyRateInsight ? [dailyRateInsight] : []),
    ...pinnedAds,
    ...[
      ...interestedJobs.map((job, index) => mapJob(job, index, appliedJobIds)),
      ...personalizedPosts.map(mapFeedPost),
      ...regularAds,
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  ];

  const followedCompanyStories = (stories.stories || []).filter((story) =>
    followedCompanyIds.has(Number(story.company_id)) || followedUserIds.has(Number(story.author_id))
  );

  return {
    isPublicProfile: false,
    topbarWorker: worker,
    worker,
    counts: {
      notifications: (notifications.notifications || []).filter((item) => !item.read_at).length,
      messages: getUnreadMessageCount(conversations.conversations || []),
    },
    stories: groupStories(followedCompanyStories),
    pinnedCompanies: (follows.following || []).filter((item) => item.role === 'company').map(mapPinnedCompany),
    feedItems: chronologicalFeedItems,
    notifications: notifications.notifications || [],
    quickJobs,
    tradeInterests,
  };
}

async function buildWorkerProfile(token, userId, profile) {
  const [profileActivity, follows, notifications, conversations, savedFeed] = await Promise.all([
    apiGet(`/api/workers/${userId}/profile`, token),
    apiGet('/api/follows/me', token),
    apiGet('/api/notifications', token),
    apiGet('/api/conversations', token),
    apiGet('/api/feed/saved', token).catch(() => ({ posts: [] })),
  ]);

  const worker = formatWorker(profile);
  worker.averageRating = profileActivity.rating?.average;
  worker.reviewCount = profileActivity.rating?.count || 0;
  const tradeInterests = Array.isArray(profile.trade_interests) ? profile.trade_interests : [];

  return {
    isPublicProfile: false,
    topbarWorker: worker,
    worker,
    tradeInterests,
    counts: {
      notifications: (notifications.notifications || []).filter((item) => !item.read_at).length,
      messages: getUnreadMessageCount(conversations.conversations || []),
    },
    posts: (profileActivity.posts || []).map(mapProfilePost),
    savedPosts: (savedFeed.posts || []).map(mapSavedPost),
    reviews: profileActivity.reviews || [],
    followingCompanies: (follows.following || []).map(mapCompanyRow),
    followerCompanies: (profileActivity.followers || []).map(mapCompanyRow),
  };
}

async function buildPublicWorkerProfile(token, viewedWorkerId, sessionProfile) {
  const [profileActivity, follows, notifications, conversations] = await Promise.all([
    apiGet(`/api/workers/${viewedWorkerId}/profile`, token),
    apiGet('/api/follows/me', token),
    apiGet('/api/notifications', token),
    apiGet('/api/conversations', token),
  ]);

  const worker = formatWorker(profileActivity.profile);
  worker.id = Number(viewedWorkerId);
  worker.averageRating = profileActivity.rating?.average;
  worker.reviewCount = profileActivity.rating?.count || 0;
  worker.currentCompany = profileActivity.currentCompany?.company_name || null;
  worker.workingAt = worker.currentCompany ? `Working at ${worker.currentCompany}` : 'Self employed';
  worker.isFollowing = (follows.following || []).some((item) => Number(item.following_id) === Number(viewedWorkerId));

  return {
    isPublicProfile: true,
    topbarWorker: formatWorker(sessionProfile),
    worker,
    counts: {
      notifications: (notifications.notifications || []).filter((item) => !item.read_at).length,
      messages: getUnreadMessageCount(conversations.conversations || []),
    },
    posts: (profileActivity.posts || []).map(mapProfilePost),
    reviews: profileActivity.reviews || [],
    followingCompanies: (profileActivity.following || []).map(mapCompanyRow),
    followerCompanies: (profileActivity.followers || []).map(mapCompanyRow),
  };
}

async function buildPublicCompanyProfile(token, companyId) {
  const [companyData, follows, stories] = await Promise.all([
    apiGet(`/api/companies/${companyId}`, token),
    apiGet('/api/follows/me', token),
    apiGet('/api/stories/companies', token),
  ]);

  const companyProfile = companyData.profile;
  const company = formatCompany(companyProfile);
  const isFollowing = (follows.following || []).some((item) => Number(item.following_id) === Number(companyId));
  const companyStories = (stories.stories || []).filter((story) => Number(story.company_id) === Number(companyId));
  const ratingAverage = companyData.rating?.average;
  const ratingCount = Number(companyData.rating?.count || 0);

  return {
    company: {
      ...company,
      id: Number(companyId),
      description: companyProfile.description || company.description,
      website: companyProfile.website,
      phone: companyProfile.phone,
      verificationStatus: companyProfile.verification_status,
      rating: ratingCount ? `${ratingAverage} (${ratingCount} review${ratingCount === 1 ? '' : 's'})` : 'No rating yet',
      ratingAverage: ratingAverage || null,
      ratingCount,
    },
    jobs: (companyData.jobs || []).filter((job) => job.status === 'open').map(mapCompanyJob),
    reviews: (companyData.reviews || []).map(mapCompanyReview),
    stories: companyStories,
    isFollowing,
  };
}

async function fetchAllPublicOpenJobs() {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/jobs?status=open`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.jobs || []).map(mapPublicJobCard);
  } catch (error) {
    return [];
  }
}

async function fetchPublicOpenJobs(limit = 6) {
  const jobs = await fetchAllPublicOpenJobs();
  return jobs.slice(0, limit);
}

async function fetchPlatformStats() {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/market/platform-stats`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    return null;
  }
}

async function fetchPublicJobById(jobId) {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/jobs/${jobId}`);
    if (!response.ok) return null;
    const data = await response.json();
    const job = data.job;
    if (!job || job.status !== 'open') return null;
    if (job.moderation_status && job.moderation_status !== 'visible') return null;
    return mapPublicJobDetail(job);
  } catch (error) {
    return null;
  }
}

function buildHeroStats(stats) {
  if (!stats) {
    return {
      badge: 'UK construction recruitment platform',
      workers: null,
      companies: null,
      thirdLabel: 'Direct hiring',
      thirdValue: 'No agencies',
    };
  }

  return {
    badge: stats.openJobs > 0
      ? `${stats.openJobs} open job${stats.openJobs === 1 ? '' : 's'} live now`
      : 'UK construction jobs updated daily',
    workers: stats.activeWorkers > 0 ? `${stats.activeWorkers.toLocaleString('en-GB')}+` : null,
    companies: stats.activeCompanies > 0 ? `${stats.activeCompanies.toLocaleString('en-GB')}+` : null,
    thirdLabel: 'Open roles',
    thirdValue: stats.openJobs > 0 ? `${stats.openJobs.toLocaleString('en-GB')}+` : 'Updated daily',
  };
}

function buildLoginSeo(req) {
  const mode = req.query.mode === 'register' ? 'register' : 'login';
  const role = req.query.role === 'company' ? 'company' : req.query.role === 'worker' ? 'worker' : null;

  if (mode === 'register' && role === 'worker') {
    return buildSeo({
      path: '/login',
      title: 'Register as a Construction Worker | SiteCrew',
      description: 'Create a free SiteCrew worker account, set your trades and availability, and apply to open construction jobs across the UK.',
    });
  }

  if (mode === 'register' && role === 'company') {
    return buildSeo({
      path: '/login',
      title: 'Register as a Hiring Company | SiteCrew',
      description: 'Create a SiteCrew company account to post construction jobs, invite workers, and hire verified tradespeople directly.',
    });
  }

  if (mode === 'register') {
    return buildSeo({
      path: '/login',
      title: 'Create Your SiteCrew Account',
      description: 'Register on SiteCrew as a construction worker or hiring company in the UK.',
    });
  }

  return buildSeo({
    path: '/login',
    title: 'Sign in to SiteCrew',
    description: 'Sign in to your SiteCrew worker or company account to manage jobs, applications, and messages.',
  });
}

app.get('/', async (req, res) => {
  try {
    const session = await getSessionFromRequest(req);

    if (session?.user?.role === 'worker') {
      return res.redirect('/worker/dashboard');
    }
    if (session?.user?.role === 'company') {
      return res.redirect('/company/dashboard');
    }
  } catch (error) {
    // If the API is unavailable or the token is invalid, fall back to the UX-only returning user check.
  }

  const cookies = parseCookies(req.headers.cookie);
  if (cookies.sitecrewReturningUser === '1') {
    return res.redirect('/login');
  }

  const [featuredJobs, platformStats] = await Promise.all([
    fetchPublicOpenJobs(6),
    fetchPlatformStats(),
  ]);

  return res.render('index', {
    seo: buildSeo({
      path: '/',
      title: 'SiteCrew — Find Construction Jobs & Hire Tradespeople in the UK',
      description: 'Connect with verified construction workers and companies across the UK. Post jobs, apply in minutes, and hire tradespeople directly — no agencies.',
      jsonLd: getHomePageJsonLd(),
    }),
    faqItems: getHomeFaqItems(),
    featuredJobs,
    featuredJob: featuredJobs[0] || null,
    heroStats: buildHeroStats(platformStats),
  });
});

app.get('/jobs', async (req, res) => {
  const jobs = await fetchAllPublicOpenJobs();

  return res.render('jobs/list', {
    seo: buildSeo({
      path: '/jobs',
      title: 'Construction Jobs in the UK | SiteCrew',
      description: 'Browse open construction jobs posted by verified UK companies on SiteCrew. Apply directly as a worker or post your own roles as a company.',
    }),
    jobs,
  });
});

app.get('/jobs/:id', async (req, res) => {
  const job = await fetchPublicJobById(req.params.id);
  if (!job) {
    return res.redirect('/jobs');
  }

  const jobPath = `/jobs/${job.id}`;
  return res.render('jobs/detail', {
    seo: buildSeo({
      path: jobPath,
      title: `${job.title} in ${job.location} | SiteCrew`,
      description: `${job.trade} role at ${job.companyName} in ${job.location}. ${job.rate}. Apply on SiteCrew.`,
      jsonLd: getJobPostingSchema(
        {
          title: job.title,
          description: job.description,
          created_at: job.createdAt,
          start_date: job.startDate,
          company_name: job.companyName,
          city: job.location,
          rate: job.rate,
        },
        buildSeo({ path: jobPath }).canonical
      ),
    }),
    job,
  });
});

app.get('/terms', (req, res) => {
  res.render('legal/terms', {
    seo: buildSeo({
      path: '/terms',
      title: 'Terms of Service | SiteCrew',
      description: 'Read the SiteCrew Terms of Service for workers and companies using our UK construction recruitment platform.',
    }),
  });
});

app.get('/privacy', (req, res) => {
  res.render('legal/privacy', {
    seo: buildSeo({
      path: '/privacy',
      title: 'Privacy Policy | SiteCrew',
      description: 'Learn how SiteCrew collects, uses, and protects personal data under UK GDPR.',
    }),
  });
});

app.get('/contact', (req, res) => {
  res.render('legal/contact', {
    seo: buildSeo({
      path: '/contact',
      title: 'Contact SiteCrew',
      description: 'Contact SiteCrew for support with worker accounts, company plans, privacy questions, and platform help.',
    }),
    contactEmail: CONTACT_EMAIL,
  });
});

app.get('/auth/restore', (req, res) => {
  res.render('auth/restore', {
    returnPath: getSafeReturnPath(req.query.return),
  });
});

app.get('/login', async (req, res) => {
  try {
    const session = await getSessionFromRequest(req);

    if (session?.user?.role === 'worker') {
      return res.redirect('/worker/dashboard');
    }
    if (session?.user?.role === 'company') {
      return res.redirect('/company/dashboard');
    }
  } catch (error) {
    // Invalid/expired sessions should still allow the user to sign in again.
  }

  return res.render('auth/login', {
    seo: buildLoginSeo(req),
  });
});

app.get('/worker/dashboard', requireWorkerAuth, async (req, res) => {
  try {
    const dashboard = await buildWorkerDashboard(req.authToken, req.sessionUser.id, req.sessionProfile);
    res.render('worker/dashboard', {
      title: 'Worker Dashboard',
      dashboard,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/worker/dashboard');
  }
});

app.get('/worker/profile', requireWorkerAuth, async (req, res) => {
  try {
    const profile = await buildWorkerProfile(req.authToken, req.sessionUser.id, req.sessionProfile);
    res.render('worker/profile', {
      title: 'Worker Profile',
      profile,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/worker/dashboard');
  }
});

app.get('/workers/:id/profile', requireWorkerAuth, async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.sessionUser.id)) {
      return res.redirect('/worker/profile');
    }

    const profile = await buildPublicWorkerProfile(req.authToken, req.params.id, req.sessionProfile);
    return res.render('worker/profile', {
      title: `${profile.worker.name} Profile`,
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.redirect('/worker/dashboard');
  }
});

app.get('/companies/:id', requireWorkerAuth, async (req, res) => {
  try {
    const profile = await buildPublicCompanyProfile(req.authToken, req.params.id);
    profile.workerLanguagePreference = req.sessionProfile?.language_preference || '';
    res.render('company/public-profile', {
      title: profile.company.name,
      profile,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/worker/dashboard');
  }
});

app.get('/company/dashboard', requireCompanyAuth, async (req, res) => {
  try {
    const dashboard = await buildCompanyDashboard(req.authToken, req.sessionUser.id, {
      ...req.sessionProfile,
      email: req.sessionUser.email,
    });
    res.render('company/dashboard', {
      title: 'Company Dashboard',
      dashboard,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.get('/admin/login', async (req, res) => {
  try {
    const session = await getAdminSessionFromRequest(req);
    if (session) {
      return res.redirect('/admin/dashboard');
    }
  } catch (error) {
    // Allow login form when session is invalid.
  }

  return res.render('admin/login', { title: 'Admin Login' });
});

app.get('/admin/dashboard', requireAdminAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Panel',
    admin: {
      email: req.sessionUser.email,
      role: req.sessionUser.role,
    },
  });
});

app.get('/__sitecrew/deploy-check', async (req, res) => {
  const uploadsDir = path.join(__dirname, 'backend', 'uploads');
  let uploadFiles = [];
  try {
    uploadFiles = fs.readdirSync(uploadsDir).filter((file) => !file.startsWith('.'));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message, uploadsDir });
  }

  let sampleMedia = null;
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/feed`);
    const payload = await response.json();
    const firstWithMedia = (payload.posts || []).find((post) => Array.isArray(post.media_urls) && post.media_urls.length);
    if (firstWithMedia) {
      const mediaPath = getPublicAssetUrl(firstWithMedia.media_urls[0]);
      const absolutePath = path.join(__dirname, 'backend', mediaPath.replace(/^\//, ''));
      sampleMedia = {
        postId: firstWithMedia.id,
        mediaPath,
        fileExists: fs.existsSync(absolutePath),
      };
    }
  } catch (error) {
    sampleMedia = { error: error.message };
  }

  res.json({
    ok: true,
    apiBaseUrl: PUBLIC_URL,
    adminPublicUrl: ADMIN_PUBLIC_URL,
    uploadsDir,
    uploadCount: uploadFiles.length,
    sampleUploadFile: uploadFiles[0] || null,
    sampleMedia,
    servesUploads: true,
  });
});

app.listen(PORT, () => {
  console.log(`SiteCrew running: http://localhost:${PORT}`);
});
