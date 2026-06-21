const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const optionalAuth = require('../../middleware/optionalAuth');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const asyncHandler = require('../../utils/asyncHandler');
const {
  evaluateContent,
  logContentScan,
  getRecentFeedTexts,
  getRecentCommentTexts,
} = require('../../utils/contentModeration');
const { enqueueUploadedFiles } = require('../../utils/mediaReviewQueue');
const { normalizeMediaList, normalizeMediaPath } = require('../../utils/mediaPaths');

const router = express.Router();

function mapFeedPostRow(row) {
  return {
    ...row,
    media_urls: normalizeMediaList(row.media_urls || []),
    author_avatar: normalizeMediaPath(row.author_avatar),
  };
}

const postSchema = z.object({
  body: z.object({
    postType: z.enum(['work_completed', 'progress', 'skills', 'certification', 'company_update']).default('work_completed'),
    title: z.string().min(2).optional(),
    caption: z.string().min(2),
    mediaUrls: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    location: z.string().optional(),
    projectSize: z.string().optional(),
    duration: z.string().optional(),
    companyId: z.number().int().positive().optional(),
  }),
});

const commentSchema = z.object({
  body: z.object({
    body: z.string().min(1),
  }),
});

async function getPostAuthorId(req, companyId) {
  if (!companyId) return req.user.id;

  if (req.user.role === 'company' && Number(companyId) === Number(req.user.id)) {
    return req.user.id;
  }

  if (req.user.role !== 'worker') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  const permission = await pool.query(
    `SELECT 1
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.worker_id = $1
       AND j.company_id = $2
       AND a.status = 'accepted'
       AND a.can_post_company_posts = TRUE
     LIMIT 1`,
    [req.user.id, companyId]
  );

  if (permission.rowCount === 0) {
    const error = new Error('You do not have permission to post for this company.');
    error.status = 403;
    throw error;
  }

  return companyId;
}

async function getPostLikeCount(postId) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM feed_likes WHERE post_id = $1',
    [postId]
  );
  return result.rows[0].count;
}

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { type } = req.query;
  const viewerId = req.user?.id || null;
  const result = await pool.query(
    `SELECT
       fp.*,
       u.role AS author_role,
       COALESCE(wp.full_name, cp.company_name) AS author_name,
       COALESCE(wp.profile_photo, cp.logo) AS author_avatar,
       wp.verification_status AS author_verification_status,
       creator.id AS created_by_id,
       creator.role AS created_by_role,
       COALESCE(creator_wp.full_name, creator_cp.company_name) AS created_by_name,
       (SELECT COUNT(*)::int FROM feed_likes WHERE post_id = fp.id) AS like_count,
       (SELECT COUNT(*)::int
        FROM feed_comments
        WHERE post_id = fp.id
          AND COALESCE(moderation_status, 'visible') = 'visible') AS comment_count,
       CASE
         WHEN $2::int IS NOT NULL THEN EXISTS(
           SELECT 1 FROM feed_likes WHERE post_id = fp.id AND user_id = $2
         )
         ELSE FALSE
       END AS liked_by_me,
       CASE
         WHEN $2::int IS NOT NULL THEN EXISTS(
           SELECT 1 FROM feed_saved_posts WHERE post_id = fp.id AND user_id = $2
         )
         ELSE FALSE
       END AS saved_by_me
     FROM feed_posts fp
     JOIN users u ON u.id = fp.author_id
     LEFT JOIN users creator ON creator.id = COALESCE(fp.created_by_user_id, fp.author_id)
     LEFT JOIN worker_profiles wp ON wp.user_id = fp.author_id
     LEFT JOIN company_profiles cp ON cp.user_id = fp.author_id
     LEFT JOIN worker_profiles creator_wp ON creator_wp.user_id = creator.id
     LEFT JOIN company_profiles creator_cp ON creator_cp.user_id = creator.id
     WHERE ($1::text IS NULL OR fp.post_type = $1)
       AND COALESCE(fp.moderation_status, 'visible') = 'visible'
     ORDER BY fp.created_at DESC
     LIMIT 50`,
    [type || null, viewerId]
  );
  res.json({ posts: result.rows.map(mapFeedPostRow) });
}));

router.get('/saved', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       fp.*,
       fsp.created_at AS saved_at,
       u.role AS author_role,
       COALESCE(wp.full_name, cp.company_name) AS author_name
     FROM feed_saved_posts fsp
     JOIN feed_posts fp ON fp.id = fsp.post_id
     JOIN users u ON u.id = fp.author_id
     LEFT JOIN worker_profiles wp ON wp.user_id = fp.author_id
     LEFT JOIN company_profiles cp ON cp.user_id = fp.author_id
     WHERE fsp.user_id = $1
       AND COALESCE(fp.moderation_status, 'visible') = 'visible'
     ORDER BY fsp.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json({ posts: result.rows.map(mapFeedPostRow) });
}));

router.post('/posts', requireAuth, validate(postSchema), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const mediaUrls = normalizeMediaList(payload.mediaUrls);
  const authorId = await getPostAuthorId(req, payload.companyId);
  const recentTexts = await getRecentFeedTexts(authorId);
  const moderation = await evaluateContent({
    contentType: 'feed_post',
    text: payload.caption,
    title: payload.title,
    recentTexts,
  });
  const result = await pool.query(
    `INSERT INTO feed_posts (author_id, created_by_user_id, post_type, title, caption, media_urls, tags, location, project_size, duration, moderation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      authorId,
      req.user.id,
      payload.companyId ? 'company_update' : payload.postType,
      payload.title || null,
      payload.caption,
      mediaUrls,
      payload.tags,
      payload.location || null,
      payload.projectSize || null,
      payload.duration || null,
      moderation.moderationStatus,
    ]
  );

  await logContentScan({
    entityType: 'feed_post',
    entityId: result.rows[0].id,
    contentType: 'feed_post',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  res.status(201).json({
    post: mapFeedPostRow(result.rows[0]),
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  });
}));

router.post('/posts/upload', requireAuth, upload.array('media', 5), asyncHandler(async (req, res) => {
  await enqueueUploadedFiles(req.files);
  const mediaUrls = req.files.map((file) => `/uploads/${file.filename}`);
  res.status(201).json({ mediaUrls });
}));

router.patch('/posts/:id', requireAuth, validate(z.object({ body: postSchema.shape.body.partial() })), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const existing = await pool.query(
    `SELECT *
     FROM feed_posts
     WHERE id = $1
       AND (author_id = $2 OR created_by_user_id = $2)`,
    [req.params.id, req.user.id]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Post not found or you do not have permission to edit it.' });
  }

  const current = existing.rows[0];
  const nextTitle = payload.title === undefined ? current.title : payload.title || null;
  const nextCaption = payload.caption === undefined ? current.caption : payload.caption;
  let moderationStatus = current.moderation_status;
  let moderationMeta = null;

  if (payload.title !== undefined || payload.caption !== undefined) {
    const recentTexts = await getRecentFeedTexts(current.author_id);
    const moderation = await evaluateContent({
      contentType: 'feed_post',
      text: nextCaption,
      title: nextTitle,
      recentTexts,
    });
    moderationStatus = moderation.moderationStatus;
    moderationMeta = {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    };
  }

  const result = await pool.query(
    `UPDATE feed_posts SET
       title = COALESCE($3, title),
       caption = COALESCE($4, caption),
       media_urls = COALESCE($5, media_urls),
       tags = COALESCE($6, tags),
       location = COALESCE($7, location),
       moderation_status = $8,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND (author_id = $2 OR created_by_user_id = $2)
     RETURNING *`,
    [
      req.params.id,
      req.user.id,
      payload.title || null,
      payload.caption || null,
      payload.mediaUrls ? normalizeMediaList(payload.mediaUrls) : null,
      payload.tags || null,
      payload.location || null,
      moderationStatus,
    ]
  );

  if (moderationMeta) {
    await logContentScan({
      entityType: 'feed_post',
      entityId: result.rows[0].id,
      contentType: 'feed_post',
      moderationStatus: moderationMeta.status,
      scan: moderationMeta.scan,
    });
  }

  res.json({
    post: mapFeedPostRow(result.rows[0]),
    moderation: moderationMeta,
  });
}));

router.delete('/posts/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `DELETE FROM feed_posts
     WHERE id = $1
       AND (author_id = $2 OR created_by_user_id = $2)
     RETURNING id`,
    [req.params.id, req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Post not found or you do not have permission to delete it.' });
  }

  return res.json({ deleted: true, postId: result.rows[0].id });
}));

router.post('/posts/:id/like', requireAuth, asyncHandler(async (req, res) => {
  const existing = await pool.query('SELECT 1 FROM feed_likes WHERE post_id = $1 AND user_id = $2', [req.params.id, req.user.id]);

  if (existing.rowCount > 0) {
    await pool.query('DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const likeCount = await getPostLikeCount(req.params.id);
    return res.json({ liked: false, likeCount });
  }

  await pool.query('INSERT INTO feed_likes (post_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
  const likeCount = await getPostLikeCount(req.params.id);
  res.status(201).json({ liked: true, likeCount });
}));

router.post('/posts/:id/save', requireAuth, asyncHandler(async (req, res) => {
  const existing = await pool.query(
    'SELECT 1 FROM feed_saved_posts WHERE post_id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );

  if (existing.rowCount > 0) {
    await pool.query(
      'DELETE FROM feed_saved_posts WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    return res.json({ saved: false });
  }

  await pool.query(
    'INSERT INTO feed_saved_posts (post_id, user_id) VALUES ($1, $2)',
    [req.params.id, req.user.id]
  );
  res.status(201).json({ saved: true });
}));

router.post('/posts/:id/comment', requireAuth, validate(commentSchema), asyncHandler(async (req, res) => {
  const recentTexts = await getRecentCommentTexts(req.user.id, req.params.id);
  const moderation = await evaluateContent({
    contentType: 'comment',
    text: req.validated.body.body,
    recentTexts,
  });
  const result = await pool.query(
    `INSERT INTO feed_comments (post_id, user_id, body, moderation_status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.params.id, req.user.id, req.validated.body.body, moderation.moderationStatus]
  );

  await logContentScan({
    entityType: 'feed_comment',
    entityId: result.rows[0].id,
    contentType: 'comment',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  res.status(201).json({
    comment: result.rows[0],
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  });
}));

router.get('/posts/:id/comments', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT fc.*, COALESCE(wp.full_name, cp.company_name) AS author_name
     FROM feed_comments fc
     JOIN users u ON u.id = fc.user_id
     LEFT JOIN worker_profiles wp ON wp.user_id = fc.user_id
     LEFT JOIN company_profiles cp ON cp.user_id = fc.user_id
     WHERE fc.post_id = $1
       AND COALESCE(fc.moderation_status, 'visible') = 'visible'
     ORDER BY fc.created_at ASC`,
    [req.params.id]
  );
  res.json({ comments: result.rows });
}));

module.exports = router;
