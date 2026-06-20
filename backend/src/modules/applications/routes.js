const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

const statusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'unhired']),
  }),
});

const permissionSchema = z.object({
  body: z.object({
    canPostJobs: z.boolean(),
    canPostCompanyPosts: z.boolean(),
  }),
});

router.get('/me', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, j.title, j.trade_required, j.city, j.rate, cp.company_name, cp.logo
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE a.worker_id = $1
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json({ applications: result.rows });
}));

router.patch('/:id/status', requireAuth, validate(statusSchema), asyncHandler(async (req, res) => {
  const application = await pool.query(
    `SELECT a.*, j.company_id
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [req.params.id]
  );

  if (application.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const row = application.rows[0];
  const status = req.validated.body.status;
  const canUpdate =
    (req.user.role === 'worker' && row.worker_id === req.user.id && status === 'withdrawn') ||
    (req.user.role === 'company' && row.company_id === req.user.id && ['accepted', 'rejected', 'unhired'].includes(status)) ||
    req.user.role === 'admin';

  if (!canUpdate) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await pool.query(
    `UPDATE applications
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [req.params.id, status]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'application', 'Application updated', $2, 'application', $3)`,
    [row.worker_id, `Your application was ${status}.`, req.params.id]
  );

  res.json({ application: result.rows[0] });
}));

router.patch('/:id/permissions', requireAuth, requireRole('company', 'admin'), validate(permissionSchema), asyncHandler(async (req, res) => {
  const application = await pool.query(
    `SELECT a.*, j.company_id
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [req.params.id]
  );

  if (application.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const row = application.rows[0];
  if (req.user.role !== 'admin' && row.company_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (row.status !== 'accepted') {
    return res.status(400).json({ error: 'Permissions can be changed only for hired workers.' });
  }

  const result = await pool.query(
    `UPDATE applications
     SET can_post_jobs = $2,
         can_post_company_posts = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [req.params.id, req.validated.body.canPostJobs, req.validated.body.canPostCompanyPosts]
  );

  res.json({ application: result.rows[0] });
}));

router.delete('/:id', requireAuth, requireRole('company', 'admin'), asyncHandler(async (req, res) => {
  const application = await pool.query(
    `SELECT a.*, j.company_id
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [req.params.id]
  );

  if (application.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const row = application.rows[0];
  if (req.user.role !== 'admin' && row.company_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await pool.query(
    `DELETE FROM applications
     WHERE id = $1
     RETURNING *`,
    [req.params.id]
  );

  res.json({ deleted: true, application: result.rows[0] });
}));

module.exports = router;
