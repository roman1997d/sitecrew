const express = require('express');
const requireAuth = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;
