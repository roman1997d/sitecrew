const pool = require('../db/pool');

function apiLogger(req, res, next) {
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const started = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const userId = req.user?.id || null;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

    pool.query(
      `INSERT INTO api_logs (method, path, status_code, user_id, ip, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.method, req.originalUrl.slice(0, 500), res.statusCode, userId, ip, durationMs]
    ).catch((error) => {
      console.error('API log write failed:', error.message);
    });
  });

  next();
}

module.exports = apiLogger;
