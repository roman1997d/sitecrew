const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const pool = require('../db/pool');
const env = require('../config/env');
const {
  normalizeStoredImagePath,
  readImagePreviewBuffer,
  resolveUploadPath,
} = require('./imageProcessing');

const uploadDir = path.join(__dirname, '../..', env.uploadDir);

function resolveUploadPathLegacy(filePath) {
  return resolveUploadPath(filePath);
}

function guessThumbnailPath(filePath) {
  if (!filePath) {
    return null;
  }

  const parsed = path.parse(filePath);
  return `${parsed.dir}/${parsed.name}-thumb${parsed.ext}`;
}

async function deleteFileIfExists(absolutePath) {
  if (!absolutePath) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function purgeMediaFromPlatform(client, filePath, thumbnailPath = null) {
  await client.query(
    `UPDATE feed_posts
     SET media_urls = COALESCE(
       (SELECT array_agg(value) FROM unnest(media_urls) AS value WHERE value <> $1),
       '{}'
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE $1 = ANY(media_urls)`,
    [filePath]
  );

  await client.query('DELETE FROM stories WHERE media_url = $1', [filePath]);

  await client.query(
    `UPDATE worker_profiles
     SET profile_photo = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE profile_photo = $1`,
    [filePath]
  );

  await client.query(
    `UPDATE company_profiles
     SET logo = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE logo = $1`,
    [filePath]
  );

  await deleteFileIfExists(resolveUploadPathLegacy(filePath));

  const thumbnailCandidates = [thumbnailPath, guessThumbnailPath(filePath)].filter(Boolean);
  for (const candidate of thumbnailCandidates) {
    await deleteFileIfExists(resolveUploadPathLegacy(candidate));
  }
}

async function getPendingMediaRows() {
  const result = await pool.query(
    `SELECT id, file_path, thumbnail_path, created_at
     FROM media_review_queue
     WHERE review_status = 'pending'
     ORDER BY created_at ASC, id ASC`
  );

  return result.rows;
}

async function markMissingMediaAsRejected(id) {
  await pool.query(
    `UPDATE media_review_queue
     SET review_status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );
}

async function getValidPendingMediaRows() {
  const rows = await getPendingMediaRows();
  const validRows = [];

  for (const row of rows) {
    const absolutePath = resolveUploadPathLegacy(row.file_path);
    if (!fsSync.existsSync(absolutePath)) {
      await markMissingMediaAsRejected(row.id);
      continue;
    }

    try {
      row.file_path = await normalizeStoredImagePath(row.file_path);
    } catch (error) {
      console.warn('[mediaReview] Failed to normalize image:', row.file_path, error.message);
    }

    validRows.push(row);
  }

  return validRows;
}

async function getMediaReviewStats() {
  const validRows = await getValidPendingMediaRows();
  return { pending: validRows.length };
}

async function getNextMediaReviewItem() {
  const validRows = await getValidPendingMediaRows();

  if (!validRows.length) {
    return { item: null, total: 0 };
  }

  const row = validRows[0];
  return {
    item: {
      id: row.id,
      filePath: row.file_path,
      position: 1,
      total: validRows.length,
    },
    total: validRows.length,
  };
}

async function getMediaReviewPreview(id) {
  const result = await pool.query(
    `SELECT id, file_path
     FROM media_review_queue
     WHERE id = $1 AND review_status = 'pending'`,
    [id]
  );

  if (result.rowCount === 0) {
    const error = new Error('Queue item not found');
    error.status = 404;
    throw error;
  }

  const row = result.rows[0];
  const absolutePath = resolveUploadPathLegacy(row.file_path);

  if (!fsSync.existsSync(absolutePath)) {
    await markMissingMediaAsRejected(row.id);
    const error = new Error('Image file is missing from storage');
    error.status = 404;
    throw error;
  }

  const preview = await readImagePreviewBuffer(row.file_path);
  return preview;
}

async function approveMediaReviewItem(id) {
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

async function rejectMediaReviewItem(id) {
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
  getMediaReviewStats,
  getNextMediaReviewItem,
  getMediaReviewPreview,
  approveMediaReviewItem,
  rejectMediaReviewItem,
};
