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

    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(plan_id);
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
 * List all tenants with subscription and usage status
 */
router.get('/superadmin/tenants', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const tenants = db.prepare(`
      SELECT 
        b.id, b.company_name, b.email, b.phone, b.state_code, b.status, 
        b.subscription_expires_at, b.created_at,
        p.id as plan_id, p.plan_name, p.max_invoices_per_month,
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

    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(id);
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
      id
    );

    const updated = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/superadmin/plans/:id', authenticateToken, requireRole(['SUPER_ADMIN']), (req, res) => {
  try {
    const { id } = req.params;
    const plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Check if any businesses currently use this plan
    const usage = db.prepare('SELECT COUNT(*) as count FROM businesses WHERE saas_plan_id = ?').get(id);
    if (usage && usage.count > 0) {
      if (Number(id) === 1) {
        return res.status(400).json({ error: 'Cannot delete default Free plan while businesses are assigned.' });
      }
      db.prepare('UPDATE businesses SET saas_plan_id = 1 WHERE saas_plan_id = ?').run(id);
    }

    db.prepare('DELETE FROM saas_plans WHERE id = ?').run(id);
    res.json({ message: 'Plan deleted successfully', id: Number(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    if (!company_name || !email) {
      return res.status(400).json({ error: 'Company name and admin email are required' });
    }

    const existingBiz = db.prepare('SELECT id FROM businesses WHERE email = ?').get(email.trim().toLowerCase());
    if (existingBiz) {
      return res.status(409).json({ error: 'A business with this email already exists' });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(extendDays || 365));

    const insertBiz = db.prepare(`
      INSERT INTO businesses (company_name, email, phone, state_code, saas_plan_id, subscription_expires_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      company_name.trim(),
      email.trim().toLowerCase(),
      phone ? phone.trim() : null,
      state_code.trim(),
      Number(plan_id),
      expiry.toISOString()
    );

    const businessId = insertBiz.lastInsertRowid;
    const passwordHash = bcrypt.hashSync(password, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'BUSINESS_ADMIN', 'ACTIVE')
    `).run(
      businessId,
      full_name ? full_name.trim() : 'Business Administrator',
      email.trim().toLowerCase(),
      passwordHash
    );

    res.status(201).json({
      message: 'Tenant and Admin created successfully',
      businessId,
      userId: insertUser.lastInsertRowid
    });
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
