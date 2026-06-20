const express = require('express');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT *
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ notifications: result.rows });
}));

router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ notification: result.rows[0] });
}));

module.exports = router;
