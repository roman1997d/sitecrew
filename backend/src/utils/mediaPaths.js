function normalizeMediaPath(value) {
  if (!value) return null;

  let assetPath = String(value).trim();
  if (!assetPath) return null;

  if (/^https?:\/\//i.test(assetPath)) {
    try {
      assetPath = new URL(assetPath).pathname;
    } catch (error) {
      return assetPath;
    }
  }

  return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
}

function normalizeMediaList(values = []) {
  return values.map((value) => normalizeMediaPath(value)).filter(Boolean);
}

module.exports = {
  normalizeMediaPath,
  normalizeMediaList,
};
