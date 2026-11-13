const db = require('../db');

function logAudit({ businessId = null, userId = null, userEmail = null, action, entityType, entityId = null, details = null }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (business_id, user_id, user_email, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      userId,
      userEmail,
      action,
      entityType,
      entityId ? String(entityId) : null,
      typeof details === 'object' ? JSON.stringify(details) : (details || null)
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
