const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkSubscriptionUsage } = require('../middleware/auth');
const { buildDynamicUpiUri } = require('../services/upi');
const { isIntraState, calculateItemGst, calculateInvoiceTotals } = require('../services/gst');

function getEffectiveBusinessId(req) {
  if (req.user && req.user.business_id) return req.user.business_id;
  if (req.query && req.query.business_id) return Number(req.query.business_id);
  const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
  return firstBiz ? firstBiz.id : 1;
}

/**
 * GET /api/v1/estimates
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const estimates = db.prepare(`
      SELECT e.*, COALESCE(c.customer_name, 'Client') as customer_name, c.company_name as customer_company
      FROM estimates e
      LEFT JOIN customers c ON e.customer_id = c.id
      WHERE e.business_id = ?
      ORDER BY e.id DESC
    `).all(businessId);
    res.json(estimates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/estimates
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const {
      customer_id,
      estimate_number,
      estimate_date,
      expiry_date,
      items,
      notes,
      terms
    } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'customer_id and at least one item line are required' });
    }

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    let customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(customer_id, businessId);

    if (!customer) {
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    }
    if (!customer && (req.body.customer_name || req.body.customer)) {
      const custName = req.body.customer_name || req.body.customer?.customer_name || 'Customer';
      const custCompany = req.body.company_name || req.body.customer_company || req.body.customer?.company_name || null;
      const custGstin = req.body.gstin || req.body.customer_gstin || req.body.customer?.gstin || null;
      const custState = req.body.state_code || req.body.customer_state_code || req.body.customer?.state_code || (business ? business.state_code : '27');
      const custEmail = req.body.email || req.body.customer_email || req.body.customer?.email || null;
      const custPhone = req.body.phone || req.body.customer_phone || req.body.customer?.phone || null;
      const custAddress = req.body.billing_address || req.body.customer_address || req.body.customer?.billing_address || null;

      try {
        if (customer_id && !isNaN(Number(customer_id))) {
          db.prepare(`
            INSERT OR REPLACE INTO customers (id, business_id, customer_name, company_name, gstin, email, phone, state_code, billing_address, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(Number(customer_id), businessId, custName, custCompany, custGstin, custEmail, custPhone, custState, custAddress, custAddress);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
        }
      } catch (e) {
        try {
          const ins = db.prepare(`
            INSERT INTO customers (business_id, customer_name, company_name, gstin, email, phone, state_code, billing_address, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(businessId, custName, custCompany, custGstin, custEmail, custPhone, custState, custAddress, custAddress);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
        } catch (err) {}
      }
    }
    if (!customer) {
      customer = db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY id ASC LIMIT 1').get(businessId);
    }

    if (!customer) {
      const fallbackName = req.body.customer_name || 'Valued Business Client';
      const fallbackState = req.body.state_code || (business ? business.state_code : '27');
      const ins = db.prepare(`
        INSERT INTO customers (business_id, customer_name, state_code)
        VALUES (?, ?, ?)
      `).run(businessId, fallbackName, fallbackState);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
    }

    let estNumber = estimate_number;
    if (!estNumber) {
      const year = new Date().getFullYear();
      const lastEst = db.prepare('SELECT id FROM estimates WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(businessId);
      const nextSeq = (lastEst ? lastEst.id : 0) + 1;
      estNumber = `EST-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    const bizState = business ? business.state_code : '27';
    const isIntra = isIntraState(bizState, customer.state_code || '27');

    const calculatedItems = items.map(item => {
      const gst = calculateItemGst(item.quantity, item.unit_price, item.tax_rate, isIntra);
      return {
        ...item,
        cgst_amount: gst.cgstAmount,
        sgst_amount: gst.sgstAmount,
        igst_amount: gst.igstAmount,
        total_amount: gst.totalAmount
      };
    });

    const totals = calculateInvoiceTotals(calculatedItems.map(it => ({
      taxableAmount: Number(it.quantity) * Number(it.unit_price),
      cgstAmount: it.cgst_amount,
      sgstAmount: it.sgst_amount,
      igstAmount: it.igst_amount,
      totalAmount: it.total_amount
    })));

    const estDate = estimate_date || new Date().toISOString().split('T')[0];
    const expDate = expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const insertEstimate = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO estimates (
          business_id, customer_id, estimate_number, estimate_date, expiry_date,
          subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, status, notes, terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SENT', ?, ?)
      `).run(
        business.id,
        customer.id,
        estNumber,
        estDate,
        expDate,
        totals.subtotal,
        totals.cgstAmount,
        totals.sgstAmount,
        totals.igstAmount,
        totals.grandTotal,
        notes || 'Quotation valid for 30 days from issuance date.',
        terms || 'Standard business terms apply.'
      );

      const estimateId = insert.lastInsertRowid;
      const insertItemStmt = db.prepare(`
        INSERT INTO estimate_items (
          estimate_id, item_id, item_name, hsn_sac_code, quantity, unit,
          unit_price, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of calculatedItems) {
        insertItemStmt.run(
          estimateId,
          item.item_id || null,
          item.item_name,
          item.hsn_sac_code || null,
          item.quantity,
          item.unit || 'Pcs',
          item.unit_price,
          item.tax_rate,
          item.cgst_amount,
          item.sgst_amount,
          item.igst_amount,
          item.total_amount
        );
      }

      return estimateId;
    });

    const newEstimateId = insertEstimate();
    const createdEst = db.prepare('SELECT * FROM estimates WHERE id = ?').get(newEstimateId);
    res.status(201).json(createdEst);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/estimates/:id
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const estimate = db.prepare('SELECT * FROM estimates WHERE id = ? AND business_id = ?').get(req.params.id, req.user.business_id);
    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(estimate.customer_id);
    const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(estimate.id);

    res.json({ estimate, customer, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/estimates/:id/convert
 * 1-Click Convert Estimate (Quote) into formal Invoice (Blueprint Section 1, Module 3)
 */
router.post('/:id/convert', authenticateToken, checkSubscriptionUsage, (req, res) => {
  try {
    const estimate = db.prepare('SELECT * FROM estimates WHERE id = ? AND business_id = ?').get(req.params.id, req.user.business_id);
    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Estimate has already been converted to an invoice', invoiceId: estimate.converted_invoice_id });
    }

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.business_id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(estimate.customer_id);
    const estItems = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(estimate.id);

    // Auto-generate invoice number
    const year = new Date().getFullYear();
    const lastInv = db.prepare('SELECT id FROM invoices WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(business.id);
    const nextSeq = (lastInv ? lastInv.id : 0) + 1;
    const invNumber = `INV-${year}-${String(nextSeq).padStart(4, '0')}`;

    // Dynamic UPI QR code
    let upiUri = null;
    if (business.upi_vpa) {
      upiUri = buildDynamicUpiUri(business.upi_vpa, business.company_name, estimate.grand_total, invNumber);
    }

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const convertTx = db.transaction(() => {
      // 1. Insert Invoice Header
      const insertInv = db.prepare(`
        INSERT INTO invoices (
          business_id, customer_id, invoice_number, invoice_date, due_date,
          subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
          upi_qr_string, status, notes, terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'SENT', ?, ?)
      `).run(
        business.id,
        customer.id,
        invNumber,
        today,
        dueDate,
        estimate.subtotal,
        estimate.cgst_amount,
        estimate.sgst_amount,
        estimate.igst_amount,
        estimate.grand_total,
        upiUri,
        `Converted from Estimate #${estimate.estimate_number}. ${estimate.notes || ''}`,
        estimate.terms || 'Payment due as per terms.'
      );

      const invoiceId = insertInv.lastInsertRowid;

      // 2. Insert Invoice Items
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, item_id, item_name, hsn_sac_code, quantity, unit,
          unit_price, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of estItems) {
        insertItemStmt.run(
          invoiceId,
          it.item_id,
          it.item_name,
          it.hsn_sac_code,
          it.quantity,
          it.unit,
          it.unit_price,
          it.tax_rate,
          it.cgst_amount,
          it.sgst_amount,
          it.igst_amount,
          it.total_amount
        );
      }

      // 3. Update Estimate status
      db.prepare(`
        UPDATE estimates 
        SET status = 'CONVERTED', converted_invoice_id = ?
        WHERE id = ?
      `).run(invoiceId, estimate.id);

      return invoiceId;
    });

    const createdInvoiceId = convertTx();

    res.json({
      message: `Successfully converted Estimate #${estimate.estimate_number} into Invoice #${invNumber}!`,
      invoiceId: createdInvoiceId,
      invoiceNumber: invNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/estimates/:id/send-email
 * Dispatch estimate quotation via email
 */
router.post('/:id/send-email', authenticateToken, async (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const estimateId = req.params.id;
    const { to, subject, body } = req.body;

    const estimate = db.prepare('SELECT * FROM estimates WHERE id = ? AND business_id = ?').get(estimateId, businessId);
    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const { sendDocumentEmail } = require('../services/emailService');
    const result = await sendDocumentEmail({
      to,
      subject,
      body,
      documentType: 'ESTIMATE',
      documentId: estimateId,
      businessId,
      userId: req.user ? req.user.id : null,
      userEmail: req.user ? req.user.email : null
    });

    if (estimate.status === 'DRAFT') {
      db.prepare("UPDATE estimates SET status = 'SENT' WHERE id = ?").run(estimateId);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
