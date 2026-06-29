const pool = require('../db/pool');
const logAudit = require('./audit');

const DELETED_USER_RETENTION_HOURS = 24;
const PURGEABLE_ROLES = new Set(['worker', 'company']);

function isPurgeableRole(role) {
  return PURGEABLE_ROLES.has(role);
}

async function purgeDeletedUsersOlderThan24Hours() {
  const result = await pool.query(
    `DELETE FROM users
     WHERE status = 'deleted'
       AND role = ANY($1::text[])
       AND updated_at < NOW() - ($2 * INTERVAL '1 hour')
     RETURNING id, email, role`,
    [[...PURGEABLE_ROLES], DELETED_USER_RETENTION_HOURS]
  );

  if (result.rowCount > 0) {
    await Promise.all(result.rows.map((user) => logAudit({
      actorId: null,
      action: 'user.auto_purged',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        retentionHours: DELETED_USER_RETENTION_HOURS,
      },
    })));
  }

  return {
    deletedCount: result.rowCount,
    deletedUsers: result.rows,
    retentionHours: DELETED_USER_RETENTION_HOURS,
  };
}

async function forceDeleteUser(userId, actorId) {
  const existing = await pool.query(
    `SELECT u.id, u.email, u.role, u.status, u.updated_at,
            wp.full_name AS worker_full_name,
            cp.company_name
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (existing.rowCount === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const user = existing.rows[0];

  if (!isPurgeableRole(user.role)) {
    const error = new Error('This account type cannot be force deleted.');
    error.status = 400;
    throw error;
  }

  if (user.status !== 'deleted') {
    const error = new Error('Only accounts with status "deleted" can be force deleted.');
    error.status = 400;
    throw error;
  }

  if (Number(actorId) === Number(user.id)) {
    const error = new Error('You cannot delete your own account.');
    error.status = 400;
    throw error;
  }

  await pool.query('DELETE FROM users WHERE id = $1', [userId]);

  const displayName = user.company_name || user.worker_full_name || user.email;

  await logAudit({
    actorId,
    action: 'user.force_deleted',
    entityType: 'user',
    entityId: Number(userId),
    metadata: {
      email: user.email,
      role: user.role,
      displayName,
    },
  });

  return {
    deletedUserId: Number(userId),
    displayName,
    email: user.email,
    role: user.role,
  };
}

module.exports = {
  DELETED_USER_RETENTION_HOURS,
  purgeDeletedUsersOlderThan24Hours,
  forceDeleteUser,
  isPurgeableRole,
};
