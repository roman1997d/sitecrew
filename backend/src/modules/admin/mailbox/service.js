const pool = require('../../../db/pool');
const env = require('../../../config/env');
const {
  isEmailConfigured,
  sendAdminMailboxEmail,
} = require('../../../utils/email');
const { getEmailTestMode } = require('../emailControl/settings');

let mailboxTableReady = false;

async function ensureMailboxTable() {
  if (mailboxTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_mailbox_messages (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      to_email TEXT NOT NULL,
      to_name TEXT,
      to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'failed')),
      error_message TEXT,
      test_mode BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_mailbox_messages_created
      ON admin_mailbox_messages(created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_mailbox_messages_to_email
      ON admin_mailbox_messages(to_email)
  `);

  mailboxTableReady = true;
}

function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email || null,
    toEmail: row.to_email,
    toName: row.to_name || null,
    toUserId: row.to_user_id || null,
    toUserRole: row.to_user_role || null,
    toDisplayName: row.to_display_name || row.to_name || row.to_email,
    subject: row.subject,
    bodyText: row.body_text,
    status: row.status,
    errorMessage: row.error_message || null,
    testMode: Boolean(row.test_mode),
    createdAt: row.created_at,
  };
}

const MESSAGE_SELECT = `
  SELECT
    m.id,
    m.actor_id,
    actor.email AS actor_email,
    m.to_email,
    m.to_name,
    m.to_user_id,
    u.role AS to_user_role,
    COALESCE(wp.full_name, cp.company_name, m.to_name, m.to_email) AS to_display_name,
    m.subject,
    m.body_text,
    m.status,
    m.error_message,
    m.test_mode,
    m.created_at
  FROM admin_mailbox_messages m
  LEFT JOIN users actor ON actor.id = m.actor_id
  LEFT JOIN users u ON u.id = m.to_user_id
  LEFT JOIN worker_profiles wp ON wp.user_id = u.id
  LEFT JOIN company_profiles cp ON cp.user_id = u.id
`;

async function listMessages({ limit = 50, offset = 0 } = {}) {
  await ensureMailboxTable();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows, countResult] = await Promise.all([
    pool.query(
      `${MESSAGE_SELECT}
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [safeLimit, safeOffset]
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM admin_mailbox_messages'),
  ]);

  return {
    messages: rows.rows.map(mapMessage),
    total: countResult.rows[0]?.total || 0,
    emailConfigured: isEmailConfigured(),
  };
}

async function getMessage(id) {
  await ensureMailboxTable();
  const result = await pool.query(
    `${MESSAGE_SELECT}
     WHERE m.id = $1`,
    [id]
  );
  return mapMessage(result.rows[0]);
}

async function searchRecipients(query = '') {
  const q = String(query || '').trim();
  if (q.length < 2) {
    return { recipients: [] };
  }

  await ensureMailboxTable();

  const like = `%${q}%`;
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.status,
       COALESCE(wp.full_name, cp.company_name, u.email) AS display_name
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     WHERE u.status <> 'deleted'
       AND (
         u.email ILIKE $1
         OR wp.full_name ILIKE $1
         OR cp.company_name ILIKE $1
       )
     ORDER BY
       CASE WHEN u.email ILIKE $2 THEN 0 ELSE 1 END,
       display_name ASC
     LIMIT 12`,
    [like, `${q}%`]
  );

  return {
    recipients: result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      displayName: row.display_name,
    })),
  };
}

async function resolveRecipient({ toEmail, toUserId }) {
  let email = String(toEmail || '').trim().toLowerCase();
  let userId = toUserId ? Number(toUserId) : null;
  let name = null;

  if (userId) {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         COALESCE(wp.full_name, cp.company_name) AS display_name
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN company_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      const error = new Error('Recipient user not found.');
      error.status = 404;
      throw error;
    }
    email = user.email;
    name = user.display_name || null;
  } else if (email) {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         COALESCE(wp.full_name, cp.company_name) AS display_name
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN company_profiles cp ON cp.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    const user = result.rows[0];
    if (user) {
      userId = user.id;
      name = user.display_name || null;
      email = user.email;
    }
  }

  if (!email) {
    const error = new Error('Recipient email is required.');
    error.status = 400;
    throw error;
  }

  return { email, userId, name };
}

async function sendMessage({
  actorId,
  toEmail,
  toUserId = null,
  toName = null,
  subject,
  bodyText,
}) {
  await ensureMailboxTable();

  if (!isEmailConfigured()) {
    const error = new Error('Email service is not configured on this server.');
    error.status = 503;
    throw error;
  }

  const recipient = await resolveRecipient({ toEmail, toUserId });
  const displayName = String(toName || recipient.name || '').trim() || null;
  const cleanSubject = String(subject || '').trim();
  const cleanBody = String(bodyText || '').trim();

  if (!cleanSubject) {
    const error = new Error('Subject is required.');
    error.status = 400;
    throw error;
  }
  if (!cleanBody) {
    const error = new Error('Message body is required.');
    error.status = 400;
    throw error;
  }

  const testMode = await getEmailTestMode();
  let status = 'sent';
  let errorMessage = null;

  try {
    await sendAdminMailboxEmail({
      to: recipient.email,
      name: displayName,
      subject: cleanSubject,
      bodyText: cleanBody,
    });
  } catch (error) {
    status = 'failed';
    errorMessage = error.message || 'Failed to send email.';
  }

  const insert = await pool.query(
    `INSERT INTO admin_mailbox_messages (
       actor_id,
       to_email,
       to_name,
       to_user_id,
       subject,
       body_text,
       status,
       error_message,
       test_mode
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      actorId,
      recipient.email,
      displayName,
      recipient.userId,
      cleanSubject,
      cleanBody,
      status,
      errorMessage,
      Boolean(testMode?.enabled),
    ]
  );

  const message = await getMessage(insert.rows[0].id);

  if (status === 'failed') {
    const error = new Error(errorMessage || 'Failed to send email.');
    error.status = 502;
    error.messageRecord = message;
    throw error;
  }

  return {
    message,
    from: env.emailFrom || null,
    testMode: Boolean(testMode?.enabled),
  };
}

module.exports = {
  listMessages,
  getMessage,
  searchRecipients,
  sendMessage,
};
