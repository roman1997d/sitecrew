const pool = require('../db/pool');
const {
  evaluateContent,
  logContentScan,
  buildReviewScanText,
  getRecentFeedTexts,
  getRecentJobTexts,
  getRecentMessageTexts,
  getRecentWorkerReviewTexts,
  getRecentCompanyReviewTexts,
} = require('./contentModeration');

async function rescanFeedPosts({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, author_id, title, caption
     FROM feed_posts
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const post of result.rows) {
    const recentTexts = await getRecentFeedTexts(post.author_id);
    const moderation = await evaluateContent({
      contentType: 'feed_post',
      title: post.title,
      text: post.caption,
      recentTexts,
    });

    await pool.query(
      `UPDATE feed_posts
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [post.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'feed_post',
      entityId: post.id,
      contentType: 'feed_post',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanComments({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, user_id, post_id, body
     FROM feed_comments
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const comment of result.rows) {
    const moderation = await evaluateContent({
      contentType: 'comment',
      text: comment.body,
    });

    await pool.query(
      `UPDATE feed_comments
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END
       WHERE id = $1`,
      [comment.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'feed_comment',
      entityId: comment.id,
      contentType: 'comment',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanMessages({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, sender_id, conversation_id, body
     FROM messages
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const message of result.rows) {
    const recentTexts = await getRecentMessageTexts(message.sender_id, message.conversation_id);
    const moderation = await evaluateContent({
      contentType: 'message',
      text: message.body,
      recentTexts,
    });

    await pool.query(
      `UPDATE messages
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END
       WHERE id = $1`,
      [message.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'message',
      entityId: message.id,
      contentType: 'message',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanWorkerReviews({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, company_id, rating, feedback
     FROM worker_reviews
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const review of result.rows) {
    const recentTexts = await getRecentWorkerReviewTexts(review.company_id);
    const moderation = await evaluateContent({
      contentType: 'worker_review',
      text: buildReviewScanText(review.rating, review.feedback),
      recentTexts,
    });

    await pool.query(
      `UPDATE worker_reviews
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [review.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'worker_review',
      entityId: review.id,
      contentType: 'worker_review',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanCompanyReviews({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, worker_id, rating, feedback
     FROM company_reviews
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const review of result.rows) {
    const recentTexts = await getRecentCompanyReviewTexts(review.worker_id);
    const moderation = await evaluateContent({
      contentType: 'company_review',
      text: buildReviewScanText(review.rating, review.feedback),
      recentTexts,
    });

    await pool.query(
      `UPDATE company_reviews
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [review.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'company_review',
      entityId: review.id,
      contentType: 'company_review',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanJobs({ pendingOnly = false } = {}) {
  const result = await pool.query(
    `SELECT id, company_id, title, description
     FROM jobs
     WHERE ai_review_status ${pendingOnly ? "= 'pending'" : "<> 'approved_safe'"}`
  );

  let scanned = 0;

  for (const job of result.rows) {
    const recentTexts = await getRecentJobTexts(job.company_id);
    const moderation = await evaluateContent({
      contentType: 'job_post',
      title: job.title,
      text: job.description,
      recentTexts,
    });

    await pool.query(
      `UPDATE jobs
       SET moderation_status = $2,
           ai_review_status = CASE WHEN ai_review_status = 'approved_safe' THEN ai_review_status ELSE 'pending' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [job.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'job',
      entityId: job.id,
      contentType: 'job_post',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    scanned += 1;
  }

  return scanned;
}

async function rescanAllContent() {
  const [feedPosts, comments, jobs, messages, workerReviews, companyReviews] = await Promise.all([
    rescanFeedPosts(),
    rescanComments(),
    rescanJobs(),
    rescanMessages(),
    rescanWorkerReviews(),
    rescanCompanyReviews(),
  ]);

  return {
    feedPosts,
    comments,
    jobs,
    messages,
    workerReviews,
    companyReviews,
    total: feedPosts + comments + jobs + messages + workerReviews + companyReviews,
  };
}

async function rescanPendingAiReviewContent() {
  const [feedPosts, comments, jobs, messages, workerReviews, companyReviews] = await Promise.all([
    rescanFeedPosts({ pendingOnly: true }),
    rescanComments({ pendingOnly: true }),
    rescanJobs({ pendingOnly: true }),
    rescanMessages({ pendingOnly: true }),
    rescanWorkerReviews({ pendingOnly: true }),
    rescanCompanyReviews({ pendingOnly: true }),
  ]);

  return {
    feedPosts,
    comments,
    jobs,
    messages,
    workerReviews,
    companyReviews,
    total: feedPosts + comments + jobs + messages + workerReviews + companyReviews,
  };
}

module.exports = {
  rescanAllContent,
  rescanPendingAiReviewContent,
};
