const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../utils/asyncHandler');
const {
  evaluateContent,
  logContentScan,
  getRecentMessageTexts,
} = require('../../utils/contentModeration');

const router = express.Router();

const conversationSchema = z.object({
  body: z.object({
    workerId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    jobId: z.number().int().positive().optional(),
  }),
});

const workerConversationSchema = z.object({
  body: z.object({
    recipientWorkerId: z.number().int().positive(),
  }),
});

const messageSchema = z.object({
  body: z.object({
    body: z.string().min(1),
  }),
});

async function getConversationForUser(conversationId, userId) {
  const result = await pool.query(
    `SELECT *
     FROM conversations
     WHERE id = $1 AND (worker_id = $2 OR company_id = $2)`,
    [conversationId, userId]
  );
  return result.rows[0] || null;
}

async function getConversation(conversationId) {
  const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  return result.rows[0] || null;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       c.*,
       j.title AS job_title,
       wp.full_name AS worker_name,
       wp.profile_photo AS worker_photo,
       cp.company_name,
       cp.logo,
       direct_wp.full_name AS direct_worker_name,
       direct_wp.profile_photo AS direct_worker_photo,
       COUNT(m.id) FILTER (WHERE m.read_at IS NULL AND m.sender_id <> $1)::int AS unread_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     LEFT JOIN jobs j ON j.id = c.job_id
     LEFT JOIN worker_profiles wp ON wp.user_id = c.worker_id
     LEFT JOIN company_profiles cp ON cp.user_id = c.company_id
     LEFT JOIN worker_profiles direct_wp ON direct_wp.user_id = c.company_id
     WHERE c.worker_id = $1 OR c.company_id = $1
     GROUP BY c.id, j.title, wp.full_name, wp.profile_photo, cp.company_name, cp.logo, direct_wp.full_name, direct_wp.profile_photo
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  res.json({ conversations: result.rows });
}));

router.post('/', requireAuth, validate(conversationSchema), asyncHandler(async (req, res) => {
  const { workerId, companyId, jobId } = req.validated.body;

  if (req.user.role !== 'admin' && ![workerId, companyId].includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const existing = await pool.query(
    `SELECT *
     FROM conversations
     WHERE worker_id = $1
       AND company_id = $2
       AND job_id IS NOT DISTINCT FROM $3`,
    [workerId, companyId, jobId || null]
  );

  if (existing.rowCount > 0) {
    return res.json({ conversation: existing.rows[0] });
  }

  const result = await pool.query(
    `INSERT INTO conversations (worker_id, company_id, job_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (worker_id, company_id, job_id) DO UPDATE SET job_id = EXCLUDED.job_id
     RETURNING *`,
    [workerId, companyId, jobId || null]
  );

  res.status(201).json({ conversation: result.rows[0] });
}));

router.post('/workers', requireAuth, validate(workerConversationSchema), asyncHandler(async (req, res) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const recipientWorkerId = req.validated.body.recipientWorkerId;
  if (Number(recipientWorkerId) === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot message yourself' });
  }

  const recipient = await pool.query(
    `SELECT wp.user_id
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.user_id = $1 AND u.status = 'active'`,
    [recipientWorkerId]
  );

  if (recipient.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const participantA = Math.min(Number(req.user.id), Number(recipientWorkerId));
  const participantB = Math.max(Number(req.user.id), Number(recipientWorkerId));

  const existing = await pool.query(
    `SELECT *
     FROM conversations
     WHERE conversation_type = 'worker'
       AND worker_id = $1
       AND company_id = $2
       AND job_id IS NULL`,
    [participantA, participantB]
  );

  if (existing.rowCount > 0) {
    return res.json({ conversation: existing.rows[0] });
  }

  const result = await pool.query(
    `INSERT INTO conversations (worker_id, company_id, job_id, conversation_type)
     VALUES ($1, $2, NULL, 'worker')
     RETURNING *`,
    [participantA, participantB]
  );

  res.status(201).json({ conversation: result.rows[0] });
}));

router.get('/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const conversation = req.user.role === 'admin'
    ? await getConversation(req.params.id)
    : await getConversationForUser(req.params.id, req.user.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  await pool.query(
    `UPDATE messages
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE conversation_id = $1
       AND sender_id <> $2
       AND read_at IS NULL`,
    [req.params.id, req.user.id]
  );

  await pool.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1
       AND type = 'message'
       AND related_type = 'conversation'
       AND related_id = $2
       AND read_at IS NULL`,
    [req.user.id, req.params.id]
  );

  const result = await pool.query(
    `SELECT
       m.*,
       COALESCE(wp.full_name, cp.company_name) AS sender_name,
       COALESCE(wp.profile_photo, cp.logo) AS sender_avatar
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN worker_profiles wp ON wp.user_id = m.sender_id
     LEFT JOIN company_profiles cp ON cp.user_id = m.sender_id
     WHERE m.conversation_id = $1
       AND (
         COALESCE(m.moderation_status, 'visible') <> 'hidden'
         OR m.sender_id = $2
       )
     ORDER BY m.created_at ASC`,
    [req.params.id, req.user.id]
  );
  res.json({ messages: result.rows });
}));

router.post('/:id/messages', requireAuth, validate(messageSchema), asyncHandler(async (req, res) => {
  const conversation = req.user.role === 'admin'
    ? await getConversation(req.params.id)
    : await getConversationForUser(req.params.id, req.user.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const messageBody = req.validated.body.body;
  const recentTexts = await getRecentMessageTexts(req.user.id, req.params.id);
  const moderation = await evaluateContent({
    contentType: 'message',
    text: messageBody,
    recentTexts,
  });

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, body, moderation_status, ai_review_status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [req.params.id, req.user.id, messageBody, moderation.moderationStatus]
  );

  await logContentScan({
    entityType: 'message',
    entityId: result.rows[0].id,
    contentType: 'message',
    moderationStatus: moderation.moderationStatus,
    scan: moderation.scan,
  });

  const recipientId = conversation.worker_id === req.user.id ? conversation.company_id : conversation.worker_id;
  if (moderation.moderationStatus !== 'hidden') {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
       VALUES ($1, 'message', 'New message', 'You received a new message.', 'conversation', $2)`,
      [recipientId, req.params.id]
    );
  }

  res.status(201).json({
    message: result.rows[0],
    moderation: {
      status: moderation.moderationStatus,
      message: moderation.message,
      scan: moderation.scan,
    },
  });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const conversation = req.user.role === 'admin'
    ? await getConversation(req.params.id)
    : await getConversationForUser(req.params.id, req.user.id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM notifications
       WHERE related_type = 'conversation' AND related_id = $1`,
      [req.params.id]
    );
    const result = await client.query(
      `DELETE FROM conversations
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ deleted: true, conversation: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

module.exports = router;
