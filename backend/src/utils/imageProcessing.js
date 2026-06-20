const fs = require('fs/promises');
const path = require('path');
const convert = require('heic-convert');
const pool = require('../db/pool');
const env = require('../config/env');

const uploadDir = path.join(__dirname, '../..', env.uploadDir);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif', '.heics']);

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function resolveUploadPath(filePath) {
  const filename = String(filePath || '').replace(/^\/uploads\//, '');
  return path.join(uploadDir, filename);
}

function toUploadPath(absolutePath) {
  return `/uploads/${path.basename(absolutePath)}`;
}

function isHeicFile(filePath) {
  return HEIC_EXTENSIONS.has(path.extname(String(filePath || '')).toLowerCase());
}

async function convertHeicAbsolutePathToJpeg(absolutePath) {
  const inputBuffer = await fs.readFile(absolutePath);
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92,
  });

  const parsed = path.parse(absolutePath);
  const jpegPath = path.join(parsed.dir, `${parsed.name}.jpg`);
  await fs.writeFile(jpegPath, Buffer.from(outputBuffer));
  await fs.unlink(absolutePath).catch(() => {});

  return jpegPath;
}

async function replaceStoredMediaPath(oldPath, newPath) {
  await pool.query(
    `UPDATE media_review_queue
     SET file_path = $2
     WHERE file_path = $1`,
    [oldPath, newPath]
  );

  await pool.query(
    `UPDATE feed_posts
     SET media_urls = COALESCE(
       (SELECT array_agg(CASE WHEN value = $1 THEN $2 ELSE value END) FROM unnest(media_urls) AS value),
       '{}'
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE $1 = ANY(media_urls)`,
    [oldPath, newPath]
  );

  await pool.query('UPDATE stories SET media_url = $2 WHERE media_url = $1', [oldPath, newPath]);

  await pool.query(
    `UPDATE worker_profiles
     SET profile_photo = $2, updated_at = CURRENT_TIMESTAMP
     WHERE profile_photo = $1`,
    [oldPath, newPath]
  );

  await pool.query(
    `UPDATE company_profiles
     SET logo = $2, updated_at = CURRENT_TIMESTAMP
     WHERE logo = $1`,
    [oldPath, newPath]
  );
}

async function normalizeStoredImagePath(filePath) {
  if (!filePath || !isHeicFile(filePath)) {
    return filePath;
  }

  const absolutePath = resolveUploadPath(filePath);
  const jpegPath = await convertHeicAbsolutePathToJpeg(absolutePath);
  const newPath = toUploadPath(jpegPath);

  if (newPath !== filePath) {
    await replaceStoredMediaPath(filePath, newPath);
  }

  return newPath;
}

async function normalizeUploadedFiles(files = []) {
  if (!files?.length) {
    return files;
  }

  for (const file of files) {
    const absolutePath = file.path || path.join(uploadDir, file.filename);
    if (!isHeicFile(absolutePath)) {
      continue;
    }

    const jpegPath = await convertHeicAbsolutePathToJpeg(absolutePath);
    file.filename = path.basename(jpegPath);
    file.path = jpegPath;
    file.mimetype = 'image/jpeg';
  }

  return files;
}

async function readImagePreviewBuffer(filePath) {
  const normalizedPath = await normalizeStoredImagePath(filePath);
  const absolutePath = resolveUploadPath(normalizedPath);
  const buffer = await fs.readFile(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();

  return {
    buffer,
    contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
    filePath: normalizedPath,
  };
}

module.exports = {
  isHeicFile,
  normalizeStoredImagePath,
  normalizeUploadedFiles,
  readImagePreviewBuffer,
  replaceStoredMediaPath,
  resolveUploadPath,
};
