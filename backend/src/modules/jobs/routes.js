const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const optionalAuth = require('../../middleware/optionalAuth');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../utils/asyncHandler');
const { scoreWorkerForJob } = require('../matching/service');
const {
  evaluateContent,
  logContentScan,
  getRecentJobTexts,
} = require('../../utils/contentModeration');
const {
  WORKER_APPLYABLE_JOB_SQL,
  WORKER_APPLYABLE_JOB_SQL_J,
  isWorkerApplyableJob,
} = require('../../utils/jobVisibility');
const { queueJobAlertEmails } = require('../../utils/jobAlertEmails');

const router = express.Router();

const jobSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    city: z.string().optional(),
    postcode: z.string().optional(),
    tradeRequired: z.string().min(2),
    experienceRequired: z.string().optional(),
    certificatesRequired: z.array(z.string()).default([]),
    startDate: z.string().optional(),
    duration: z.string().optional(),
    rate: z.string().optional(),
    workersRequired: z.number().int().positive().default(1),
    status: z.enum(['open', 'closed']).default('open'),
    companyId: z.number().int().positive().optional(),
  }),
});

const updateJobSchema = z.object({
  body: jobSchema.shape.body.partial(),
});

const applySchema = z.object({
  body: z.object({
    coverNote: z.string().optional(),
  }),
});

const inviteSchema = z.object({
  body: z.object({
    workerId: z.number().int().positive(),
  }),
});

const rateFeedbackSchema = z.object({
  body: z.object({
    insightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vote: z.enum(['up', 'down']),
  }),
});

function normalizeJobRate(rate) {
  return rate && rate.trim() ? rate.trim() : 'Negotiable';
}

async function getJobCompanyId(req, companyId) {
  if (req.user.role === 'company') {
    return req.user.id;
  }

  if (req.user.role !== 'worker' || !companyId) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  const permission = await pool.query(
    `SELECT 1
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.worker_id = $1
       AND j.company_id = $2
       AND a.status = 'accepted'
       AND a.can_post_jobs = TRUE
     LIMIT 1`,
    [req.user.id, companyId]
  );

  if (permission.rowCount === 0) {
    const error = new Error('You do not have permission to post jobs for this company.');
    error.status = 403;
    throw error;
  }

  return companyId;
}

router.post('/', requireAuth, validate(jobSchema), asyncHandler(async (req, res) => {
  const job = req.validated.body;
  const companyId = await getJobCompanyId(req, job.companyId);
  const recentTexts = await getRecentJobTexts(companyId);
  const moderation = await evaluateContent({
    contentType: 'job_post',
    title: job.title,
    text: job.description,
    recentTexts,
  });
  const result = await pool.query(
    `INSERT INTO jobs (company_id, created_by_user_id, title, description, city, postcode, trade_required, experience_required, certificates_required, start_date, duration, rate, workers_required, status, moderation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      companyId,
      req.user.id,
      job.title,
      job.description,
      job.city || null,
      job.postcode || null,
      job.tradeRequired,
      job.experienceRequired || null,
      job.certificatesRequired,
      job.startDate || null,
      job.duration || null,
      normalizeJobRate(job.rate),
      job.workersRequired,
      job.status,
      moderation.moderationStatus,
    ]
  );

  await logContentScan({
    entityType: 'job',
    entityId: result.rows[0].id,
    contentType: 'job_post',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  const createdJob = result.rows[0];
  if (createdJob.status === 'open') {
    queueJobAlertEmails({
      job: createdJob,
      companyId,
      excludeUserId: req.user.role === 'worker' ? req.user.id : null,
    });
  }

  res.status(201).json({
    job: createdJob,
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  });
}));

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { trade, city, status = 'open' } = req.query;
  const viewerCompanyId = req.user?.role === 'company' ? req.user.id : null;
  const result = await pool.query(
    `SELECT
       j.*,
       cp.company_name,
       cp.logo,
       cp.verification_status,
       creator.id AS created_by_id,
       creator.role AS created_by_role,
       COALESCE(creator_wp.full_name, creator_cp.company_name) AS created_by_name
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     LEFT JOIN users creator ON creator.id = COALESCE(j.created_by_user_id, j.company_id)
     LEFT JOIN worker_profiles creator_wp ON creator_wp.user_id = creator.id
     LEFT JOIN company_profiles creator_cp ON creator_cp.user_id = creator.id
     WHERE ($1::text IS NULL OR j.trade_required ILIKE $1)
       AND ($2::text IS NULL OR j.city ILIKE $2)
       AND ($3::text IS NULL OR j.status = $3)
       AND (
         ${WORKER_APPLYABLE_JOB_SQL_J}
         OR ($4::int IS NOT NULL AND j.company_id = $4)
       )
     ORDER BY j.created_at DESC`,
    [trade ? `%${trade}%` : null, city ? `%${city}%` : null, status || null, viewerCompanyId]
  );
  res.json({ jobs: result.rows });
}));

router.get('/trades/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query.length < 3) {
    return res.json({ trades: [] });
  }

  const result = await pool.query(
    `SELECT id, name, category
     FROM construction_trades
     WHERE name ILIKE $1
     ORDER BY
       CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
       name ASC
     LIMIT 12`,
    [`%${query}%`, `${query}%`]
  );

  res.json({ trades: result.rows });
}));

router.get('/trades/rates', requireAuth, requireRole('worker', 'company', 'admin'), asyncHandler(async (req, res) => {
  const names = String(req.query.names || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.length) {
    return res.json({ rates: [] });
  }

  const result = await pool.query(
    `SELECT trade_name, hourly_rate, day_rate, sqm_rate, source_label, updated_at
     FROM construction_trade_rates
     WHERE trade_name = ANY($1::text[])
     ORDER BY trade_name ASC`,
    [names]
  );

  res.json({ rates: result.rows });
}));

router.get('/trades/rates/feedback', requireAuth, requireRole('worker', 'company', 'admin'), asyncHandler(async (req, res) => {
  const insightDate = String(req.query.date || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(insightDate)) {
    return res.status(400).json({ error: 'Valid date is required.' });
  }

  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE vote = 'up')::int AS up_count,
       COUNT(*) FILTER (WHERE vote = 'down')::int AS down_count
     FROM rate_insight_feedback
     WHERE insight_date = $1`,
    [insightDate]
  );
  const ownVote = await pool.query(
    `SELECT vote
     FROM rate_insight_feedback
     WHERE insight_date = $1 AND user_id = $2`,
    [insightDate, req.user.id]
  );

  res.json({
    feedback: {
      insightDate,
      upCount: counts.rows[0]?.up_count || 0,
      downCount: counts.rows[0]?.down_count || 0,
      userVote: ownVote.rows[0]?.vote || null,
    },
  });
}));

router.post('/trades/rates/feedback', requireAuth, requireRole('worker', 'company', 'admin'), validate(rateFeedbackSchema), asyncHandler(async (req, res) => {
  const { insightDate, vote } = req.validated.body;

  await pool.query(
    `INSERT INTO rate_insight_feedback (user_id, insight_date, vote)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, insight_date) DO UPDATE SET
       vote = EXCLUDED.vote,
       updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, insightDate, vote]
  );

  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE vote = 'up')::int AS up_count,
       COUNT(*) FILTER (WHERE vote = 'down')::int AS down_count
     FROM rate_insight_feedback
     WHERE insight_date = $1`,
    [insightDate]
  );

  res.json({
    feedback: {
      insightDate,
      upCount: counts.rows[0]?.up_count || 0,
      downCount: counts.rows[0]?.down_count || 0,
      userVote: vote,
    },
  });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT j.*, cp.company_name, cp.logo
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE j.id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const job = result.rows[0];
  const isOwner = req.user?.role === 'company' && Number(req.user.id) === Number(job.company_id);
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
  if (!isWorkerApplyableJob(job) && !isOwner && !isAdmin) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ job });
}));

router.patch('/:id', requireAuth, requireRole('company'), validate(updateJobSchema), asyncHandler(async (req, res) => {
  const job = req.validated.body;
  const existing = await pool.query(
    'SELECT * FROM jobs WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user.id]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const current = existing.rows[0];
  const nextTitle = job.title === undefined ? current.title : job.title;
  const nextDescription = job.description === undefined ? current.description : job.description;
  let moderationStatus = current.moderation_status;
  let moderationMeta = null;

  if (job.title !== undefined || job.description !== undefined) {
    const recentTexts = await getRecentJobTexts(req.user.id);
    const moderation = await evaluateContent({
      contentType: 'job_post',
      title: nextTitle,
      text: nextDescription,
      recentTexts,
    });
    moderationStatus = moderation.moderationStatus;
    moderationMeta = {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    };
  }

  const result = await pool.query(
    `UPDATE jobs SET
      title = COALESCE($3, title),
      description = COALESCE($4, description),
      city = COALESCE($5, city),
      postcode = COALESCE($6, postcode),
      trade_required = COALESCE($7, trade_required),
      experience_required = COALESCE($8, experience_required),
      certificates_required = COALESCE($9, certificates_required),
      start_date = COALESCE($10, start_date),
      duration = COALESCE($11, duration),
      rate = COALESCE($12, rate),
      workers_required = COALESCE($13, workers_required),
      status = COALESCE($14, status),
      moderation_status = $15,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      req.params.id,
      req.user.id,
      job.title || null,
      job.description || null,
      job.city || null,
      job.postcode || null,
      job.tradeRequired || null,
      job.experienceRequired || null,
      job.certificatesRequired || null,
      job.startDate || null,
      job.duration || null,
      job.rate === undefined ? null : normalizeJobRate(job.rate),
      job.workersRequired || null,
      job.status || null,
      moderationStatus,
    ]
  );

  if (moderationMeta) {
    await logContentScan({
      entityType: 'job',
      entityId: result.rows[0].id,
      contentType: 'job_post',
      moderationStatus: moderationMeta.status,
      scan: moderationMeta.scan,
    });
  }

  res.json({
    job: result.rows[0],
    moderation: moderationMeta,
  });
}));

router.delete('/:id', requireAuth, requireRole('company'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `DELETE FROM jobs
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ deleted: true, job: result.rows[0] });
}));

router.post('/:id/apply', requireAuth, requireRole('worker'), validate(applySchema), asyncHandler(async (req, res) => {
  const job = await pool.query(
    `SELECT *
     FROM jobs
     WHERE id = $1
       AND status = $2
       AND ${WORKER_APPLYABLE_JOB_SQL}`,
    [req.params.id, 'open']
  );
  if (job.rowCount === 0) {
    return res.status(404).json({ error: 'Open job not found' });
  }

  const result = await pool.query(
    `INSERT INTO applications (job_id, worker_id, cover_note)
     VALUES ($1, $2, $3)
     ON CONFLICT (job_id, worker_id) DO UPDATE SET cover_note = EXCLUDED.cover_note, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [req.params.id, req.user.id, req.validated.body.coverNote || null]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'application', 'New job application', 'A worker applied to your job.', 'job', $2)`,
    [job.rows[0].company_id, req.params.id]
  );

  res.status(201).json({ application: result.rows[0] });
}));

router.post('/:id/invite', requireAuth, requireRole('company'), validate(inviteSchema), asyncHandler(async (req, res) => {
  const job = await pool.query(
    `SELECT j.*, cp.company_name
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE j.id = $1
       AND j.company_id = $2
       AND j.status = 'open'
       AND ${WORKER_APPLYABLE_JOB_SQL_J}`,
    [req.params.id, req.user.id]
  );

  if (job.rowCount === 0) {
    return res.status(404).json({ error: 'Open job not found' });
  }

  const worker = await pool.query(
    `SELECT wp.user_id
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.user_id = $1 AND u.status = 'active'`,
    [req.validated.body.workerId]
  );

  if (worker.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const notification = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'job_offer', $2, $3, 'job', $4)
     RETURNING *`,
    [
      req.validated.body.workerId,
      `${job.rows[0].company_name} sent you job offer`,
      'Click here to find out more.',
      req.params.id,
    ]
  );

  res.status(201).json({ notification: notification.rows[0] });
}));

router.get('/:id/applications', requireAuth, requireRole('company', 'admin'), asyncHandler(async (req, res) => {
  const job = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
  if (job.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (req.user.role === 'company' && job.rows[0].company_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await pool.query(
    `SELECT a.*, wp.full_name, wp.profile_photo, wp.trades, wp.certificates, wp.city, wp.availability_status
     FROM applications a
     JOIN worker_profiles wp ON wp.user_id = a.worker_id
     WHERE a.job_id = $1
     ORDER BY a.created_at DESC`,
    [req.params.id]
  );

  const applications = result.rows.map((application) => ({
    ...application,
    match: scoreWorkerForJob(application, job.rows[0]),
  }));

  res.json({ applications });
}));

router.get('/:id/matches', requireAuth, requireRole('company', 'admin'), asyncHandler(async (req, res) => {
  const job = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
  if (job.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (req.user.role === 'company' && job.rows[0].company_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const workers = await pool.query(
    `SELECT wp.*, u.email
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE u.status = 'active'`
  );

  const matches = workers.rows
    .map((worker) => ({ worker, match: scoreWorkerForJob(worker, job.rows[0]) }))
    .filter((item) => item.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score);

  res.json({ matches });
}));

module.exports = router;
