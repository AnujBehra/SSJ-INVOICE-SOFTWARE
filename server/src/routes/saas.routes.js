const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditLogger');

/**
 * GET /api/v1/saas/plans
 * Public/Authenticated endpoint to list subscription tiers
 */
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM saas_plans ORDER BY id ASC').all();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/saas/checkout
 * Core API Endpoint Contract (Blueprint Section 7)
 * Initiate & complete SaaS plan renewal/upgrade
 */
router.post('/checkout', authenticateToken, (req, res) => {
  try {
    const { plan_id, billing_cycle } = req.body; // billing_cycle: 'monthly' | 'yearly'

    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    const planIdNum = Number(plan_id);
    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(planIdNum);
    if (!plan) {
      return res.status(404).json({ error: 'Selected plan not found' });
    }

    let businessId = req.user.business_id;
    if (!businessId && req.user.role === 'SUPER_ADMIN') {
      const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
      businessId = firstBiz ? firstBiz.id : null;
    }

    if (!businessId) {
      return res.status(400).json({ error: 'No business tenant associated to upgrade' });
    }

    const now = new Date();
    const expiry = new Date(now);

    if (billing_cycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    db.prepare(`
      UPDATE businesses 
      SET saas_plan_id = ?, subscription_expires_at = ?, status = 'ACTIVE'
      WHERE id = ?
    `).run(plan.id, expiry.toISOString(), businessId);

    const updatedBiz = db.prepare(`
      SELECT b.*, p.plan_name, p.max_invoices_per_month, p.has_dynamic_qr, p.has_gst_reports, p.price_monthly, p.price_yearly
      FROM businesses b
      LEFT JOIN saas_plans p ON b.saas_plan_id = p.id
      WHERE b.id = ?
    `).get(businessId);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const count = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE business_id = ? AND invoice_date >= ? AND invoice_date <= ?
    `).get(businessId, startOfMonth, endOfMonth);
    const invoiceCount = count ? count.count : 0;

    const planObj = {
      id: plan.id,
      plan_name: plan.plan_name,
      max_invoices_per_month: plan.max_invoices_per_month,
      has_dynamic_qr: plan.has_dynamic_qr,
      has_gst_reports: plan.has_gst_reports,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currentMonthUsage: invoiceCount
    };

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan.plan_name} (${billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
      business: {
        ...updatedBiz,
        plan: planObj
      },
      plan: planObj
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/saas/superadmin/metrics
 * SuperAdmin Platform revenue metrics & tenant stats (Blueprint Section 1)
 */
router.get('/superadmin/metrics', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const totalTenants = db.prepare('SELECT COUNT(*) as count FROM businesses').get().count;
    const activeTenants = db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'ACTIVE'").get().count;
    const expiredTenants = db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'EXPIRED'").get().count;
    const suspendedTenants = db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'SUSPENDED'").get().count;

    const totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
    const totalInvoiceVolume = db.prepare('SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices').get().total;

    // Calculate MRR from active businesses on paid plans
    const mrrRow = db.prepare(`
      SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
      FROM businesses b
      JOIN saas_plans p ON b.saas_plan_id = p.id
      WHERE b.status = 'ACTIVE' AND p.id > 1
    `).get();

    res.json({
      totalTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      totalInvoices,
      totalInvoiceVolume,
      monthlyRecurringRevenue: mrrRow.mrr,
      currency: 'INR'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/saas/superadmin/tenants
 * List all tenants with subscription and usage status + primary admin info
 */
router.get('/superadmin/tenants', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const tenants = db.prepare(`
      SELECT 
        b.id, b.company_name, b.email, b.phone, b.state_code, b.status, 
        b.subscription_expires_at, b.created_at,
        p.id as plan_id, p.plan_name, p.max_invoices_per_month,
        (SELECT u.full_name FROM users u WHERE u.business_id = b.id AND u.role = 'BUSINESS_ADMIN' ORDER BY u.id ASC LIMIT 1) as admin_name,
        (SELECT u.email FROM users u WHERE u.business_id = b.id AND u.role = 'BUSINESS_ADMIN' ORDER BY u.id ASC LIMIT 1) as admin_email,
        (SELECT u.id FROM users u WHERE u.business_id = b.id AND u.role = 'BUSINESS_ADMIN' ORDER BY u.id ASC LIMIT 1) as admin_id,
        (SELECT COUNT(*) FROM invoices i WHERE i.business_id = b.id) as invoice_count,
        (SELECT COUNT(*) FROM users u WHERE u.business_id = b.id) as user_count
      FROM businesses b
      LEFT JOIN saas_plans p ON b.saas_plan_id = p.id
      ORDER BY b.id DESC
    `).all();

    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/saas/superadmin/admins
 * List all business admin users across all tenants
 */
router.get('/superadmin/admins', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const admins = db.prepare(`
      SELECT 
        u.id, u.business_id, u.full_name, u.email, u.role, u.status, u.created_at,
        b.company_name, b.status as business_status, b.state_code,
        p.plan_name
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      LEFT JOIN saas_plans p ON b.saas_plan_id = p.id
      WHERE u.role IN ('BUSINESS_ADMIN', 'ACCOUNTANT', 'STAFF')
      ORDER BY u.id DESC
    `).all();

    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/saas/superadmin/tenants/:id/status
 * Lock, unlock, or suspend tenant access
 */
router.put('/superadmin/tenants/:id/status', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { status, extendDays, planId } = req.body;
    const { id } = req.params;

    if (status && !['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (planId) {
      updates.push('saas_plan_id = ?');
      params.push(Number(planId));
    }

    if (extendDays) {
      const biz = db.prepare('SELECT subscription_expires_at FROM businesses WHERE id = ?').get(id);
      let expiry = biz && biz.subscription_expires_at ? new Date(biz.subscription_expires_at) : new Date();
      if (expiry < new Date()) expiry = new Date();
      expiry.setDate(expiry.getDate() + Number(extendDays));
      updates.push('subscription_expires_at = ?');
      params.push(expiry.toISOString());
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    res.json({ message: 'Tenant updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Plans Management: Add, Edit, Remove plans
 */
router.post('/superadmin/plans', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const {
      plan_name,
      price_monthly = 0,
      price_yearly = 0,
      max_invoices_per_month = -1,
      has_dynamic_qr = 1,
      has_gst_reports = 1,
      has_multi_user = 0
    } = req.body;

    if (!plan_name || !plan_name.trim()) {
      return res.status(400).json({ error: 'Plan name is required' });
    }

    const insert = db.prepare(`
      INSERT INTO saas_plans (plan_name, price_monthly, price_yearly, max_invoices_per_month, has_dynamic_qr, has_gst_reports, has_multi_user)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan_name.trim(),
      Number(price_monthly),
      Number(price_yearly),
      Number(max_invoices_per_month),
      has_dynamic_qr ? 1 : 0,
      has_gst_reports ? 1 : 0,
      has_multi_user ? 1 : 0
    );

    const created = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/superadmin/plans/:id', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_name,
      price_monthly,
      price_yearly,
      max_invoices_per_month,
      has_dynamic_qr,
      has_gst_reports,
      has_multi_user
    } = req.body;

    const planIdNum = Number(id);
    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(planIdNum);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    db.prepare(`
      UPDATE saas_plans SET
        plan_name = COALESCE(?, plan_name),
        price_monthly = COALESCE(?, price_monthly),
        price_yearly = COALESCE(?, price_yearly),
        max_invoices_per_month = COALESCE(?, max_invoices_per_month),
        has_dynamic_qr = COALESCE(?, has_dynamic_qr),
        has_gst_reports = COALESCE(?, has_gst_reports),
        has_multi_user = COALESCE(?, has_multi_user)
      WHERE id = ?
    `).run(
      plan_name ? plan_name.trim() : null,
      price_monthly !== undefined ? Number(price_monthly) : null,
      price_yearly !== undefined ? Number(price_yearly) : null,
      max_invoices_per_month !== undefined ? Number(max_invoices_per_month) : null,
      has_dynamic_qr !== undefined ? (has_dynamic_qr ? 1 : 0) : null,
      has_gst_reports !== undefined ? (has_gst_reports ? 1 : 0) : null,
      has_multi_user !== undefined ? (has_multi_user ? 1 : 0) : null,
      planIdNum
    );

    const updated = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(planIdNum);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const deletePlanHandler = (req, res) => {
  try {
    const { id } = req.params;
    const planIdNum = Number(id);
    if (!planIdNum) {
      return res.status(400).json({ error: 'Valid plan ID is required' });
    }

    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(planIdNum);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    if (planIdNum === 1) {
      return res.status(400).json({ error: 'Cannot delete the default Free Plan (ID 1).' });
    }

    // Safely reassign any businesses on this plan to Free Plan (ID 1)
    db.prepare('UPDATE businesses SET saas_plan_id = 1 WHERE saas_plan_id = ? OR saas_plan_id = ?').run(planIdNum, String(planIdNum));

    // Delete the plan
    db.prepare('DELETE FROM saas_plans WHERE id = ?').run(planIdNum);

    logAudit({
      businessId: req.user.business_id || null,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'PLAN_DELETED',
      entityType: 'SAAS_PLAN',
      entityId: planIdNum,
      details: { plan_name: plan.plan_name }
    });

    res.json({ success: true, message: `Plan '${plan.plan_name}' deleted successfully`, id: planIdNum });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: err.message });
  }
};

router.delete('/superadmin/plans/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'BUSINESS_ADMIN']), deletePlanHandler);
router.delete('/plans/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'BUSINESS_ADMIN']), deletePlanHandler);

/**
 * SuperAdmin Tenant Management: Add New Business Admin / Tenant
 */
router.post('/superadmin/tenants', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const {
      company_name,
      email,
      phone,
      state_code = '27',
      password = 'password123',
      full_name,
      plan_id = 1,
      extendDays = 365
    } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company / Organization name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Administrator email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = company_name.trim();

    // Check if business already registered with this email
    const existingBiz = db.prepare('SELECT id, company_name FROM businesses WHERE email = ?').get(cleanEmail);
    if (existingBiz) {
      return res.status(409).json({ error: `A business organization with email "${cleanEmail}" already exists (${existingBiz.company_name})` });
    }

    // Check if user already registered with this email
    const existingUser = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: `An administrator account with email "${cleanEmail}" already exists (${existingUser.full_name}). Please use a different email address.` });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(extendDays || 365));
    const passwordHash = bcrypt.hashSync(password || 'password123', 10);

    let businessId;
    let userId;

    // Atomic transaction
    db.transaction(() => {
      const insertBiz = db.prepare(`
        INSERT INTO businesses (company_name, email, phone, state_code, saas_plan_id, subscription_expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(
        cleanCompany,
        cleanEmail,
        phone ? phone.trim() : null,
        state_code.trim(),
        Number(plan_id),
        expiry.toISOString()
      );

      businessId = insertBiz.lastInsertRowid;

      const insertUser = db.prepare(`
        INSERT INTO users (business_id, full_name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, 'BUSINESS_ADMIN', 'ACTIVE')
      `).run(
        businessId,
        full_name ? full_name.trim() : 'Business Administrator',
        cleanEmail,
        passwordHash
      );

      userId = insertUser.lastInsertRowid;
    })();

    logAudit({
      businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'TENANT_AND_ADMIN_CREATED',
      entityType: 'BUSINESS',
      entityId: businessId,
      details: { company_name: cleanCompany, admin_email: cleanEmail, plan_id }
    });

    res.status(201).json({
      message: `Tenant '${cleanCompany}' and Admin created successfully`,
      businessId,
      userId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Add Admin User to Existing Business
 */
router.post('/superadmin/admins', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { business_id, full_name, email, password = 'password123', role = 'BUSINESS_ADMIN' } = req.body;
    if (!business_id) {
      return res.status(400).json({ error: 'Please select an existing business organization' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const biz = db.prepare('SELECT id, company_name FROM businesses WHERE id = ?').get(Number(business_id));
    if (!biz) {
      return res.status(404).json({ error: 'Selected business organization not found' });
    }

    const existingUser = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: `An account with email "${cleanEmail}" already exists (${existingUser.full_name}).` });
    }

    const passwordHash = bcrypt.hashSync(password || 'password123', 10);
    const insert = db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `).run(Number(business_id), full_name.trim(), cleanEmail, passwordHash, role || 'BUSINESS_ADMIN');

    const newUser = db.prepare('SELECT id, business_id, full_name, email, role, status, created_at FROM users WHERE id = ?').get(insert.lastInsertRowid);

    logAudit({
      businessId: Number(business_id),
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ADMIN_USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      details: { name: newUser.full_name, email: newUser.email, company: biz.company_name }
    });

    res.status(201).json({
      message: `Admin user '${newUser.full_name}' added to ${biz.company_name} successfully`,
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Delete Admin User
 */
router.delete('/superadmin/admins/:id', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own active SuperAdmin account' });
    }

    const user = db.prepare('SELECT id, email, full_name, role, business_id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    logAudit({
      businessId: user.business_id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ADMIN_USER_DELETED',
      entityType: 'USER',
      entityId: userId,
      details: { email: user.email, name: user.full_name }
    });

    res.json({ message: `Admin user '${user.full_name}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Tenant Management: Delete Tenant permanently
 */
router.delete('/superadmin/tenants/:id', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { id } = req.params;
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (!biz) return res.status(404).json({ error: 'Business tenant not found' });

    db.prepare('DELETE FROM invoices WHERE business_id = ?').run(id);
    db.prepare('DELETE FROM customers WHERE business_id = ?').run(id);
    db.prepare('DELETE FROM items WHERE business_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE business_id = ?').run(id);
    db.prepare('DELETE FROM businesses WHERE id = ?').run(id);

    res.json({ message: `Tenant '${biz.company_name}' and all associated records deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Access Workspace: Impersonate / Switch into tenant workspace
 */
router.post('/superadmin/impersonate/:id', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { id } = req.params;
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (!biz) return res.status(404).json({ error: 'Business tenant not found' });

    const adminUser = db.prepare('SELECT * FROM users WHERE business_id = ? ORDER BY id ASC LIMIT 1').get(id);
    if (!adminUser) return res.status(404).json({ error: 'No admin user found for this tenant' });

    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(biz.saas_plan_id);

    const token = jwt.sign(
      {
        userId: adminUser.id,
        businessId: biz.id,
        role: adminUser.role,
        isImpersonated: true,
        originalSuperAdminId: req.user.id
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: adminUser.id,
        fullName: adminUser.full_name,
        email: adminUser.email,
        role: adminUser.role,
        businessId: biz.id,
        companyName: biz.company_name,
        plan,
        business: biz,
        isImpersonated: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Platform Settings & Payment Gateways (Razorpay/Stripe)
 */
router.get('/superadmin/settings', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM platform_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/superadmin/settings', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const entries = Object.entries(req.body);
    const upsert = db.prepare(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    db.transaction(() => {
      for (const [key, value] of entries) {
        upsert.run(key, value !== undefined && value !== null ? String(value) : '');
      }
    })();

    const rows = db.prepare('SELECT key, value FROM platform_settings').all();
    const updated = {};
    rows.forEach(r => { updated[r.key] = r.value; });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SuperAdmin Platform Audit Trail (Zoho Directory System Activity Log)
 */
router.get('/superadmin/audit-logs', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT a.*, b.company_name
      FROM audit_logs a
      LEFT JOIN businesses b ON a.business_id = b.id
      ORDER BY a.id DESC
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
