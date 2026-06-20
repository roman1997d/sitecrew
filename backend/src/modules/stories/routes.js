const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const asyncHandler = require('../../utils/asyncHandler');
const { enqueueUploadedFile } = require('../../utils/mediaReviewQueue');

const router = express.Router();

const storySchema = z.object({
  body: z.object({
    companyId: z.number().int().positive().optional(),
    mediaUrl: z.string().optional(),
    caption: z.string().optional(),
    expiresInHours: z.number().int().positive().max(168).default(24),
  }),
});

async function getStoryCompanyId(req, companyId) {
  if (req.user.role === 'company') {
    return req.user.id;
  }

  if (req.user.role === 'worker' && !companyId) {
    return null;
  }

  if (req.user.role !== 'worker') {
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
       AND a.can_post_company_posts = TRUE
     LIMIT 1`,
    [req.user.id, companyId]
  );

  if (permission.rowCount === 0) {
    const error = new Error('You do not have permission to post stories for this company.');
    error.status = 403;
    throw error;
  }

  return companyId;
}

router.post('/', requireAuth, validate(storySchema), asyncHandler(async (req, res) => {
  const { companyId, mediaUrl, caption, expiresInHours } = req.validated.body;
  const storyCompanyId = await getStoryCompanyId(req, companyId);
  const result = await pool.query(
    `INSERT INTO stories (company_id, author_id, media_url, caption, expires_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + ($5 || ' hours')::interval)
     RETURNING *`,
    [storyCompanyId, req.user.id, mediaUrl || null, caption || null, expiresInHours]
  );
  res.status(201).json({ story: result.rows[0] });
}));

router.post('/upload', requireAuth, upload.single('media'), asyncHandler(async (req, res) => {
  const mediaUrl = await enqueueUploadedFile(req.file);
  res.status(201).json({ mediaUrl });
}));

router.get('/companies', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       s.*,
       COALESCE(cp.company_name, wp.full_name) AS story_author_name,
       COALESCE(cp.logo, wp.profile_photo) AS story_author_avatar,
       u.role AS story_author_role,
       cp.company_name,
       cp.logo,
       cp.verification_status,
       wp.full_name,
       wp.profile_photo
     FROM stories s
     JOIN users u ON u.id = COALESCE(s.company_id, s.author_id)
     LEFT JOIN company_profiles cp ON cp.user_id = s.company_id
     LEFT JOIN worker_profiles wp ON wp.user_id = s.author_id
     WHERE s.expires_at > CURRENT_TIMESTAMP
       AND u.status = 'active'
     ORDER BY s.created_at DESC`
  );
  res.json({ stories: result.rows });
}));

module.exports = router;
