const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

const uploadDir = path.join(__dirname, '../../uploads');

const seedMediaMap = {
  '/uploads/feed/reception.jpg': '/uploads/1780862713248-img-8611.jpeg',
  '/uploads/feed/apex-update.jpg': '/uploads/1780862626579-profile.jpg',
  '/uploads/feed/northbuild-update.jpg': '/uploads/1781118742831-cloud.jpg',
  '/uploads/stories/apex.jpg': '/uploads/1780862626579-profile.jpg',
  '/uploads/stories/northbuild.jpg': '/uploads/1781118742831-cloud.jpg',
  '/uploads/stories/skyline.jpg': '/uploads/1780862713248-img-8611.jpeg',
  '/uploads/alex.jpg': '/uploads/1780862626579-profile.jpg',
  '/uploads/maria.jpg': '/uploads/1780862713248-img-8611.jpeg',
  '/uploads/apex.png': '/uploads/1780862626579-profile.jpg',
  '/uploads/northbuild.png': '/uploads/1781118742831-cloud.jpg',
  '/uploads/skyline.png': '/uploads/1780862713248-img-8611.jpeg',
};

function normalizeMediaPath(value) {
  if (!value) return null;

  let assetPath = String(value).trim();
  if (/^https?:\/\//i.test(assetPath)) {
    try {
      assetPath = new URL(assetPath).pathname;
    } catch (error) {
      return assetPath;
    }
  }

  if (!assetPath.startsWith('/')) {
    assetPath = `/${assetPath}`;
  }

  if (seedMediaMap[assetPath]) {
    return seedMediaMap[assetPath];
  }

  const absolutePath = path.join(uploadDir, assetPath.replace(/^\/uploads\//, ''));
  if (fs.existsSync(absolutePath)) {
    return assetPath;
  }

  const availableFiles = fs.readdirSync(uploadDir).filter((file) => !file.startsWith('.'));
  if (!availableFiles.length) {
    return assetPath;
  }

  const fallbackFile = availableFiles.find((file) => /\.(jpe?g|png|gif|webp)$/i.test(file)) || availableFiles[0];
  return `/uploads/${fallbackFile}`;
}

async function fixMediaArray(values = []) {
  return values.map((value) => normalizeMediaPath(value)).filter(Boolean);
}

async function run() {
  const feedPosts = await pool.query('SELECT id, media_urls FROM feed_posts');
  let feedUpdates = 0;

  for (const post of feedPosts.rows) {
    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    if (!mediaUrls.length) continue;

    const fixed = await fixMediaArray(mediaUrls);
    if (JSON.stringify(fixed) === JSON.stringify(mediaUrls)) continue;

    await pool.query('UPDATE feed_posts SET media_urls = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      post.id,
      fixed,
    ]);
    feedUpdates += 1;
  }

  const stories = await pool.query('SELECT id, media_url FROM stories WHERE media_url IS NOT NULL');
  let storyUpdates = 0;

  for (const story of stories.rows) {
    const fixed = normalizeMediaPath(story.media_url);
    if (!fixed || fixed === story.media_url) continue;

    await pool.query('UPDATE stories SET media_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      story.id,
      fixed,
    ]);
    storyUpdates += 1;
  }

  const workers = await pool.query('SELECT user_id, profile_photo FROM worker_profiles WHERE profile_photo IS NOT NULL');
  let workerUpdates = 0;

  for (const worker of workers.rows) {
    const fixed = normalizeMediaPath(worker.profile_photo);
    if (!fixed || fixed === worker.profile_photo) continue;

    await pool.query('UPDATE worker_profiles SET profile_photo = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1', [
      worker.user_id,
      fixed,
    ]);
    workerUpdates += 1;
  }

  const companies = await pool.query('SELECT user_id, logo FROM company_profiles WHERE logo IS NOT NULL');
  let companyUpdates = 0;

  for (const company of companies.rows) {
    const fixed = normalizeMediaPath(company.logo);
    if (!fixed || fixed === company.logo) continue;

    await pool.query('UPDATE company_profiles SET logo = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1', [
      company.user_id,
      fixed,
    ]);
    companyUpdates += 1;
  }

  console.log('Media URL repair complete.');
  console.log({
    feedPostsUpdated: feedUpdates,
    storiesUpdated: storyUpdates,
    workerPhotosUpdated: workerUpdates,
    companyLogosUpdated: companyUpdates,
    uploadFiles: fs.readdirSync(uploadDir).length,
  });

  await pool.end();
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
