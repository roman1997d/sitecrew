const pool = require('../db/pool');
const env = require('../config/env');
const { purgeMediaFromPlatform } = require('../utils/mediaStorage');

function buildImageUrl(filePath) {
  return `${env.publicUploadBaseUrl}${filePath}`;
}

async function getQueueStats() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS pending
     FROM media_review_queue
     WHERE review_status = 'pending'`
  );

  return { pending: result.rows[0]?.pending || 0 };
}

async function getNextQueueItem() {
  const result = await pool.query(
    `WITH pending AS (
       SELECT
         id,
         file_path,
         thumbnail_path,
         created_at,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS position
       FROM media_review_queue
       WHERE review_status = 'pending'
     )
     SELECT
       id,
       file_path,
       thumbnail_path,
       created_at,
       position::int,
       (SELECT COUNT(*)::int FROM pending) AS total
     FROM pending
     ORDER BY position ASC
     LIMIT 1`
  );

  if (result.rowCount === 0) {
    return { item: null, total: 0 };
  }

  const row = result.rows[0];
  return {
    item: {
      id: row.id,
      imageUrl: buildImageUrl(row.file_path),
      filePath: row.file_path,
      position: row.position,
      total: row.total,
    },
    total: row.total,
  };
}

async function approveQueueItem(id) {
  const result = await pool.query(
    `UPDATE media_review_queue
     SET review_status = 'reviewed', reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND review_status = 'pending'
     RETURNING id, file_path, review_status, reviewed_at`,
    [id]
  );

  if (result.rowCount === 0) {
    const error = new Error('Queue item not found');
    error.status = 404;
    throw error;
  }

  return { item: result.rows[0] };
}

async function rejectQueueItem(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, file_path, thumbnail_path
       FROM media_review_queue
       WHERE id = $1 AND review_status = 'pending'
       FOR UPDATE`,
      [id]
    );

    if (existing.rowCount === 0) {
      const error = new Error('Queue item not found');
      error.status = 404;
      throw error;
    }

    const row = existing.rows[0];
    await purgeMediaFromPlatform(client, row.file_path, row.thumbnail_path);

    const updated = await client.query(
      `UPDATE media_review_queue
       SET review_status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, file_path, review_status, reviewed_at`,
      [id]
    );

    await client.query('COMMIT');
    return { item: updated.rows[0], deleted: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getQueueStats,
  getNextQueueItem,
  approveQueueItem,
  rejectQueueItem,
};
