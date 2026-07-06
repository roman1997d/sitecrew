const fs = require('fs');
const path = require('path');
const { absoluteUrl } = require('./seo');

const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const OG_PRESETS_DIR = path.join(PUBLIC_ROOT, 'images', 'og', 'presets');
const ALLOWED_OG_PATH_PREFIXES = ['/images/', '/assets/', '/uploads/'];
const ALLOWED_OG_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isAbsoluteHttpUrl(value = '') {
  return /^https?:\/\//i.test(String(value).trim());
}

function normalizeOgImagePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (isAbsoluteHttpUrl(raw)) {
    return raw;
  }

  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  const isAllowed = ALLOWED_OG_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isAllowed) {
    return '';
  }

  const extension = path.extname(normalized.split('?')[0]).toLowerCase();
  if (!ALLOWED_OG_EXTENSIONS.has(extension)) {
    return '';
  }

  return normalized;
}

function resolveOgImageUrl(value, fallbackPath = '/images/og-default.png') {
  const normalized = normalizeOgImagePath(value);
  if (normalized) {
    return isAbsoluteHttpUrl(normalized) ? normalized : absoluteUrl(normalized);
  }

  const fallback = normalizeOgImagePath(fallbackPath) || '/images/og-default.png';
  return absoluteUrl(fallback);
}

function resolveOgImageFromSources(sources = [], fallbackPath = '/images/og-default.png') {
  for (const source of sources) {
    const normalized = normalizeOgImagePath(source);
    if (normalized) {
      return resolveOgImageUrl(normalized);
    }
  }

  return resolveOgImageUrl('', fallbackPath);
}

function listOgPresetImages() {
  try {
    if (!fs.existsSync(OG_PRESETS_DIR)) {
      return [];
    }

    return fs.readdirSync(OG_PRESETS_DIR)
      .filter((filename) => ALLOWED_OG_EXTENSIONS.has(path.extname(filename).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((filename) => {
        const imagePath = `/images/og/presets/${filename}`;
        const stats = fs.statSync(path.join(OG_PRESETS_DIR, filename));
        return {
          filename,
          path: imagePath,
          url: absoluteUrl(imagePath),
          label: filename
            .replace(path.extname(filename), '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()),
          updatedAt: stats.mtime.toISOString(),
        };
      });
  } catch (error) {
    return [];
  }
}

function sanitizeOgPresetFilename(filename = '') {
  const base = path.basename(String(filename || '').trim());
  if (!base || base !== String(filename || '').trim() || base.includes('..')) {
    return null;
  }

  if (!ALLOWED_OG_EXTENSIONS.has(path.extname(base).toLowerCase())) {
    return null;
  }

  return base;
}

function deleteOgPresetImage(filename) {
  const safeName = sanitizeOgPresetFilename(filename);
  if (!safeName) {
    const error = new Error('Invalid preset image filename.');
    error.statusCode = 400;
    throw error;
  }

  const absolutePath = path.join(OG_PRESETS_DIR, safeName);
  if (!fs.existsSync(absolutePath)) {
    const error = new Error('Preset image not found.');
    error.statusCode = 404;
    throw error;
  }

  fs.unlinkSync(absolutePath);
  return {
    filename: safeName,
    path: `/images/og/presets/${safeName}`,
  };
}

module.exports = {
  OG_PRESETS_DIR,
  normalizeOgImagePath,
  resolveOgImageUrl,
  resolveOgImageFromSources,
  listOgPresetImages,
  sanitizeOgPresetFilename,
  deleteOgPresetImage,
};
