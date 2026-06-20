const pool = require('../db/pool');

async function logAudit({ actorId, action, entityType, entityId = null, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_trails (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, action, entityType, entityId, metadata]
  );
}

module.exports = logAudit;
