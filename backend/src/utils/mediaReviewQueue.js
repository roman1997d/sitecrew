const pool = require('../db/pool');
const { normalizeUploadedFiles } = require('./imageProcessing');

const IMAGE_UPLOAD_PREFIX = '/uploads/';

async function enqueueMediaForReview(filePath, thumbnailPath = null) {
  if (!filePath || !filePath.startsWith(IMAGE_UPLOAD_PREFIX)) {
    return;
  }

  await pool.query(
    `INSERT INTO media_review_queue (file_path, thumbnail_path)
     VALUES ($1, $2)
     ON CONFLICT (file_path) DO NOTHING`,
    [filePath, thumbnailPath]
  );
}

async function enqueueUploadedFiles(files, thumbnailPaths = []) {
  if (!files?.length) {
    return;
  }

  await normalizeUploadedFiles(files);

  await Promise.all(
    files.map((file, index) =>
      enqueueMediaForReview(`/uploads/${file.filename}`, thumbnailPaths[index] || null)
    )
  );
}

async function enqueueUploadedFile(file, thumbnailPath = null) {
  if (!file) {
    return null;
  }

  await normalizeUploadedFiles([file]);
  const filePath = `/uploads/${file.filename}`;
  await enqueueMediaForReview(filePath, thumbnailPath);
  return filePath;
}

module.exports = {
  enqueueMediaForReview,
  enqueueUploadedFiles,
  enqueueUploadedFile,
};
