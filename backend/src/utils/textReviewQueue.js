const pool = require('../db/pool');
const {
  addNotAllowedTerms,
  getLearnModeEnabled,
  setLearnModeEnabled,
  listNotAllowedTerms,
  LEARNED_TERM_CATEGORIES,
} = require('./notAllowedTerms');
const { rescanPendingAiReviewContent } = require('./aiScanBackfill');
const { buildRiskReason } = require('../../../services/ai-scan-service/src/engine/riskReason');

const TEXT_REMOVED_PLACEHOLDER = 'The text in this post was removed by AI Content Scanning.';

const RISK_POST_THRESHOLD = 30;

const PENDING_ENTITIES_CTE = `
  pending_entities AS (
    SELECT
      'feed_post'::text AS entity_type,
      fp.id AS entity_id,
      'feed_post'::text AS content_type,
      fp.title,
      fp.caption AS text,
      fp.created_at
    FROM feed_posts fp
    WHERE fp.ai_review_status = 'pending'

    UNION ALL

    SELECT
      'feed_comment'::text,
      fc.id,
      'comment'::text,
      NULL,
      fc.body,
      fc.created_at
    FROM feed_comments fc
    WHERE fc.ai_review_status = 'pending'

    UNION ALL

    SELECT
      'job'::text,
      j.id,
      'job_post'::text,
      j.title,
      j.description,
      j.created_at
    FROM jobs j
    WHERE j.ai_review_status = 'pending'

    UNION ALL

    SELECT
      'message'::text,
      m.id,
      'message'::text,
      NULL,
      m.body,
      m.created_at
    FROM messages m
    WHERE m.ai_review_status = 'pending'

    UNION ALL

    SELECT
      'worker_review'::text,
      wr.id,
      'worker_review'::text,
      ('Rating: ' || wr.rating || '/5')::text,
      COALESCE(wr.feedback, 'Rating: ' || wr.rating || '/5'),
      wr.created_at
    FROM worker_reviews wr
    WHERE wr.ai_review_status = 'pending'

    UNION ALL

    SELECT
      'company_review'::text,
      cr.id,
      'company_review'::text,
      ('Rating: ' || cr.rating || '/5')::text,
      COALESCE(cr.feedback, 'Rating: ' || cr.rating || '/5'),
      cr.created_at
    FROM company_reviews cr
    WHERE cr.ai_review_status = 'pending'
  )
`;

function buildEffectiveRiskExpression() {
  return `COALESCE(
    cs.overall_risk,
    NULLIF(cs.scan_result->>'overallRisk', '')::int,
    0
  )`;
}

function buildTextReviewQueueQuery({ riskOnly = false } = {}) {
  const effectiveRisk = buildEffectiveRiskExpression();
  const riskFilter = riskOnly ? `WHERE ${effectiveRisk} > ${RISK_POST_THRESHOLD}` : '';

  return `
    WITH ${PENDING_ENTITIES_CTE},
    queue AS (
      SELECT
        pe.*,
        cs.id AS scan_id,
        cs.overall_risk,
        cs.scan_result,
        ${effectiveRisk} AS effective_risk,
        ROW_NUMBER() OVER (ORDER BY pe.created_at ASC, pe.entity_id ASC) AS position
      FROM pending_entities pe
      LEFT JOIN LATERAL (
        SELECT id, overall_risk, scan_result
        FROM content_scans
        WHERE entity_type = pe.entity_type
          AND entity_id = pe.entity_id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) cs ON TRUE
      ${riskFilter}
    )
    SELECT
      queue.*,
      (SELECT COUNT(*)::int FROM queue) AS total
    FROM queue
    WHERE queue.position = 1
  `;
}

function buildTextReviewStatsQuery({ riskOnly = false } = {}) {
  const effectiveRisk = buildEffectiveRiskExpression();
  const riskFilter = riskOnly ? `WHERE ${effectiveRisk} > ${RISK_POST_THRESHOLD}` : '';

  return `
    WITH ${PENDING_ENTITIES_CTE}
    SELECT COUNT(*)::int AS pending
    FROM pending_entities pe
    LEFT JOIN LATERAL (
      SELECT overall_risk, scan_result
      FROM content_scans
      WHERE entity_type = pe.entity_type
        AND entity_id = pe.entity_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) cs ON TRUE
    ${riskFilter}
  `;
}

async function getTextReviewStats({ riskOnly = false } = {}) {
  await rescanPendingAiReviewContent();

  const result = await pool.query(buildTextReviewStatsQuery({ riskOnly }));
  const pending = result.rows[0]?.pending || 0;

  if (riskOnly) {
    return { pending, riskPending: pending };
  }

  const allResult = await pool.query(buildTextReviewStatsQuery({ riskOnly: false }));
  const allPending = allResult.rows[0]?.pending || 0;
  const riskResult = await pool.query(buildTextReviewStatsQuery({ riskOnly: true }));
  const riskPending = riskResult.rows[0]?.pending || 0;

  return { pending: allPending, riskPending };
}

async function getNextTextReviewItem({ riskOnly = false } = {}) {
  await rescanPendingAiReviewContent();

  const result = await pool.query(buildTextReviewQueueQuery({ riskOnly }));

  if (result.rowCount === 0) {
    return { item: null, total: 0, riskOnly: Boolean(riskOnly) };
  }

  const row = result.rows[0];
  const scanResult = typeof row.scan_result === 'string'
    ? JSON.parse(row.scan_result)
    : (row.scan_result || {});

  const overallRisk = row.effective_risk ?? row.overall_risk ?? scanResult.overallRisk ?? 0;
  const flags = scanResult.flags || [];
  const riskReason = scanResult.riskReason || buildRiskReason({
    overallRisk,
    flags,
    matches: scanResult.analysis?.matches || {},
  });

  return {
    item: {
      id: row.scan_id || null,
      entityType: row.entity_type,
      entityId: row.entity_id,
      contentType: row.content_type,
      title: row.title,
      text: row.text,
      overallRisk,
      message: scanResult.message || null,
      riskReason,
      flags,
      scores: scanResult.scores || {},
      recommendation: scanResult.recommendation || null,
      position: row.position,
      total: row.total,
    },
    total: row.total,
    riskOnly: Boolean(riskOnly),
  };
}

async function getScanRecord(scanId) {
  if (!scanId) {
    const error = new Error('Scan item not found');
    error.status = 404;
    throw error;
  }

  const result = await pool.query(
    `SELECT id, entity_type, entity_id
     FROM content_scans
     WHERE id = $1`,
    [scanId]
  );

  if (result.rowCount === 0) {
    const error = new Error('Scan item not found');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function getEntityRecord(entityType, entityId) {
  if (entityType === 'feed_post') {
    const result = await pool.query('SELECT id FROM feed_posts WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  if (entityType === 'feed_comment') {
    const result = await pool.query('SELECT id FROM feed_comments WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  if (entityType === 'job') {
    const result = await pool.query('SELECT id FROM jobs WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  if (entityType === 'message') {
    const result = await pool.query('SELECT id FROM messages WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  if (entityType === 'worker_review') {
    const result = await pool.query('SELECT id FROM worker_reviews WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  if (entityType === 'company_review') {
    const result = await pool.query('SELECT id FROM company_reviews WHERE id = $1 AND ai_review_status = $2', [entityId, 'pending']);
    return result.rowCount > 0 ? { entity_type: entityType, entity_id: entityId } : null;
  }

  return null;
}

async function resolveReviewTarget({ scanId, entityType, entityId }) {
  if (scanId) {
    return getScanRecord(scanId);
  }

  const entity = await getEntityRecord(entityType, entityId);
  if (!entity) {
    const error = new Error('Review item is no longer in the moderation queue');
    error.status = 404;
    throw error;
  }

  return entity;
}

async function setEntityReviewStatus(entityType, entityId, aiReviewStatus) {
  if (entityType === 'feed_post') {
    const result = await pool.query(
      `UPDATE feed_posts
       SET ai_review_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  if (entityType === 'feed_comment') {
    const result = await pool.query(
      `UPDATE feed_comments
       SET ai_review_status = $2
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  if (entityType === 'job') {
    const result = await pool.query(
      `UPDATE jobs
       SET ai_review_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  if (entityType === 'message') {
    const result = await pool.query(
      `UPDATE messages
       SET ai_review_status = $2
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  if (entityType === 'worker_review') {
    const result = await pool.query(
      `UPDATE worker_reviews
       SET ai_review_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  if (entityType === 'company_review') {
    const result = await pool.query(
      `UPDATE company_reviews
       SET ai_review_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ai_review_status = 'pending'
       RETURNING id`,
      [entityId, aiReviewStatus]
    );
    return result.rowCount > 0;
  }

  return false;
}

async function setEntityModerationVisible(entityType, entityId) {
  if (entityType === 'feed_post') {
    await pool.query(
      `UPDATE feed_posts
       SET moderation_status = 'visible', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [entityId]
    );
    return;
  }

  if (entityType === 'feed_comment') {
    await pool.query(
      `UPDATE feed_comments SET moderation_status = 'visible' WHERE id = $1`,
      [entityId]
    );
    return;
  }

  if (entityType === 'job') {
    await pool.query(
      `UPDATE jobs
       SET moderation_status = 'visible', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [entityId]
    );
    return;
  }

  if (entityType === 'message') {
    await pool.query(
      `UPDATE messages
       SET moderation_status = 'visible'
       WHERE id = $1`,
      [entityId]
    );
    return;
  }

  if (entityType === 'worker_review') {
    await pool.query(
      `UPDATE worker_reviews
       SET moderation_status = 'visible', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [entityId]
    );
    return;
  }

  if (entityType === 'company_review') {
    await pool.query(
      `UPDATE company_reviews
       SET moderation_status = 'visible', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [entityId]
    );
  }
}

async function deleteReviewedEntity(entityType, entityId) {
  if (entityType === 'feed_post') {
    await pool.query('DELETE FROM feed_posts WHERE id = $1', [entityId]);
    return;
  }

  if (entityType === 'feed_comment') {
    await pool.query('DELETE FROM feed_comments WHERE id = $1', [entityId]);
    return;
  }

  if (entityType === 'job') {
    await pool.query('DELETE FROM jobs WHERE id = $1', [entityId]);
    return;
  }

  if (entityType === 'message') {
    await pool.query('DELETE FROM messages WHERE id = $1', [entityId]);
    return;
  }

  if (entityType === 'worker_review') {
    await pool.query('DELETE FROM worker_reviews WHERE id = $1', [entityId]);
    return;
  }

  if (entityType === 'company_review') {
    await pool.query('DELETE FROM company_reviews WHERE id = $1', [entityId]);
  }
}

async function feedPostHasApprovedMedia(entityId) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM feed_posts fp
       CROSS JOIN unnest(fp.media_urls) AS media_url
       JOIN media_review_queue mrq ON mrq.file_path = media_url
       WHERE fp.id = $1
         AND mrq.review_status = 'reviewed'
     ) AS has_approved_media`,
    [entityId]
  );

  return result.rows[0]?.has_approved_media === true;
}

async function getEntityNotifyUserId(entityType, entityId) {
  if (entityType === 'feed_post') {
    const result = await pool.query(
      `SELECT author_id, created_by_user_id
       FROM feed_posts
       WHERE id = $1`,
      [entityId]
    );
    const row = result.rows[0];
    return row?.created_by_user_id || row?.author_id || null;
  }

  if (entityType === 'feed_comment') {
    const result = await pool.query('SELECT user_id FROM feed_comments WHERE id = $1', [entityId]);
    return result.rows[0]?.user_id || null;
  }

  if (entityType === 'job') {
    const result = await pool.query(
      `SELECT company_id, created_by_user_id
       FROM jobs
       WHERE id = $1`,
      [entityId]
    );
    const row = result.rows[0];
    return row?.created_by_user_id || row?.company_id || null;
  }

  if (entityType === 'message') {
    const result = await pool.query('SELECT sender_id FROM messages WHERE id = $1', [entityId]);
    return result.rows[0]?.sender_id || null;
  }

  if (entityType === 'worker_review') {
    const result = await pool.query('SELECT company_id FROM worker_reviews WHERE id = $1', [entityId]);
    return result.rows[0]?.company_id || null;
  }

  if (entityType === 'company_review') {
    const result = await pool.query('SELECT worker_id FROM company_reviews WHERE id = $1', [entityId]);
    return result.rows[0]?.worker_id || null;
  }

  return null;
}

async function sendContentModerationNotification({
  userId,
  title,
  body,
  relatedType,
  relatedId,
}) {
  if (!userId) {
    return;
  }

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'content_moderation', $2, $3, $4, $5)`,
    [userId, title, body, relatedType, relatedId]
  );
}

async function rejectFeedPostTextKeepApprovedMedia(entityId) {
  const result = await pool.query(
    `UPDATE feed_posts
     SET title = NULL,
         caption = $2,
         ai_review_status = 'rejected',
         moderation_status = 'visible',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND ai_review_status = 'pending'
     RETURNING id, author_id, created_by_user_id`,
    [entityId, TEXT_REMOVED_PLACEHOLDER]
  );

  return result.rows[0] || null;
}

async function getMessageRecipientId(messageId) {
  const result = await pool.query(
    `SELECT m.sender_id, c.worker_id, c.company_id
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.id = $1`,
    [messageId]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return Number(row.sender_id) === Number(row.worker_id) ? row.company_id : row.worker_id;
}

async function notifyMessageRecipient(messageId) {
  const recipientId = await getMessageRecipientId(messageId);
  if (!recipientId) {
    return;
  }

  const conversationResult = await pool.query(
    'SELECT conversation_id FROM messages WHERE id = $1',
    [messageId]
  );
  const conversationId = conversationResult.rows[0]?.conversation_id;
  if (!conversationId) {
    return;
  }

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'message', 'New message', 'You received a new message.', 'conversation', $2)`,
    [recipientId, conversationId]
  );
}

async function approveTextReview({ scanId, entityType, entityId }) {
  const target = await resolveReviewTarget({ scanId, entityType, entityId });
  const wasHidden = target.entity_type === 'message'
    ? await pool.query(
      `SELECT id FROM messages WHERE id = $1 AND moderation_status = 'hidden'`,
      [target.entity_id]
    ).then((result) => result.rowCount > 0)
    : false;

  const updated = await setEntityReviewStatus(target.entity_type, target.entity_id, 'approved_safe');

  if (!updated) {
    const error = new Error('Review item is no longer in the moderation queue');
    error.status = 404;
    throw error;
  }

  await setEntityModerationVisible(target.entity_type, target.entity_id);

  if (target.entity_type === 'message' && wasHidden) {
    await notifyMessageRecipient(target.entity_id);
  }

  return {
    approved: true,
    entityType: target.entity_type,
    entityId: target.entity_id,
    scanId: scanId || null,
  };
}

async function rejectTextReview({
  scanId,
  entityType,
  entityId,
  learnTerms = [],
  learnCategory = 'not_allowed_content',
  addedBy = null,
} = {}) {
  const target = await resolveReviewTarget({ scanId, entityType, entityId });
  let learned = [];

  if (learnTerms.length > 0) {
    learned = await addNotAllowedTerms(learnTerms, {
      addedBy,
      sourceScanId: scanId || null,
      category: learnCategory,
    });
    await rescanPendingAiReviewContent();
  }

  if (target.entity_type === 'feed_post' && await feedPostHasApprovedMedia(target.entity_id)) {
    const updated = await rejectFeedPostTextKeepApprovedMedia(target.entity_id);

    if (!updated) {
      const error = new Error('Review item is no longer in the moderation queue');
      error.status = 404;
      throw error;
    }

    const notifyUserId = updated.created_by_user_id || updated.author_id;
    await sendContentModerationNotification({
      userId: notifyUserId,
      title: 'Post text removed',
      body: 'The text in your post was removed by AI Content Scanning because it did not meet our safety guidelines. Your approved image remains visible.',
      relatedType: 'feed_post',
      relatedId: target.entity_id,
    });

    return {
      rejected: true,
      deleted: false,
      textRemoved: true,
      entityType: target.entity_type,
      entityId: target.entity_id,
      scanId: scanId || null,
      learnedTerms: learned,
    };
  }

  const notifyUserId = await getEntityNotifyUserId(target.entity_type, target.entity_id);
  const removalMessages = {
    feed_post: {
      title: 'Post removed',
      body: 'Your post was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
    feed_comment: {
      title: 'Comment removed',
      body: 'Your comment was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
    job: {
      title: 'Job post removed',
      body: 'Your job post was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
    message: {
      title: 'Message removed',
      body: 'Your message was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
    worker_review: {
      title: 'Worker review removed',
      body: 'Your worker review was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
    company_review: {
      title: 'Company review removed',
      body: 'Your company review was removed by AI Content Scanning because it did not meet our safety guidelines.',
    },
  };

  await deleteReviewedEntity(target.entity_type, target.entity_id);

  const message = removalMessages[target.entity_type] || removalMessages.feed_post;
  await sendContentModerationNotification({
    userId: notifyUserId,
    title: message.title,
    body: message.body,
    relatedType: target.entity_type,
    relatedId: target.entity_id,
  });

  return {
    rejected: true,
    deleted: true,
    textRemoved: false,
    entityType: target.entity_type,
    entityId: target.entity_id,
    scanId: scanId || null,
    learnedTerms: learned,
  };
}

module.exports = {
  TEXT_REMOVED_PLACEHOLDER,
  LEARNED_TERM_CATEGORIES,
  getLearnModeEnabled,
  setLearnModeEnabled,
  listNotAllowedTerms,
  getTextReviewStats,
  getNextTextReviewItem,
  approveTextReview,
  rejectTextReview,
};
