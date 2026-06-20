const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const result = await pool.query(
      'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
      [payload.sub]
    );

    if (result.rowCount === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Invalid account' });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = requireAuth;
