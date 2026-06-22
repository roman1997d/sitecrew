const express = require('express');
const pool = require('../../db/pool');
const asyncHandler = require('../../utils/asyncHandler');
const { mapAccessPlan, getLatestSalesPlanTerms } = require('../../utils/accessPlans');

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

module.exports = router;
