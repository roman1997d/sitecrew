const express = require('express');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const asyncHandler = require('../../utils/asyncHandler');
const {
  mapMarketplaceAd,
  filterMarketplaceAdsForWorker,
  splitFeedMarketplaceAds,
  fetchMarketplaceAdProducts,
} = require('../../utils/marketplaceAds');

const router = express.Router();

router.get('/ads/feed', requireAuth, requireRole('worker'), asyncHandler(async (req, res) => {
  const profile = await pool.query(
    'SELECT trade_interests FROM worker_profiles WHERE user_id = $1',
    [req.user.id]
  );

  if (profile.rowCount === 0) {
    return res.status(404).json({ error: 'Worker profile not found.' });
  }

  const adsResult = await pool.query(
    `SELECT
       id,
       internal_title,
       status,
       starts_at,
       ends_at,
       allow_on_top,
       target_trades,
       client_name,
       client_address,
       activity_scope,
       is_paid,
       created_at,
       updated_at
     FROM marketplace_ads
     WHERE status = 'active'
       AND starts_at <= CURRENT_DATE
       AND ends_at >= CURRENT_DATE
     ORDER BY allow_on_top DESC, updated_at DESC`
  );

  const adsWithProducts = await Promise.all(
    adsResult.rows.map(async (row) => {
      const products = await fetchMarketplaceAdProducts(pool, row.id);
      return mapMarketplaceAd(row, products);
    })
  );

  const visibleAds = filterMarketplaceAdsForWorker(
    adsWithProducts,
    profile.rows[0].trade_interests || []
  );

  res.json(splitFeedMarketplaceAds(visibleAds));
}));

module.exports = router;
