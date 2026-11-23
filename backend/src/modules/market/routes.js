const express = require('express');
const pool = require('../../db/pool');
const asyncHandler = require('../../utils/asyncHandler');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const optionalAuth = require('../../middleware/optionalAuth');
const { mapAccessPlan, getLatestSalesPlanTerms } = require('../../utils/accessPlans');
const { logJobSearchEvent, ensureSearchEventsSchema } = require('./searchEvents');
const { getCompanyMarketInsights, runDailyMarketStatsRefresh } = require('./companyInsights');

const router = express.Router();

router.get('/plans', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT plan_key, display_name, price_gbp, discount_percent, benefits, updated_at
     FROM company_access_plans
     ORDER BY CASE plan_key
       WHEN 'free' THEN 1
       WHEN 'pro' THEN 2
       WHEN 'ultra' THEN 3
       ELSE 4
     END`
  );

  res.json({ plans: result.rows.map(mapAccessPlan) });
}));

router.get('/terms', asyncHandler(async (req, res) => {
  const terms = await getLatestSalesPlanTerms(pool);
  res.json({ terms });
}));

router.get('/platform-stats', asyncHandler(async (req, res) => {
  const [workers, companies, openJobs] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'worker' AND status = 'active'"),
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'company' AND status = 'active'"),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM jobs
       WHERE status = 'open'
         AND COALESCE(moderation_status, 'visible') = 'visible'`
    ),
  ]);

  res.json({
    stats: {
      activeWorkers: workers.rows[0]?.count || 0,
      activeCompanies: companies.rows[0]?.count || 0,
      openJobs: openJobs.rows[0]?.count || 0,
    },
  });
}));

router.post('/search-events', optionalAuth, asyncHandler(async (req, res) => {
  await ensureSearchEventsSchema();
  const body = req.body || {};
  await logJobSearchEvent({
    source: body.source || 'client',
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    queryText: body.queryText || body.q || null,
    trade: body.trade || null,
    city: body.city || null,
    location: body.location || null,
    resultCount: body.resultCount || 0,
  });
  res.status(201).json({ logged: true });
}));

router.get('/company-insights', requireAuth, requireRole('company', 'admin'), asyncHandler(async (req, res) => {
  const insights = await getCompanyMarketInsights();
  res.json({ insights });
}));

router.post('/company-insights/refresh', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const result = await runDailyMarketStatsRefresh();
  res.json({ refreshed: true, ...result });
}));

module.exports = router;
