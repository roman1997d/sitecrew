const pool = require('../../db/pool');

let schemaReady = false;

async function ensureSearchEventsSchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_search_events (
      id BIGSERIAL PRIMARY KEY,
      source VARCHAR(40) NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_role VARCHAR(20),
      query_text VARCHAR(200),
      trade VARCHAR(120),
      city VARCHAR(120),
      location VARCHAR(120),
      result_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_search_events_created
      ON job_search_events(created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_search_events_trade
      ON job_search_events(trade, created_at DESC)
      WHERE trade IS NOT NULL AND trade <> ''
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_search_events_city
      ON job_search_events(city, created_at DESC)
      WHERE city IS NOT NULL AND city <> ''
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_stats_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_date DATE NOT NULL UNIQUE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  schemaReady = true;
}

function cleanText(value, max = 120) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return text.slice(0, max);
}

async function logJobSearchEvent({
  source,
  userId = null,
  userRole = null,
  queryText = null,
  trade = null,
  city = null,
  location = null,
  resultCount = 0,
} = {}) {
  try {
    await ensureSearchEventsSchema();

    const normalizedTrade = cleanText(trade);
    const normalizedCity = cleanText(city);
    const normalizedLocation = cleanText(location);
    const normalizedQuery = cleanText(queryText, 200);

    // Ignore empty browsing with no search intent.
    if (!normalizedTrade && !normalizedCity && !normalizedLocation && !normalizedQuery) {
      return;
    }

    await pool.query(
      `INSERT INTO job_search_events
         (source, user_id, user_role, query_text, trade, city, location, result_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        cleanText(source, 40) || 'unknown',
        userId || null,
        cleanText(userRole, 20),
        normalizedQuery,
        normalizedTrade,
        normalizedCity,
        normalizedLocation,
        Math.max(0, Number(resultCount) || 0),
      ]
    );
  } catch (error) {
    console.error('Failed to log job search event:', error.message);
  }
}

module.exports = {
  ensureSearchEventsSchema,
  logJobSearchEvent,
};
