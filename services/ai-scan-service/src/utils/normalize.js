function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function combineScanText({ text = '', title = '' }) {
  return [title, text].filter(Boolean).join('\n').trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9@.+]+/)
    .filter(Boolean);
}

module.exports = {
  normalizeText,
  combineScanText,
  tokenize,
};
