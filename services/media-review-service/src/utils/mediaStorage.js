const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');

function resolveUploadPath(filePath) {
  const filename = String(filePath || '').replace(/^\/uploads\//, '');
  return path.join(env.uploadDir, filename);
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

  await deleteFileIfExists(resolveUploadPath(filePath));

  const thumbnailCandidates = [
    thumbnailPath,
    guessThumbnailPath(filePath),
  ].filter(Boolean);

  for (const candidate of thumbnailCandidates) {
    await deleteFileIfExists(resolveUploadPath(candidate));
  }
}

module.exports = {
  purgeMediaFromPlatform,
  resolveUploadPath,
};
