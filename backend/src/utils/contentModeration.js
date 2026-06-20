const pool = require('../db/pool');
const env = require('../config/env');
const { scanContent } = require('../services/aiScanClient');
const { scanContentLocally } = require('./localContentScan');
const { listNotAllowedTerms } = require('./notAllowedTerms');

function mapRiskToModeration(overallRisk) {
  if (overallRisk <= 30) {
    return 'visible';
  }

  if (overallRisk <= 70) {
    return 'flagged';
  }

  return 'hidden';
}

function buildModerationMessage(moderationStatus, scan) {
  if (moderationStatus === 'visible') {
    return scan?.message || 'Acest conținut pare sigur';
  }

  if (moderationStatus === 'flagged') {
    return 'Acest conținut a fost publicat și trimis spre moderare.';
  }

  return 'It seems this text contains disallowed words. AI Content will review the text shortly.';
}

async function runContentScan(payload) {
  const notAllowedTerms = await listNotAllowedTerms();
  const scanPayload = {
    ...payload,
    notAllowedTerms: notAllowedTerms.map((term) => ({
      term: term.term,
      category: term.category,
      risk_score: term.risk_score,
    })),
  };

  if (env.aiScanEnabled) {
    try {
      return {
        scan: await scanContent(scanPayload),
        source: 'ai-scan-service',
      };
    } catch (error) {
      console.warn('[contentModeration] AI Scan service unavailable, using local rules:', error.message);
    }
  }

  return {
    scan: await scanContentLocally(scanPayload),
    source: 'local-rules',
  };
}

async function evaluateContent({ contentType, text, title, recentTexts = [] }) {
  try {
    const { scan, source } = await runContentScan({
      contentType,
      text,
      title,
      recentTexts,
    });
    const moderationStatus = mapRiskToModeration(scan.overallRisk);

    return {
      moderationStatus,
      scan,
      scanSource: source,
      message: buildModerationMessage(moderationStatus, scan),
    };
  } catch (error) {
    console.error('[contentModeration] Scan failed:', error.message);
    return {
      moderationStatus: 'flagged',
      scan: null,
      scanError: error.message,
      message: 'Content flagged because automated scan failed.',
    };
  }
}

async function logContentScan({
  entityType,
  entityId,
  contentType,
  moderationStatus,
  scan,
}) {
  await pool.query(
    `INSERT INTO content_scans (entity_type, entity_id, content_type, overall_risk, moderation_status, scan_result)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entityType,
      entityId,
      contentType,
      scan?.overallRisk ?? 0,
      moderationStatus,
      JSON.stringify(scan || {}),
    ]
  );
}

async function getRecentFeedTexts(authorId, limit = 20) {
  const result = await pool.query(
    `SELECT TRIM(COALESCE(title, '') || ' ' || caption) AS text
     FROM feed_posts
     WHERE author_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [authorId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

async function getRecentJobTexts(companyId, limit = 20) {
  const result = await pool.query(
    `SELECT TRIM(title || ' ' || description) AS text
     FROM jobs
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [companyId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

async function getRecentCommentTexts(userId, postId, limit = 10) {
  const result = await pool.query(
    `SELECT body AS text
     FROM feed_comments
     WHERE user_id = $1 AND post_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, postId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

function buildReviewScanText(rating, feedback) {
  const lines = [`Rating: ${rating}/5`];
  if (feedback?.trim()) {
    lines.push(feedback.trim());
  }
  return lines.join('\n');
}

async function getRecentMessageTexts(senderId, conversationId, limit = 20) {
  const result = await pool.query(
    `SELECT body AS text
     FROM messages
     WHERE sender_id = $1
       AND conversation_id = $2
       AND COALESCE(moderation_status, 'visible') <> 'hidden'
     ORDER BY created_at DESC
     LIMIT $3`,
    [senderId, conversationId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

async function getRecentWorkerReviewTexts(companyId, limit = 10) {
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(feedback), ''), 'Rating: ' || rating || '/5') AS text
     FROM worker_reviews
     WHERE company_id = $1
       AND COALESCE(moderation_status, 'visible') <> 'hidden'
     ORDER BY updated_at DESC
     LIMIT $2`,
    [companyId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

async function getRecentCompanyReviewTexts(workerId, limit = 10) {
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(feedback), ''), 'Rating: ' || rating || '/5') AS text
     FROM company_reviews
     WHERE worker_id = $1
       AND COALESCE(moderation_status, 'visible') <> 'hidden'
     ORDER BY updated_at DESC
     LIMIT $2`,
    [workerId, limit]
  );

  return result.rows.map((row) => row.text).filter(Boolean);
}

async function scanAndPersistEntity(entityType, entityId) {
  if (entityType === 'feed_post') {
    const result = await pool.query(
      `SELECT id, author_id, title, caption
       FROM feed_posts
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const post = result.rows[0];
    const recentTexts = await getRecentFeedTexts(post.author_id);
    const moderation = await evaluateContent({
      contentType: 'feed_post',
      title: post.title,
      text: post.caption,
      recentTexts,
    });

    await pool.query(
      `UPDATE feed_posts
       SET moderation_status = $2, updated_at = CURRENT_TIMESTAMP
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

    return moderation.scan;
  }

  if (entityType === 'feed_comment') {
    const result = await pool.query(
      `SELECT id, user_id, post_id, body
       FROM feed_comments
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const comment = result.rows[0];
    const recentTexts = await getRecentCommentTexts(comment.user_id, comment.post_id);
    const moderation = await evaluateContent({
      contentType: 'comment',
      text: comment.body,
      recentTexts,
    });

    await pool.query(
      `UPDATE feed_comments SET moderation_status = $2 WHERE id = $1`,
      [comment.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'feed_comment',
      entityId: comment.id,
      contentType: 'comment',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    return moderation.scan;
  }

  if (entityType === 'job') {
    const result = await pool.query(
      `SELECT id, company_id, title, description
       FROM jobs
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const job = result.rows[0];
    const recentTexts = await getRecentJobTexts(job.company_id);
    const moderation = await evaluateContent({
      contentType: 'job_post',
      title: job.title,
      text: job.description,
      recentTexts,
    });

    await pool.query(
      `UPDATE jobs
       SET moderation_status = $2, updated_at = CURRENT_TIMESTAMP
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

    return moderation.scan;
  }

  if (entityType === 'message') {
    const result = await pool.query(
      `SELECT id, sender_id, conversation_id, body
       FROM messages
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const message = result.rows[0];
    const recentTexts = await getRecentMessageTexts(message.sender_id, message.conversation_id);
    const moderation = await evaluateContent({
      contentType: 'message',
      text: message.body,
      recentTexts,
    });

    await pool.query(
      `UPDATE messages
       SET moderation_status = $2
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

    return moderation.scan;
  }

  if (entityType === 'worker_review') {
    const result = await pool.query(
      `SELECT id, company_id, rating, feedback
       FROM worker_reviews
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const review = result.rows[0];
    const recentTexts = await getRecentWorkerReviewTexts(review.company_id);
    const moderation = await evaluateContent({
      contentType: 'worker_review',
      text: buildReviewScanText(review.rating, review.feedback),
      recentTexts,
    });

    await pool.query(
      `UPDATE worker_reviews SET moderation_status = $2 WHERE id = $1`,
      [review.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'worker_review',
      entityId: review.id,
      contentType: 'worker_review',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    return moderation.scan;
  }

  if (entityType === 'company_review') {
    const result = await pool.query(
      `SELECT id, worker_id, rating, feedback
       FROM company_reviews
       WHERE id = $1 AND ai_review_status = 'pending'`,
      [entityId]
    );
    if (result.rowCount === 0) {
      return null;
    }

    const review = result.rows[0];
    const recentTexts = await getRecentCompanyReviewTexts(review.worker_id);
    const moderation = await evaluateContent({
      contentType: 'company_review',
      text: buildReviewScanText(review.rating, review.feedback),
      recentTexts,
    });

    await pool.query(
      `UPDATE company_reviews SET moderation_status = $2 WHERE id = $1`,
      [review.id, moderation.moderationStatus]
    );

    await logContentScan({
      entityType: 'company_review',
      entityId: review.id,
      contentType: 'company_review',
      moderationStatus: moderation.moderationStatus,
      scan: moderation.scan,
    });

    return moderation.scan;
  }

  return null;
}

module.exports = {
  evaluateContent,
  logContentScan,
  scanAndPersistEntity,
  buildReviewScanText,
  getRecentFeedTexts,
  getRecentJobTexts,
  getRecentCommentTexts,
  getRecentMessageTexts,
  getRecentWorkerReviewTexts,
  getRecentCompanyReviewTexts,
  mapRiskToModeration,
};
