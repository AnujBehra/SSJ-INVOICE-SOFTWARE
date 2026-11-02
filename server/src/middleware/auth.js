const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ssj_invoice_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authentication token' });
    }

    const user = db.prepare('SELECT id, business_id, full_name, email, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is inactive or not found' });
    }

    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role permissions' });
    }
    next();
  };
}

/**
 * Validates active tenant subscription and monthly invoice quota limits
 * Blocks creation if plan has expired or invoice limit is exceeded
 */
function checkSubscriptionUsage(req, res, next) {
  if (req.user.role === 'SUPER_ADMIN') {
    return next(); // SuperAdmin unrestricted
  }

  const business = db.prepare(`
    SELECT b.*, p.plan_name, p.max_invoices_per_month, p.has_dynamic_qr, p.has_gst_reports
    FROM businesses b
    LEFT JOIN saas_plans p ON b.saas_plan_id = p.id
    WHERE b.id = ?
  `).get(req.user.business_id);

  if (!business) {
    return res.status(404).json({ error: 'Business account not found' });
  }

  if (business.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Business account is suspended by SaaS platform administrator' });
  }

  if (business.subscription_expires_at) {
    const expiry = new Date(business.subscription_expires_at);
    if (expiry < new Date()) {
      return res.status(403).json({
        error: 'SaaS subscription has expired. Please upgrade or renew your plan to continue issuing invoices.',
        subscriptionExpired: true
      });
    }
  }

  // Check invoice limit for the current calendar month
  if (business.max_invoices_per_month !== -1) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const count = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE business_id = ? AND invoice_date >= ? AND invoice_date <= ?
    `).get(business.id, startOfMonth, endOfMonth);

    if (count.count >= business.max_invoices_per_month) {
      return res.status(403).json({
        error: `Monthly invoice quota reached (${count.count}/${business.max_invoices_per_month} invoices used). Please upgrade to Pro or Enterprise for unlimited invoices.`,
        quotaExceeded: true,
        limit: business.max_invoices_per_month,
        current: count.count
      });
    }
  }

  req.business = business;
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
  checkSubscriptionUsage
};
