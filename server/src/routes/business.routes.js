const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { GST_STATE_CODES } = require('../services/gst');

/**
 * GET /api/v1/business/settings
 */
router.get('/settings', authenticateToken, (req, res) => {
  try {
    let businessId = req.user.business_id;
    if (!businessId && req.user.role === 'SUPER_ADMIN') {
      const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
      businessId = firstBiz ? firstBiz.id : null;
    }

    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const business = db.prepare(`
      SELECT b.*, p.plan_name, p.has_dynamic_qr, p.has_gst_reports, p.max_invoices_per_month, p.price_monthly, p.price_yearly
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
 * Core API Endpoint Contract (Blueprint Section 7)
 * Configure Tenant Payment Details (UPI VPA, Bank Details, GSTIN, Branding)
 */
router.put('/settings', authenticateToken, (req, res) => {
  try {
    let businessId = req.user.business_id;
    if (!businessId && req.user.role === 'SUPER_ADMIN') {
      const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
      businessId = firstBiz ? firstBiz.id : null;
    }

    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with this user' });
    }

    const {
      company_name,
      gstin,
      phone,
      state_code,
      address_line1,
      city,
      pincode,
      logo_url,
      bank_name,
      bank_account_no,
      bank_ifsc,
      upi_vpa,
      tenant_razorpay_key,
      tenant_razorpay_secret,
      tenant_stripe_key,
      tenant_stripe_secret
    } = req.body;

    db.prepare(`
      UPDATE businesses SET
        company_name = COALESCE(?, company_name),
        gstin = ?,
        phone = ?,
        state_code = COALESCE(?, state_code),
        address_line1 = ?,
        city = ?,
        pincode = ?,
        logo_url = ?,
        bank_name = ?,
        bank_account_no = ?,
        bank_ifsc = ?,
        upi_vpa = ?,
        tenant_razorpay_key = ?,
        tenant_razorpay_secret = ?,
        tenant_stripe_key = ?,
        tenant_stripe_secret = ?
      WHERE id = ?
    `).run(
      company_name,
      gstin || null,
      phone || null,
      state_code,
      address_line1 || null,
      city || null,
      pincode || null,
      logo_url || null,
      bank_name || null,
      bank_account_no || null,
      bank_ifsc || null,
      upi_vpa || null,
      tenant_razorpay_key || null,
      tenant_razorpay_secret || null,
      tenant_stripe_key || null,
      tenant_stripe_secret || null,
      businessId
    );

    const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    res.json({ message: 'Business settings updated successfully', business: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
