const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { GST_STATE_CODES } = require('../services/gst');
const { logAudit } = require('../services/auditLogger');

function getEffectiveBusinessId(req) {
  if (req.user && req.user.business_id) return req.user.business_id;
  if (req.query && req.query.business_id && req.user.role === 'SUPER_ADMIN') {
    return Number(req.query.business_id);
  }
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
    return firstBiz ? firstBiz.id : null;
  }
  return null;
}

/**
 * GET /api/v1/business/settings
 */
router.get('/settings', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const business = db.prepare(`
      SELECT b.*, p.plan_name, p.has_dynamic_qr, p.has_gst_reports, p.has_multi_user, p.max_invoices_per_month, p.price_monthly, p.price_yearly
      FROM businesses b
      LEFT JOIN saas_plans p ON b.saas_plan_id = p.id
      WHERE b.id = ?
    `).get(businessId);

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const count = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE business_id = ? AND invoice_date >= ? AND invoice_date <= ?
    `).get(businessId, startOfMonth, endOfMonth);
    const invoiceCount = count ? count.count : 0;

    const plan = business.saas_plan_id ? {
      id: business.saas_plan_id,
      plan_name: business.plan_name,
      max_invoices_per_month: business.max_invoices_per_month,
      has_dynamic_qr: business.has_dynamic_qr,
      has_gst_reports: business.has_gst_reports,
      has_multi_user: business.has_multi_user,
      price_monthly: business.price_monthly,
      price_yearly: business.price_yearly,
      currentMonthUsage: invoiceCount
    } : null;

    res.json({
      business: {
        ...business,
        plan
      },
      gstStateCodes: GST_STATE_CODES
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/business/settings
 * Zoho Invoice-style Business & Organization Settings
 */
router.put('/settings', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const {
      company_name,
      gstin,
      pan_number,
      phone,
      state_code,
      address_line1,
      city,
      pincode,
      logo_url,
      website,
      bank_name,
      bank_account_no,
      bank_ifsc,
      upi_vpa,
      tenant_razorpay_key,
      tenant_razorpay_secret,
      tenant_stripe_key,
      tenant_stripe_secret,
      terms_conditions,
      customer_notes,
      invoice_prefix,
      estimate_prefix,
      brand_color,
      signatory_title
    } = req.body;

    db.prepare(`
      UPDATE businesses SET
        company_name = COALESCE(?, company_name),
        gstin = ?,
        pan_number = ?,
        phone = ?,
        state_code = COALESCE(?, state_code),
        address_line1 = ?,
        city = ?,
        pincode = ?,
        logo_url = ?,
        website = ?,
        bank_name = ?,
        bank_account_no = ?,
        bank_ifsc = ?,
        upi_vpa = ?,
        tenant_razorpay_key = ?,
        tenant_razorpay_secret = ?,
        tenant_stripe_key = ?,
        tenant_stripe_secret = ?,
        terms_conditions = ?,
        customer_notes = ?,
        invoice_prefix = ?,
        estimate_prefix = ?,
        brand_color = ?,
        signatory_title = ?
      WHERE id = ?
    `).run(
      company_name,
      gstin !== undefined ? (gstin || null) : null,
      pan_number !== undefined ? (pan_number || null) : null,
      phone !== undefined ? (phone || null) : null,
      state_code,
      address_line1 !== undefined ? (address_line1 || null) : null,
      city !== undefined ? (city || null) : null,
      pincode !== undefined ? (pincode || null) : null,
      logo_url !== undefined ? (logo_url || null) : null,
      website !== undefined ? (website || null) : null,
      bank_name !== undefined ? (bank_name || null) : null,
      bank_account_no !== undefined ? (bank_account_no || null) : null,
      bank_ifsc !== undefined ? (bank_ifsc || null) : null,
      upi_vpa !== undefined ? (upi_vpa || null) : null,
      tenant_razorpay_key !== undefined ? (tenant_razorpay_key || null) : null,
      tenant_razorpay_secret !== undefined ? (tenant_razorpay_secret || null) : null,
      tenant_stripe_key !== undefined ? (tenant_stripe_key || null) : null,
      tenant_stripe_secret !== undefined ? (tenant_stripe_secret || null) : null,
      terms_conditions !== undefined ? (terms_conditions || null) : null,
      customer_notes !== undefined ? (customer_notes || null) : null,
      invoice_prefix !== undefined ? (invoice_prefix || 'INV-') : 'INV-',
      estimate_prefix !== undefined ? (estimate_prefix || 'EST-') : 'EST-',
      brand_color !== undefined ? (brand_color || '#4f46e5') : '#4f46e5',
      signatory_title !== undefined ? (signatory_title || 'Authorized Signatory') : 'Authorized Signatory',
      businessId
    );

    logAudit({
      businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'BUSINESS',
      entityId: businessId,
      details: { company_name, gstin, upi_vpa, brand_color }
    });

    const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    res.json({ message: 'Organization settings updated successfully', business: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/business/users
 * List team staff in this organization
 */
router.get('/users', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const users = db.prepare(`
      SELECT id, business_id, full_name, email, role, status, created_at
      FROM users
      WHERE business_id = ?
      ORDER BY id ASC
    `).all(businessId);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/business/users
 * Add new team member to this business
 */
router.post('/users', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const validRoles = ['BUSINESS_ADMIN', 'ACCOUNTANT', 'STAFF'];
    const assignedRole = validRoles.includes(role) ? role : 'STAFF';
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `).run(businessId, full_name.trim(), email.toLowerCase().trim(), passwordHash, assignedRole);

    const newUser = db.prepare(`
      SELECT id, business_id, full_name, email, role, status, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    logAudit({
      businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'TEAM_MEMBER_INVITED',
      entityType: 'USER',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role }
    });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/business/users/:id
 * Update team member role or active status
 */
router.put('/users/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const userId = Number(req.params.id);
    const { role, status } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND business_id = ?').get(userId, businessId);
    if (!user) {
      return res.status(404).json({ error: 'Team member not found in this business' });
    }

    const validRoles = ['BUSINESS_ADMIN', 'ACCOUNTANT', 'STAFF'];
    const updatedRole = role && validRoles.includes(role) ? role : user.role;
    const validStatuses = ['ACTIVE', 'INACTIVE'];
    const updatedStatus = status && validStatuses.includes(status) ? status : user.status;

    db.prepare(`
      UPDATE users SET role = ?, status = ? WHERE id = ?
    `).run(updatedRole, updatedStatus, userId);

    logAudit({
      businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'TEAM_MEMBER_UPDATED',
      entityType: 'USER',
      entityId: userId,
      details: { role: updatedRole, status: updatedStatus }
    });

    const updated = db.prepare('SELECT id, business_id, full_name, email, role, status, created_at FROM users WHERE id = ?').get(userId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/business/users/:id
 * Remove staff member
 */
router.delete('/users/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own active login session' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND business_id = ?').get(userId, businessId);
    if (!user) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    logAudit({
      businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'TEAM_MEMBER_REMOVED',
      entityType: 'USER',
      entityId: userId,
      details: { email: user.email }
    });

    res.json({ message: 'Team member removed successfully', id: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/business/audit-logs
 * Organization audit trail (Zoho Invoice-style)
 */
router.get('/audit-logs', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE business_id = ?
      ORDER BY id DESC
      LIMIT 100
    `).all(businessId);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
