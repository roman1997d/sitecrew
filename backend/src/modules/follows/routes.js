const express = require('express');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const following = await pool.query(
    `SELECT f.*, u.role, COALESCE(wp.full_name, cp.company_name) AS name, COALESCE(wp.profile_photo, cp.logo) AS avatar
     FROM follows f
     JOIN users u ON u.id = f.following_id
     LEFT JOIN worker_profiles wp ON wp.user_id = f.following_id
     LEFT JOIN company_profiles cp ON cp.user_id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  const followers = await pool.query(
    `SELECT f.*, u.role, COALESCE(wp.full_name, cp.company_name) AS name, COALESCE(wp.profile_photo, cp.logo) AS avatar
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     LEFT JOIN worker_profiles wp ON wp.user_id = f.follower_id
     LEFT JOIN company_profiles cp ON cp.user_id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  res.json({ following: following.rows, followers: followers.rows });
}));

router.post('/:id', requireAuth, asyncHandler(async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  const target = await pool.query('SELECT id FROM users WHERE id = $1 AND status = $2', [req.params.id, 'active']);
  if (target.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const result = await pool.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO UPDATE SET following_id = EXCLUDED.following_id
     RETURNING *`,
    [req.user.id, req.params.id]
  );

  res.status(201).json({ follow: result.rows[0] });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await pool.query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [req.user.id, req.params.id]
  );
  res.status(204).send();
}));

module.exports = router;
