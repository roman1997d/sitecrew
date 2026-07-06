const fs = require('fs/promises');
const path = require('path');

const PUBLIC_ROOT = path.join(__dirname, '../../..', 'public');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function sanitizeFilename(originalName = 'image.jpg') {
  const extension = path.extname(originalName).toLowerCase();
  const safeExtension = ALLOWED_EXTENSIONS.has(extension) ? extension : '.jpg';
  const base = path.basename(originalName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'image';

  return `${Date.now()}-${base}${safeExtension}`;
}

async function savePublicOgImage(file, category = 'custom') {
  if (!file?.path) {
    const error = new Error('Image file is required.');
    error.statusCode = 400;
    throw error;
  }

  const extension = path.extname(file.originalname || file.path).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    const error = new Error('Only JPG, PNG, WebP, or GIF images are allowed.');
    error.statusCode = 400;
    throw error;
  }

  const targetDir = path.join(PUBLIC_ROOT, 'images', 'og', category);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = sanitizeFilename(file.originalname || `image${extension}`);
  const destination = path.join(targetDir, filename);
  await fs.copyFile(file.path, destination);

  return `/images/og/${category}/${filename}`;
}

module.exports = {
  savePublicOgImage,
};
