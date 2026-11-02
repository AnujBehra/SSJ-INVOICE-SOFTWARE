const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

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
    const { status, extendDays } = req.body;
    const { id } = req.params;

    if (!['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (extendDays) {
      const biz = db.prepare('SELECT subscription_expires_at FROM businesses WHERE id = ?').get(id);
      let expiry = biz && biz.subscription_expires_at ? new Date(biz.subscription_expires_at) : new Date();
      if (expiry < new Date()) expiry = new Date();
      expiry.setDate(expiry.getDate() + Number(extendDays));

      db.prepare(`
        UPDATE businesses 
        SET status = ?, subscription_expires_at = ?
        WHERE id = ?
      `).run(status, expiry.toISOString(), id);
    } else {
      db.prepare(`
        UPDATE businesses 
        SET status = ?
        WHERE id = ?
      `).run(status, id);
    }

    res.json({ message: 'Tenant status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
