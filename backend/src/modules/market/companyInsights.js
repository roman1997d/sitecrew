const pool = require('../../db/pool');
const { ensureSearchEventsSchema } = require('./searchEvents');
const { OPEN_WORKER_APPLYABLE_JOB_FILTER } = require('../../utils/jobVisibility');

const LOOKBACK_DAYS = 30;
let lastSnapshotDate = null;

function toIsoDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 100);
}

function extractRateNumber(rateText) {
  const match = String(rateText || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function rateBand(rateText) {
  const value = extractRateNumber(rateText);
  if (value == null) return 'Rate not set';
  const lower = String(rateText || '').toLowerCase();
  const isHourly = /hour|hr|\/h\b/.test(lower);
  if (isHourly) {
    if (value < 15) return 'Under £15/hr';
    if (value < 20) return '£15–£19/hr';
    if (value < 25) return '£20–£24/hr';
    if (value < 30) return '£25–£29/hr';
    return '£30+/hr';
  }
  if (value < 140) return 'Under £140/day';
  if (value < 180) return '£140–£179/day';
  if (value < 220) return '£180–£219/day';
  if (value < 260) return '£220–£259/day';
  return '£260+/day';
}

function mapRankedRows(rows, { labelKey = 'label', valueKey = 'count' } = {}) {
  const list = (rows || []).map((row) => ({
    label: String(row[labelKey] || '').trim() || 'Unknown',
    count: Number(row[valueKey] || 0),
  })).filter((item) => item.count > 0);
  const max = list.reduce((sum, item) => Math.max(sum, item.count), 0);
  const total = list.reduce((sum, item) => sum + item.count, 0);
  return list.map((item) => ({
    ...item,
    share: percent(item.count, total),
    intensity: percent(item.count, max),
  }));
}

async function computeLiveInsights() {
  await ensureSearchEventsSchema();

  const [
    searchTrades,
    searchCities,
    searchQueries,
    searchTotals,
    appliedTrades,
    appliedCities,
    appliedRates,
    openTrades,
    openCities,
    workerTrades,
    workerCities,
    activity,
  ] = await Promise.all([
    pool.query(
      `SELECT trade AS label, COUNT(*)::int AS count
       FROM job_search_events
       WHERE created_at >= NOW() - make_interval(days => $1)
         AND trade IS NOT NULL
         AND trade <> ''
       GROUP BY trade
       ORDER BY count DESC, trade ASC
       LIMIT 8`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(city, ''), NULLIF(location, ''), 'Unknown') AS label,
              COUNT(*)::int AS count
       FROM job_search_events
       WHERE created_at >= NOW() - make_interval(days => $1)
         AND (
           (city IS NOT NULL AND city <> '')
           OR (location IS NOT NULL AND location <> '')
         )
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT query_text AS label, COUNT(*)::int AS count
       FROM job_search_events
       WHERE created_at >= NOW() - make_interval(days => $1)
         AND query_text IS NOT NULL
         AND query_text <> ''
       GROUP BY query_text
       ORDER BY count DESC, query_text ASC
       LIMIT 8`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_searches,
         COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS searches_today,
         COUNT(DISTINCT COALESCE(user_id::text, id::text))::int AS unique_searchers
       FROM job_search_events
       WHERE created_at >= NOW() - make_interval(days => $1)`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(j.trade_required, ''), 'Trade not set') AS label,
              COUNT(*)::int AS count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.created_at >= NOW() - make_interval(days => $1)
         AND a.status <> 'withdrawn'
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(j.city, ''), 'Location not set') AS label,
              COUNT(*)::int AS count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.created_at >= NOW() - make_interval(days => $1)
         AND a.status <> 'withdrawn'
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT j.rate, COUNT(*)::int AS count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.created_at >= NOW() - make_interval(days => $1)
         AND a.status <> 'withdrawn'
       GROUP BY j.rate
       ORDER BY count DESC
       LIMIT 40`,
      [LOOKBACK_DAYS]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(trade_required, ''), 'Trade not set') AS label,
              COUNT(*)::int AS count
       FROM jobs
       WHERE ${OPEN_WORKER_APPLYABLE_JOB_FILTER}
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(city, ''), 'Location not set') AS label,
              COUNT(*)::int AS count
       FROM jobs
       WHERE ${OPEN_WORKER_APPLYABLE_JOB_FILTER}
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`
    ),
    pool.query(
      `SELECT trade AS label, COUNT(*)::int AS count
       FROM (
         SELECT UNNEST(COALESCE(trades, ARRAY[]::text[])) AS trade
         FROM worker_profiles wp
         JOIN users u ON u.id = wp.user_id
         WHERE u.status = 'active'
         UNION ALL
         SELECT UNNEST(COALESCE(trade_interests, ARRAY[]::text[])) AS trade
         FROM worker_profiles wp
         JOIN users u ON u.id = wp.user_id
         WHERE u.status = 'active'
       ) trades
       WHERE trade IS NOT NULL AND trade <> ''
       GROUP BY trade
       ORDER BY count DESC, trade ASC
       LIMIT 8`
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(city, ''), 'Location not set') AS label,
              COUNT(*)::int AS count
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active'
       GROUP BY 1
       ORDER BY count DESC, label ASC
       LIMIT 8`
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM applications WHERE created_at >= NOW() - make_interval(days => $1) AND status <> 'withdrawn') AS applications_30d,
         (SELECT COUNT(*)::int FROM applications WHERE created_at::date = CURRENT_DATE AND status <> 'withdrawn') AS applications_today,
         (SELECT COUNT(*)::int FROM jobs WHERE ${OPEN_WORKER_APPLYABLE_JOB_FILTER}) AS open_jobs,
         (SELECT COUNT(*)::int FROM users WHERE role = 'worker' AND status = 'active') AS active_workers,
         (SELECT COUNT(*)::int FROM users WHERE role = 'company' AND status = 'active') AS active_companies`,
      [LOOKBACK_DAYS]
    ),
  ]);

  const rateBands = new Map();
  (appliedRates.rows || []).forEach((row) => {
    const band = rateBand(row.rate);
    rateBands.set(band, (rateBands.get(band) || 0) + Number(row.count || 0));
  });
  const attractingRates = mapRankedRows(
    [...rateBands.entries()].map(([label, count]) => ({ label, count })),
  ).sort((a, b) => b.count - a.count).slice(0, 6);

  const searchedTrades = mapRankedRows(searchTrades.rows);
  const demandedTrades = mapRankedRows(appliedTrades.rows);
  const topTrades = searchedTrades.length ? searchedTrades : demandedTrades;

  const searchedCities = mapRankedRows(searchCities.rows);
  const demandedCities = mapRankedRows(appliedCities.rows);
  const topCities = searchedCities.length ? searchedCities : demandedCities;

  const totals = searchTotals.rows[0] || {};
  const platform = activity.rows[0] || {};

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    summary: {
      searches30d: Number(totals.total_searches || 0),
      searchesToday: Number(totals.searches_today || 0),
      uniqueSearchers: Number(totals.unique_searchers || 0),
      applications30d: Number(platform.applications_30d || 0),
      applicationsToday: Number(platform.applications_today || 0),
      openJobs: Number(platform.open_jobs || 0),
      activeWorkers: Number(platform.active_workers || 0),
      activeCompanies: Number(platform.active_companies || 0),
      searchCoverage: searchedTrades.length ? 'search_engine' : 'platform_demand',
    },
    mostSearchedJobs: mapRankedRows(searchQueries.rows).length
      ? mapRankedRows(searchQueries.rows)
      : topTrades,
    mostSearchedTrades: topTrades,
    searchCities: topCities,
    attractingRates,
    openJobTrades: mapRankedRows(openTrades.rows),
    openJobCities: mapRankedRows(openCities.rows),
    workerTrades: mapRankedRows(workerTrades.rows),
    workerCities: mapRankedRows(workerCities.rows),
    demandVsSupply: topTrades.slice(0, 6).map((trade) => {
      const supply = mapRankedRows(openTrades.rows).find(
        (item) => item.label.toLowerCase() === trade.label.toLowerCase()
      );
      return {
        label: trade.label,
        demand: trade.count,
        demandShare: trade.share,
        supply: supply?.count || 0,
        supplyShare: supply?.share || 0,
        gap: trade.count - (supply?.count || 0),
      };
    }),
  };
}

async function saveDailySnapshot(insights = null) {
  await ensureSearchEventsSchema();
  const payload = insights || await computeLiveInsights();
  const snapshotDate = toIsoDate(new Date());

  await pool.query(
    `INSERT INTO market_stats_snapshots (snapshot_date, payload)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (snapshot_date) DO UPDATE SET
       payload = EXCLUDED.payload,
       updated_at = NOW()`,
    [snapshotDate, JSON.stringify(payload)]
  );

  lastSnapshotDate = snapshotDate;
  return { snapshotDate, payload };
}

async function getRecentSnapshots(limit = 7) {
  await ensureSearchEventsSchema();
  const result = await pool.query(
    `SELECT snapshot_date, payload, updated_at
     FROM market_stats_snapshots
     ORDER BY snapshot_date DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => ({
    date: toIsoDate(row.snapshot_date),
    updatedAt: row.updated_at,
    payload: row.payload,
  }));
}

async function getCompanyMarketInsights() {
  const live = await computeLiveInsights();
  const snapshots = await getRecentSnapshots(7);

  // Ensure today's snapshot exists / is refreshed when companies open the page.
  const today = toIsoDate(new Date());
  if (!snapshots.length || snapshots[0].date !== today || lastSnapshotDate !== today) {
    await saveDailySnapshot(live);
  }

  const trend = [...snapshots].reverse().map((snap) => ({
    date: snap.date,
    searches: Number(snap.payload?.summary?.searches30d || 0),
    applications: Number(snap.payload?.summary?.applications30d || 0),
    openJobs: Number(snap.payload?.summary?.openJobs || 0),
  }));

  // Prefer live for current cards; keep trend from stored days.
  if (!trend.some((item) => item.date === today)) {
    trend.push({
      date: today,
      searches: live.summary.searches30d,
      applications: live.summary.applications30d,
      openJobs: live.summary.openJobs,
    });
  }

  return {
    ...live,
    trend: trend.slice(-7),
    updatedDaily: true,
  };
}

async function runDailyMarketStatsRefresh() {
  const result = await saveDailySnapshot();
  return {
    snapshotDate: result.snapshotDate,
    searches30d: result.payload.summary.searches30d,
    applications30d: result.payload.summary.applications30d,
  };
}

module.exports = {
  computeLiveInsights,
  getCompanyMarketInsights,
  runDailyMarketStatsRefresh,
  saveDailySnapshot,
};
