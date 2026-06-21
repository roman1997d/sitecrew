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

module.exports = router;
