const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const asyncHandler = require('../../utils/asyncHandler');
const { enqueueUploadedFile } = require('../../utils/mediaReviewQueue');
const {
  evaluateContent,
  logContentScan,
  buildReviewScanText,
  getRecentCompanyReviewTexts,
} = require('../../utils/contentModeration');
const { OPEN_WORKER_APPLYABLE_JOB_FILTER, OPEN_WORKER_APPLYABLE_JOB_FILTER_J } = require('../../utils/jobVisibility');

const VISIBLE_REVIEW_FILTER = `COALESCE(moderation_status, 'visible') <> 'hidden'`;
const VISIBLE_JOB_FILTER = OPEN_WORKER_APPLYABLE_JOB_FILTER_J;

const router = express.Router();

const updateCompanySchema = z.object({
  body: z.object({
    companyName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    logo: z.string().optional(),
    description: z.string().optional(),
    website: z.string().url().optional(),
    headOffice: z.string().optional(),
    businessType: z.string().optional(),
    trades: z.array(z.string()).optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
  }),
});

const contactSchema = z.object({
  body: z.object({
    workerId: z.number().int().positive(),
    applicationId: z.number().int().positive().optional(),
  }),
});

const companyReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    feedback: z.string().max(1000).optional(),
  }),
});

const tradeSynonymGroups = [
  ['dryliner', 'drylining', 'dry liner', 'dry lining', 'partition fixer', 'partitioning'],
  ['plasterer', 'plastering', 'skim', 'skimmer', 'renderer', 'rendering'],
  ['carpenter', 'carpentry', 'chippy', 'joiner', 'joinery', '1st fix', '2nd fix'],
  ['electrician', 'electrical', 'spark', 'sparky', 'ecs', 'mate electrician'],
  ['plumber', 'plumbing', 'pipefitter', 'pipe fitter', 'mechanical'],
  ['bricklayer', 'bricklaying', 'bricky', 'mason', 'masonry'],
  ['roofer', 'roofing', 'flat roofer', 'slater', 'tiler roofer'],
  ['groundworker', 'groundworks', 'civil', 'civils', 'drainage', 'kerbing'],
  ['painter', 'painting', 'decorator', 'decorating', 'painter decorator'],
  ['flooring', 'floor layer', 'floorlayer', 'vinyl', 'carpet fitter', 'tiler'],
  ['forklift driver', 'fork lift driver', 'flt driver', 'telehandler', 'plant operator', 'machine operator'],
  ['site security', 'security guard', 'gate man', 'gateman', 'traffic marshal', 'banksman'],
  ['labourer', 'laborer', 'general operative', 'site operative', 'operative'],
  ['site manager', 'manager assistant', 'assistant manager', 'supervisor', 'foreman'],
];

function normalizeSearchValue(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a = '', b = '') {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function fuzzyScore(query, values = []) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return 0;

  return values.reduce((bestScore, value) => {
    const normalizedValue = normalizeSearchValue(value);
    if (!normalizedValue) return bestScore;
    if (normalizedValue === normalizedQuery) return Math.max(bestScore, 100);
    if (normalizedValue.startsWith(normalizedQuery)) return Math.max(bestScore, 88);
    if (normalizedValue.includes(normalizedQuery)) return Math.max(bestScore, 74);

    const tokens = normalizedValue.split(' ');
    const tokenScore = tokens.reduce((bestTokenScore, token) => {
      const distance = levenshteinDistance(normalizedQuery, token);
      const maxLength = Math.max(normalizedQuery.length, token.length);
      const similarity = maxLength ? 1 - distance / maxLength : 0;
      return Math.max(bestTokenScore, similarity >= 0.72 ? Math.round(similarity * 64) : 0);
    }, 0);

    return Math.max(bestScore, tokenScore);
  }, 0);
}

function expandTradeTerms(trade = '') {
  const normalizedTrade = normalizeSearchValue(trade);
  if (!normalizedTrade) return [];

  const terms = new Set([normalizedTrade]);
  tradeSynonymGroups.forEach((group) => {
    if (group.some((term) => normalizeSearchValue(term) === normalizedTrade || normalizeSearchValue(term).includes(normalizedTrade) || normalizedTrade.includes(normalizeSearchValue(term)))) {
      group.forEach((term) => terms.add(normalizeSearchValue(term)));
    }
  });

  return Array.from(terms);
}

function parseSearchList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreCompanySearch(company, filters) {
  const companyScore = filters.companyName
    ? fuzzyScore(filters.companyName, [company.company_name])
    : 0;
  const locationScore = filters.location
    ? fuzzyScore(filters.location, [
        company.city,
        company.postcode,
        company.head_office,
        ...(company.open_job_cities || []),
        ...(company.open_job_postcodes || []),
      ])
    : 0;
  const tradeTerms = filters.tradeTerms || [];
  const tradeValues = [
    ...(company.trades || []),
    ...(company.open_job_trades || []),
    ...(company.open_job_titles || []),
  ];
  const tradeScore = filters.tradeTerms.length
    ? Math.max(...tradeTerms.map((term) => fuzzyScore(term, tradeValues)))
    : 0;

  const matchesCompany = !filters.companyName || companyScore >= 45;
  const matchesLocation = !filters.location || locationScore >= 45;
  const matchesTrade = !filters.tradeTerms.length || tradeScore >= 45;

  return {
    matches: matchesCompany && matchesLocation && matchesTrade,
    score: (tradeScore * 1.8) + (locationScore * 1.25) + (companyScore * 0.8) + (Number(company.open_job_count || 0) * 4),
    match: {
      companyName: companyScore,
      location: locationScore,
      trade: tradeScore,
    },
  };
}

function filterRelevantOpenJobs(company, filters) {
  const openJobs = Array.isArray(company.open_jobs) ? company.open_jobs : [];
  if (!filters.tradeTerms?.length) return openJobs;

  return openJobs
    .map((job) => {
      const score = Math.max(...filters.tradeTerms.map((term) => fuzzyScore(term, [
        job.tradeRequired,
        job.title,
        job.description,
      ])));
      return { ...job, matchScore: score };
    })
    .filter((job) => job.matchScore >= 45)
    .sort((a, b) => b.matchScore - a.matchScore);
}

router.get('/me', requireAuth, requireRole('company'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT cp.*, u.email
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1`,
    [req.user.id]
  );
  res.json({ profile: result.rows[0] || null });
}));

router.patch('/me', requireAuth, requireRole('company'), validate(updateCompanySchema), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (payload.email) {
      await client.query(
        `UPDATE users
         SET email = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [req.user.id, payload.email]
      );
    }

    const result = await client.query(
      `UPDATE company_profiles SET
        company_name = COALESCE($2, company_name),
        phone = COALESCE($3, phone),
        logo = COALESCE($4, logo),
        description = COALESCE($5, description),
        website = COALESCE($6, website),
        head_office = COALESCE($7, head_office),
        business_type = COALESCE($8, business_type),
        trades = COALESCE($9, trades),
        city = COALESCE($10, city),
        postcode = COALESCE($11, postcode),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [
        req.user.id,
        payload.companyName || null,
        payload.phone || null,
        payload.logo || null,
        payload.description || null,
        payload.website || null,
        payload.headOffice || null,
        payload.businessType || null,
        payload.trades || null,
        payload.city || null,
        payload.postcode || null,
      ]
    );

    const user = await client.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    await client.query('COMMIT');
    res.json({ profile: { ...result.rows[0], email: user.rows[0]?.email } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

router.post('/me/logo', requireAuth, requireRole('company'), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Company logo is required' });
  }

  const logo = await enqueueUploadedFile(req.file);
  const result = await pool.query(
    `UPDATE company_profiles
     SET logo = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [req.user.id, logo]
  );

  res.status(201).json({ profile: result.rows[0], logo });
}));

router.post('/contacts', requireAuth, requireRole('company'), validate(contactSchema), asyncHandler(async (req, res) => {
  const { workerId, applicationId } = req.validated.body;

  const worker = await pool.query(
    `SELECT user_id FROM worker_profiles WHERE user_id = $1`,
    [workerId]
  );

  if (worker.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  if (applicationId) {
    const application = await pool.query(
      `SELECT 1
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1
         AND a.worker_id = $2
         AND j.company_id = $3`,
      [applicationId, workerId, req.user.id]
    );

    if (application.rowCount === 0) {
      return res.status(403).json({ error: 'Application does not belong to this company.' });
    }
  }

  const result = await pool.query(
    `INSERT INTO company_contacts (company_id, worker_id, source_application_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (company_id, worker_id) DO UPDATE SET
       source_application_id = COALESCE(company_contacts.source_application_id, EXCLUDED.source_application_id)
     RETURNING *`,
    [req.user.id, workerId, applicationId || null]
  );

  res.status(201).json({ contact: result.rows[0], saved: true });
}));

router.get('/contacts', requireAuth, requireRole('company'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       cc.*,
       cc.created_at AS saved_at,
       wp.full_name,
       wp.phone,
       wp.profile_photo,
       wp.trades,
       wp.city,
       wp.postcode,
       wp.availability_status,
       j.title AS source_job_title,
       u.email AS worker_email
     FROM company_contacts cc
     JOIN worker_profiles wp ON wp.user_id = cc.worker_id
     JOIN users u ON u.id = cc.worker_id
     LEFT JOIN applications a ON a.id = cc.source_application_id
     LEFT JOIN jobs j ON j.id = a.job_id
     WHERE cc.company_id = $1
     ORDER BY cc.created_at DESC`,
    [req.user.id]
  );

  res.json({ contacts: result.rows });
}));

router.delete('/contacts/:workerId', requireAuth, requireRole('company'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `DELETE FROM company_contacts
     WHERE company_id = $1 AND worker_id = $2
     RETURNING *`,
    [req.user.id, req.params.workerId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({ deleted: true, contact: result.rows[0] });
}));

router.get('/', requireAuth, requireRole('worker', 'company', 'admin'), asyncHandler(async (req, res) => {
  const {
    companyName = '',
    location = '',
    trade = '',
    tradeInterests = '',
    vacancies = 'all',
    offset = '0',
    limit = '20',
  } = req.query;
  const showOnlyVacancies = vacancies === 'open';
  const pageOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const pageLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));

  const filters = {
    companyName: String(companyName).trim(),
    location: String(location).trim(),
    trade: String(trade).trim(),
  };
  const tradeQueries = filters.trade ? [filters.trade] : parseSearchList(tradeInterests);
  filters.tradeTerms = [...new Set(tradeQueries.flatMap(expandTradeTerms))];
  const hasFilters = Boolean(filters.companyName || filters.location || filters.tradeTerms.length);

  const result = await pool.query(
    `SELECT
       cp.*,
       u.email,
       COUNT(j.id) FILTER (WHERE ${VISIBLE_JOB_FILTER})::int AS open_job_count,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT j.trade_required) FILTER (WHERE ${VISIBLE_JOB_FILTER}), NULL) AS open_job_trades,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT j.title) FILTER (WHERE ${VISIBLE_JOB_FILTER}), NULL) AS open_job_titles,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT j.city) FILTER (WHERE ${VISIBLE_JOB_FILTER}), NULL) AS open_job_cities,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT j.postcode) FILTER (WHERE ${VISIBLE_JOB_FILTER}), NULL) AS open_job_postcodes,
       COALESCE(
         JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
           'id', j.id,
           'title', j.title,
           'description', j.description,
           'tradeRequired', j.trade_required,
           'city', j.city,
           'postcode', j.postcode,
           'rate', j.rate,
           'startDate', j.start_date,
           'duration', j.duration,
           'workersRequired', j.workers_required
         )) FILTER (WHERE ${VISIBLE_JOB_FILTER}),
         '[]'::jsonb
       ) AS open_jobs,
       company_rating.average_rating,
       company_rating.review_count
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN jobs j ON j.company_id = cp.user_id
     LEFT JOIN (
       SELECT
         company_id,
         ROUND(AVG(rating)::numeric, 1) AS average_rating,
         COUNT(*)::int AS review_count
       FROM company_reviews
       WHERE ${VISIBLE_REVIEW_FILTER}
       GROUP BY company_id
     ) company_rating ON company_rating.company_id = cp.user_id
     WHERE u.status = 'active'
       AND ($1::text = '' OR cp.company_name ILIKE '%' || $1 || '%')
       AND (
         $2::text = ''
         OR cp.city ILIKE '%' || $2 || '%'
         OR cp.postcode ILIKE '%' || $2 || '%'
         OR cp.head_office ILIKE '%' || $2 || '%'
       )
     GROUP BY cp.user_id, u.email, company_rating.average_rating, company_rating.review_count
     HAVING ($3::boolean = FALSE OR COUNT(j.id) FILTER (WHERE ${VISIBLE_JOB_FILTER}) > 0)
     ORDER BY open_job_count DESC, cp.company_name ASC
     LIMIT 500`,
    [filters.companyName, filters.location, showOnlyVacancies]
  );

  const scoredCompanies = result.rows
    .map((company) => {
      const search = scoreCompanySearch(company, filters);
      const openJobs = filterRelevantOpenJobs(company, filters);
      return {
        ...company,
        open_jobs: openJobs,
        open_job_count: openJobs.length,
        search_match: search.match,
        search_score: Math.round(search.score + (openJobs.length * 8)),
        _matchesSearch: search.matches && (!showOnlyVacancies || openJobs.length > 0),
      };
    })
    .filter((company) => !hasFilters || company._matchesSearch)
    .sort((a, b) => b.search_score - a.search_score || Number(b.open_job_count || 0) - Number(a.open_job_count || 0) || String(a.company_name || '').localeCompare(String(b.company_name || '')));

  const total = scoredCompanies.length;
  const companies = scoredCompanies
    .slice(pageOffset, pageOffset + pageLimit)
    .map(({ _matchesSearch, ...company }) => company);

  res.json({ companies, total, offset: pageOffset, limit: pageLimit });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const profile = await pool.query(
    `SELECT cp.*, u.email
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1 AND u.status = 'active'`,
    [req.params.id]
  );

  if (profile.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const jobs = await pool.query(
    `SELECT *
     FROM jobs
     WHERE company_id = $1
       AND ${OPEN_WORKER_APPLYABLE_JOB_FILTER}
     ORDER BY created_at DESC`,
    [req.params.id]
  );

  const reviews = await pool.query(
    `SELECT
       cr.*,
       wp.full_name,
       wp.profile_photo,
       wp.trades
     FROM company_reviews cr
     JOIN worker_profiles wp ON wp.user_id = cr.worker_id
     JOIN users u ON u.id = cr.worker_id
     WHERE cr.company_id = $1
       AND u.status = 'active'
       AND ${VISIBLE_REVIEW_FILTER}
     ORDER BY cr.updated_at DESC, cr.created_at DESC
     LIMIT 20`,
    [req.params.id]
  );

  const rating = await pool.query(
    `SELECT
       ROUND(AVG(rating)::numeric, 1) AS average,
       COUNT(*)::int AS count
     FROM company_reviews
     WHERE company_id = $1
       AND ${VISIBLE_REVIEW_FILTER}`,
    [req.params.id]
  );

  res.json({
    profile: profile.rows[0],
    jobs: jobs.rows,
    reviews: reviews.rows,
    rating: rating.rows[0],
  });
}));

router.post('/:id/reviews', requireAuth, requireRole('worker'), validate(companyReviewSchema), asyncHandler(async (req, res) => {
  const company = await pool.query(
    `SELECT cp.user_id FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1 AND u.status = 'active'`,
    [req.params.id]
  );

  if (company.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const { rating, feedback } = req.validated.body;
  const recentTexts = await getRecentCompanyReviewTexts(req.user.id);
  const moderation = await evaluateContent({
    contentType: 'company_review',
    text: buildReviewScanText(rating, feedback),
    recentTexts,
  });

  const result = await pool.query(
    `INSERT INTO company_reviews (company_id, worker_id, rating, feedback, moderation_status, ai_review_status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (company_id, worker_id) DO UPDATE SET
       rating = EXCLUDED.rating,
       feedback = EXCLUDED.feedback,
       moderation_status = EXCLUDED.moderation_status,
       ai_review_status = 'pending',
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [req.params.id, req.user.id, rating, feedback || null, moderation.moderationStatus]
  );

  const review = result.rows[0];

  await logContentScan({
    entityType: 'company_review',
    entityId: review.id,
    contentType: 'company_review',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  res.status(201).json({
    review,
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  });
}));

router.post('/:id/follow', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const company = await pool.query(
    `SELECT user_id FROM company_profiles WHERE user_id = $1`,
    [req.params.id]
  );

  if (company.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  await pool.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    [req.user.id, req.params.id]
  );

  res.status(201).json({ followed: true });
}));

module.exports = router;
