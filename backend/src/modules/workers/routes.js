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
  getRecentWorkerReviewTexts,
} = require('../../utils/contentModeration');

const VISIBLE_REVIEW_FILTER = `COALESCE(moderation_status, 'visible') <> 'hidden'`;

const router = express.Router();

const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    profilePhoto: z.string().optional(),
    trades: z.array(z.string()).optional(),
    tradeInterests: z.array(z.string()).min(1).optional(),
    experience: z.string().optional(),
    certificates: z.array(z.string()).optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    workingRadius: z.string().optional(),
    availabilityStatus: z.string().optional(),
    expectedRate: z.string().optional(),
    bio: z.string().optional(),
    workLocations: z.array(z.string()).optional(),
    yearsExperience: z.number().int().nonnegative().optional(),
    lastCompanies: z.array(z.string()).max(3).optional(),
    hasHealthIssues: z.boolean().optional(),
    healthIssuesDetails: z.string().optional(),
    qualifications: z.array(z.string()).optional(),
    hasUkWorkPermit: z.boolean().optional(),
    isEnglishNative: z.boolean().optional(),
    nativeLanguage: z.string().optional(),
    englishLevel: z.string().optional(),
    hasCar: z.boolean().optional(),
    canUseCarForWork: z.boolean().optional(),
    dataConsent: z.literal(true).optional(),
    languagePreference: z.enum(['en', 'ro', 'ru', 'pl', 'bg', 'uk']).optional(),
  }),
});

const availabilitySchema = z.object({
  body: z.object({
    availabilityStatus: z.string().min(2),
  }),
});

const reviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    feedback: z.string().optional(),
  }),
});

const workerMessageSchema = z.object({
  body: z.object({
    body: z.string().min(1).max(1000),
  }),
});

router.get('/me', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM worker_profiles WHERE user_id = $1', [req.user.id]);
  res.json({ profile: result.rows[0] || null });
}));

router.post('/me/verification-request', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const existing = await pool.query(
    `SELECT verification_status, verification_requested_at
     FROM worker_profiles
     WHERE user_id = $1`,
    [req.user.id]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Worker profile not found' });
  }

  const profile = existing.rows[0];

  if (profile.verification_status === 'approved') {
    return res.status(400).json({ error: 'Your profile is already verified.' });
  }

  if (profile.verification_requested_at) {
    return res.json({
      requested: true,
      alreadyRequested: true,
      requestedAt: profile.verification_requested_at,
    });
  }

  const result = await pool.query(
    `UPDATE worker_profiles
     SET verification_requested_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING verification_requested_at`,
    [req.user.id]
  );

  res.status(201).json({
    requested: true,
    requestedAt: result.rows[0].verification_requested_at,
  });
}));

router.get('/me/company-permissions', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       j.company_id,
       cp.company_name,
       cp.logo,
       BOOL_OR(a.can_post_jobs)::boolean AS can_post_jobs,
       BOOL_OR(a.can_post_company_posts)::boolean AS can_post_company_posts
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN company_profiles cp ON cp.user_id = j.company_id
     JOIN users u ON u.id = j.company_id
     WHERE a.worker_id = $1
       AND a.status = 'accepted'
       AND u.status = 'active'
       AND (a.can_post_jobs = TRUE OR a.can_post_company_posts = TRUE)
     GROUP BY j.company_id, cp.company_name, cp.logo
     ORDER BY cp.company_name ASC`,
    [req.user.id]
  );

  res.json({ companies: result.rows });
}));

router.post('/me/photo', requireAuth, requireRole('worker'), upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Profile picture is required' });
  }

  const profilePhoto = await enqueueUploadedFile(req.file);
  const result = await pool.query(
    `UPDATE worker_profiles
     SET profile_photo = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [req.user.id, profilePhoto]
  );

  res.status(201).json({ profile: result.rows[0], profilePhoto });
}));

router.patch('/me', requireAuth, requireRole('worker'), validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const result = await pool.query(
    `UPDATE worker_profiles SET
      full_name = COALESCE($2, full_name),
      phone = COALESCE($3, phone),
      profile_photo = COALESCE($4, profile_photo),
      trades = COALESCE($5, trades),
      experience = COALESCE($6, experience),
      certificates = COALESCE($7, certificates),
      city = COALESCE($8, city),
      postcode = COALESCE($9, postcode),
      working_radius = COALESCE($10, working_radius),
      availability_status = COALESCE($11, availability_status),
      expected_rate = COALESCE($12, expected_rate),
      bio = COALESCE($13, bio),
      work_locations = COALESCE($14, work_locations),
      years_experience = COALESCE($15, years_experience),
      last_companies = COALESCE($16, last_companies),
      has_health_issues = COALESCE($17, has_health_issues),
      health_issues_details = COALESCE($18, health_issues_details),
      qualifications = COALESCE($19, qualifications),
      has_uk_work_permit = COALESCE($20, has_uk_work_permit),
      is_english_native = COALESCE($21, is_english_native),
      native_language = COALESCE($22, native_language),
      english_level = COALESCE($23, english_level),
      has_car = COALESCE($24, has_car),
      can_use_car_for_work = COALESCE($25, can_use_car_for_work),
      data_consent = COALESCE($26, data_consent),
      language_preference = COALESCE($27, language_preference),
      trade_interests = COALESCE($28, trade_interests),
      updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [
      req.user.id,
      payload.fullName || null,
      payload.phone || null,
      payload.profilePhoto || null,
      payload.trades || null,
      payload.experience || null,
      payload.certificates || null,
      payload.city || null,
      payload.postcode || null,
      payload.workingRadius || null,
      payload.availabilityStatus || null,
      payload.expectedRate || null,
      payload.bio || null,
      payload.workLocations || null,
      payload.yearsExperience ?? null,
      payload.lastCompanies || null,
      payload.hasHealthIssues ?? null,
      payload.healthIssuesDetails || null,
      payload.qualifications || null,
      payload.hasUkWorkPermit ?? null,
      payload.isEnglishNative ?? null,
      payload.nativeLanguage || null,
      payload.englishLevel || null,
      payload.hasCar ?? null,
      payload.canUseCarForWork ?? null,
      payload.dataConsent ?? null,
      payload.languagePreference || null,
      payload.tradeInterests || null,
    ]
  );
  res.json({ profile: result.rows[0] });
}));

router.patch('/me/availability', requireAuth, requireRole('worker'), validate(availabilitySchema), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE worker_profiles
     SET availability_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [req.user.id, req.validated.body.availabilityStatus]
  );
  res.json({ profile: result.rows[0] });
}));

router.get('/directory/search', requireAuth, requireRole('worker', 'company', 'admin'), asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query.length < 2) {
    return res.json({ workers: [] });
  }

  const result = await pool.query(
    `SELECT
       wp.user_id,
       wp.full_name,
       wp.profile_photo,
       wp.trades,
       wp.city,
       wp.postcode,
       wp.availability_status,
       wp.verification_status
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE u.status = 'active'
       AND wp.user_id <> $3
       AND (
         wp.full_name ILIKE $1
         OR wp.city ILIKE $1
         OR wp.postcode ILIKE $1
         OR EXISTS (SELECT 1 FROM unnest(wp.trades) AS t WHERE t ILIKE $1)
       )
     ORDER BY
       CASE WHEN wp.full_name ILIKE $2 THEN 0 ELSE 1 END,
       wp.full_name ASC
     LIMIT 8`,
    [`%${query}%`, `${query}%`, req.user.id]
  );

  res.json({ workers: result.rows });
}));

router.get('/search', requireAuth, requireRole('company', 'admin'), asyncHandler(async (req, res) => {
  const { trade, location, experience, qualification, availability, rating, sort = 'match' } = req.query;
  const minimumRating = rating ? Number(rating) : null;
  const orderBy = {
    trade: 'trade_label ASC, wp.full_name ASC',
    location: 'wp.city ASC NULLS LAST, wp.postcode ASC NULLS LAST, wp.full_name ASC',
    experience: 'wp.years_experience DESC NULLS LAST, wp.experience DESC NULLS LAST, wp.full_name ASC',
    availability: 'wp.availability_status ASC NULLS LAST, wp.full_name ASC',
    rating: 'average_rating DESC NULLS LAST, review_count DESC, wp.full_name ASC',
    match: 'match_score DESC, wp.full_name ASC',
  }[sort] || 'match_score DESC, wp.full_name ASC';

  const result = await pool.query(
    `SELECT
       wp.*,
       u.email,
       COALESCE(wr.average_rating, 0) AS average_rating,
       COALESCE(wr.review_count, 0) AS review_count,
       EXISTS (
         SELECT 1
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.worker_id = wp.user_id
           AND j.company_id = $7
           AND a.status = 'accepted'
       ) AS is_already_hired,
       COALESCE(array_to_string(wp.trades, ', '), '') AS trade_label,
       (
         CASE
           WHEN $1::text IS NOT NULL AND EXISTS (
             SELECT 1 FROM unnest(wp.trades) AS t WHERE t ILIKE $1
           ) THEN 40 ELSE 0
         END +
         CASE
           WHEN $2::text IS NOT NULL AND (wp.city ILIKE $2 OR wp.postcode ILIKE $2) THEN 35 ELSE 0
         END +
         CASE
           WHEN $3::text IS NOT NULL AND (wp.experience ILIKE $3 OR wp.years_experience::text ILIKE $3) THEN 20 ELSE 0
         END +
         CASE
           WHEN $4::text IS NOT NULL AND (
             EXISTS (SELECT 1 FROM unnest(wp.qualifications) AS q WHERE q ILIKE $4)
             OR EXISTS (SELECT 1 FROM unnest(wp.certificates) AS c WHERE c ILIKE $4)
           ) THEN 20 ELSE 0
         END +
         CASE
           WHEN $5::text IS NOT NULL AND wp.availability_status ILIKE $5 THEN 15 ELSE 0
         END +
         CASE
           WHEN $6::numeric IS NOT NULL AND COALESCE(wr.average_rating, 0) >= $6 THEN 20 ELSE 0
         END
       ) AS match_score
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     LEFT JOIN (
       SELECT worker_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
       FROM worker_reviews
       WHERE ${VISIBLE_REVIEW_FILTER}
       GROUP BY worker_id
     ) wr ON wr.worker_id = wp.user_id
     WHERE u.status = 'active'
       AND ($1::text IS NULL OR EXISTS (
         SELECT 1 FROM unnest(wp.trades) AS t WHERE t ILIKE $1
       ))
       AND ($2::text IS NULL OR wp.city ILIKE $2 OR wp.postcode ILIKE $2)
       AND ($3::text IS NULL OR wp.experience ILIKE $3 OR wp.years_experience::text ILIKE $3)
       AND ($4::text IS NULL OR EXISTS (
         SELECT 1 FROM unnest(wp.qualifications) AS q WHERE q ILIKE $4
       ) OR EXISTS (
         SELECT 1 FROM unnest(wp.certificates) AS c WHERE c ILIKE $4
       ))
       AND ($5::text IS NULL OR wp.availability_status ILIKE $5)
       AND ($6::numeric IS NULL OR COALESCE(wr.average_rating, 0) >= $6)
     ORDER BY ${orderBy}
     LIMIT 30`,
    [
      trade ? `%${trade}%` : null,
      location ? `%${location}%` : null,
      experience ? `%${experience}%` : null,
      qualification ? `%${qualification}%` : null,
      availability ? `%${availability}%` : null,
      Number.isFinite(minimumRating) ? minimumRating : null,
      req.user.id,
    ]
  );

  res.json({ workers: result.rows });
}));

router.post('/:id/reviews', requireAuth, requireRole('company'), validate(reviewSchema), asyncHandler(async (req, res) => {
  const worker = await pool.query(
    `SELECT user_id FROM worker_profiles WHERE user_id = $1`,
    [req.params.id]
  );

  if (worker.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const { rating, feedback } = req.validated.body;
  const recentTexts = await getRecentWorkerReviewTexts(req.user.id);
  const moderation = await evaluateContent({
    contentType: 'worker_review',
    text: buildReviewScanText(rating, feedback),
    recentTexts,
  });

  const updated = await pool.query(
    `UPDATE worker_reviews
     SET rating = $3,
         feedback = $4,
         moderation_status = $5,
         ai_review_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE company_id = $1 AND worker_id = $2
     RETURNING *`,
    [req.user.id, req.params.id, rating, feedback || null, moderation.moderationStatus]
  );

  let review = updated.rows[0] || null;

  if (!review) {
    const inserted = await pool.query(
      `INSERT INTO worker_reviews (company_id, worker_id, rating, feedback, moderation_status, ai_review_status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [req.user.id, req.params.id, rating, feedback || null, moderation.moderationStatus]
    );
    review = inserted.rows[0];
  }

  await logContentScan({
    entityType: 'worker_review',
    entityId: review.id,
    contentType: 'worker_review',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  const payload = {
    review,
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  };

  if (updated.rowCount > 0) {
    return res.json(payload);
  }

  res.status(201).json(payload);
}));

router.post('/:id/message', requireAuth, requireRole('worker'), validate(workerMessageSchema), asyncHandler(async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot message yourself' });
  }

  const target = await pool.query(
    `SELECT wp.user_id, wp.full_name
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.user_id = $1 AND u.status = 'active'`,
    [req.params.id]
  );

  if (target.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const sender = await pool.query('SELECT full_name FROM worker_profiles WHERE user_id = $1', [req.user.id]);
  const senderName = sender.rows[0]?.full_name || 'A worker';
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'message', $2, $3, 'worker', $4)
     RETURNING *`,
    [req.params.id, `Message from ${senderName}`, req.validated.body.body, req.user.id]
  );

  res.status(201).json({ notification: result.rows[0] });
}));

router.get('/:id/profile', asyncHandler(async (req, res) => {
  const profile = await pool.query(
    `SELECT wp.*, u.email
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.user_id = $1 AND u.status = 'active'`,
    [req.params.id]
  );

  if (profile.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const posts = await pool.query(
    `SELECT fp.id, fp.caption, fp.media_urls, fp.tags, fp.location, fp.post_type, fp.title, fp.created_at, cp.company_name AS posted_for_company
     FROM feed_posts fp
     LEFT JOIN company_profiles cp ON cp.user_id = fp.author_id
     WHERE fp.author_id = $1 OR fp.created_by_user_id = $1
     ORDER BY created_at DESC
     LIMIT 12`,
    [req.params.id]
  );

  const currentCompany = await pool.query(
    `SELECT cp.user_id, cp.company_name
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE a.worker_id = $1
       AND a.status = 'accepted'
     ORDER BY a.updated_at DESC
     LIMIT 1`,
    [req.params.id]
  );

  const following = await pool.query(
    `SELECT u.id, u.role, cp.company_name, wp.full_name, cp.logo, wp.profile_photo
     FROM follows f
     JOIN users u ON u.id = f.following_id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [req.params.id]
  );

  const followers = await pool.query(
    `SELECT u.id, u.role, cp.company_name, wp.full_name, cp.logo, wp.profile_photo
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [req.params.id]
  );

  const rating = await pool.query(
    `WITH latest_reviews AS (
       SELECT DISTINCT ON (company_id) company_id, rating
       FROM worker_reviews
       WHERE worker_id = $1
         AND ${VISIBLE_REVIEW_FILTER}
       ORDER BY company_id, updated_at DESC, created_at DESC
     )
     SELECT
       ROUND(AVG(rating)::numeric, 1) AS average_rating,
       COUNT(*)::int AS review_count
     FROM latest_reviews`,
    [req.params.id]
  );

  const reviews = await pool.query(
    `WITH latest_reviews AS (
       SELECT DISTINCT ON (company_id) *
       FROM worker_reviews
       WHERE worker_id = $1
         AND ${VISIBLE_REVIEW_FILTER}
       ORDER BY company_id, updated_at DESC, created_at DESC
     )
     SELECT
       lr.id,
       lr.rating,
       lr.feedback,
       lr.created_at,
       lr.updated_at,
       cp.company_name,
       cp.logo
     FROM latest_reviews lr
     JOIN company_profiles cp ON cp.user_id = lr.company_id
     ORDER BY lr.updated_at DESC, lr.created_at DESC`,
    [req.params.id]
  );

  res.json({
    profile: profile.rows[0],
    posts: posts.rows,
    following: following.rows,
    followers: followers.rows,
    currentCompany: currentCompany.rows[0] || null,
    rating: {
      average: rating.rows[0].average_rating ? Number(rating.rows[0].average_rating) : null,
      count: rating.rows[0].review_count,
    },
    reviews: reviews.rows,
  });
}));

module.exports = router;
