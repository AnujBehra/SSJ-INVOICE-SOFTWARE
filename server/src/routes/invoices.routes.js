const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkSubscriptionUsage } = require('../middleware/auth');
const { buildDynamicUpiUri, generateQrDataUrl } = require('../services/upi');
const { isIntraState, calculateItemGst, calculateInvoiceTotals } = require('../services/gst');
const { renderInvoiceHtml } = require('../services/pdfRenderer');

function getEffectiveBusinessId(req) {
  if (req.user && req.user.business_id) return req.user.business_id;
  if (req.query && req.query.business_id) return Number(req.query.business_id);
  const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
  return firstBiz ? firstBiz.id : 1;
}

/**
 * GET /api/v1/invoices
 * List tenant's invoices with customer name and status
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const invoices = db.prepare(`
      SELECT 
        i.*,
        c.customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company_name as customer_company,
        c.state_code as customer_state_code,
        (i.grand_total - i.paid_amount) as balance_due
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ?
      ORDER BY i.id DESC
    `).all(businessId);

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/invoices/sync
 * Bulk-sync local persistent invoices to the server container
 */
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { invoices = [] } = req.body;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.json({ synced: 0 });
    }

    const insertTx = db.transaction(() => {
      invoices.forEach(inv => {
        if (!inv.invoice_number) return;
        const existing = inv.id ? db.prepare('SELECT id FROM invoices WHERE id = ?').get(inv.id) : null;
        if (!existing) {
          const bizId = inv.business_id || businessId;
          const custId = inv.customer_id || 1;
          const invId = inv.id && !isNaN(Number(inv.id)) ? Number(inv.id) : null;

          if (invId) {
            db.prepare(`
              INSERT OR IGNORE INTO invoices (
                id, business_id, customer_id, invoice_number, invoice_date, due_date,
                subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
                status, notes, terms, upi_qr_string
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              invId, bizId, custId, inv.invoice_number, inv.invoice_date, inv.due_date,
              inv.subtotal || 0, inv.cgst_amount || 0, inv.sgst_amount || 0, inv.igst_amount || 0,
              inv.grand_total || 0, inv.paid_amount || 0, inv.status || 'ISSUED',
              inv.notes || '', inv.terms || '', inv.upi_qr_string || null
            );
          } else {
            db.prepare(`
              INSERT INTO invoices (
                business_id, customer_id, invoice_number, invoice_date, due_date,
                subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
                status, notes, terms, upi_qr_string
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              bizId, custId, inv.invoice_number, inv.invoice_date, inv.due_date,
              inv.subtotal || 0, inv.cgst_amount || 0, inv.sgst_amount || 0, inv.igst_amount || 0,
              inv.grand_total || 0, inv.paid_amount || 0, inv.status || 'ISSUED',
              inv.notes || '', inv.terms || '', inv.upi_qr_string || null
            );
          }
        }
      });
    });
    insertTx();

    res.json({ success: true, synced: invoices.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/invoices
 * Core REST API Endpoint Contract (Blueprint Section 7)
 * Creates Invoice & builds NPCI Dynamic UPI QR code with hard SaaS limit enforcement
 */
router.post('/', authenticateToken, checkSubscriptionUsage, async (req, res) => {
  try {
    const {
      customer_id,
      invoice_number,
      invoice_date,
      due_date,
      items, // array of { item_id, item_name, hsn_sac_code, quantity, unit, unit_price, tax_rate }
      notes,
      terms
    } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'customer_id and at least one item line are required' });
    }

    const businessId = getEffectiveBusinessId(req);
    let business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!business) {
      business = db.prepare('SELECT * FROM businesses ORDER BY id ASC LIMIT 1').get();
    }
    const effectiveBizId = business ? business.id : (businessId || 1);
    let customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(customer_id, effectiveBizId);

    if (!customer) {
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    }

    // Auto-heal / synchronize customer if running in a stateless serverless container or missing in DB
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
          `).run(Number(customer_id), effectiveBizId, custName, custCompany, custGstin, custEmail, custPhone, custState, custAddress, custAddress);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
        }
      } catch (e) {
        try {
          const ins = db.prepare(`
            INSERT INTO customers (business_id, customer_name, company_name, gstin, email, phone, state_code, billing_address, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(effectiveBizId, custName, custCompany, custGstin, custEmail, custPhone, custState, custAddress, custAddress);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
        } catch (err) {}
      }
    }

    if (!customer) {
      // Fallback: check if any customer exists for this business
      customer = db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY id ASC LIMIT 1').get(effectiveBizId);
    }

    if (!customer) {
      // Automatic guarantee: create an active client for this business so invoice creation is never blocked
      const fallbackName = req.body.customer_name || 'Valued Business Client';
      const fallbackState = req.body.state_code || (business ? business.state_code : '27');
      const ins = db.prepare(`
        INSERT INTO customers (business_id, customer_name, state_code)
        VALUES (?, ?, ?)
      `).run(effectiveBizId, fallbackName, fallbackState);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
    }

    // Auto-generate invoice number if not provided
    let invNumber = invoice_number;
    if (!invNumber) {
      const year = new Date().getFullYear();
      const lastInv = db.prepare('SELECT id FROM invoices WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(effectiveBizId);
      const nextSeq = (lastInv ? lastInv.id : 0) + 1;
      invNumber = `INV-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    // Determine GST tax split (Intra-state CGST+SGST vs Inter-state IGST)
    const bizStateCode = business ? business.state_code : '27';
    const isIntra = isIntraState(bizStateCode, customer.state_code || '27');

    // Compute line items GST
    const calculatedItems = items.map(item => {
      const rate = Number(item.tax_rate !== undefined && item.tax_rate !== null ? item.tax_rate : 18);
      const gst = calculateItemGst(Number(item.quantity) || 1, Number(item.unit_price) || 0, rate, isIntra);
      return {
        ...item,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        tax_rate: rate,
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

    // Generate NPCI Dynamic UPI URI
    let upiUri = null;
    if (business && business.upi_vpa) {
      upiUri = buildDynamicUpiUri(business.upi_vpa, business.company_name || 'SSJ Tech Solutions', totals.grandTotal, invNumber);
    }

    const invDate = invoice_date || new Date().toISOString().split('T')[0];
    const dueDate = due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    // Transactional database insert
    const insertInvoice = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO invoices (
          business_id, customer_id, invoice_number, invoice_date, due_date,
          subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
          upi_qr_string, status, notes, terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'SENT', ?, ?)
      `).run(
        effectiveBizId,
        customer.id,
        invNumber,
        invDate,
        dueDate,
        Number(totals.subtotal) || 0,
        Number(totals.cgstAmount) || 0,
        Number(totals.sgstAmount) || 0,
        Number(totals.igstAmount) || 0,
        Number(totals.grandTotal) || 0,
        upiUri || null,
        notes || 'Thank you for your business. Please scan the UPI QR code to make immediate payment.',
        terms || 'Payment due within invoice terms. Overdue payments subject to statutory GST rules.'
      );

      const invoiceId = insert.lastInsertRowid;

      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, item_id, item_name, hsn_sac_code, quantity, unit,
          unit_price, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of calculatedItems) {
        insertItemStmt.run(
          invoiceId,
          item.item_id ? Number(item.item_id) : null,
          item.item_name || 'Item',
          item.hsn_sac_code || null,
          Number(item.quantity) || 1,
          item.unit || 'Pcs',
          Number(item.unit_price) || 0,
          Number(item.tax_rate !== undefined && item.tax_rate !== null ? item.tax_rate : 18),
          Number(item.cgst_amount) || 0,
          Number(item.sgst_amount) || 0,
          Number(item.igst_amount) || 0,
          Number(item.total_amount) || 0
        );
      }

      return invoiceId;
    });

    const newInvoiceId = insertInvoice();
    const createdInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(newInvoiceId);
    const createdItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(newInvoiceId);

    res.status(201).json({
      ...createdInvoice,
      items: createdItems,
      customer
    });
  } catch (err) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/invoices/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const invoice = db.prepare(`
      SELECT i.*, (i.grand_total - i.paid_amount) as balance_due
      FROM invoices i
      WHERE i.id = ? AND i.business_id = ?
    `).get(req.params.id, businessId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(invoice.business_id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC').all(invoice.id);

    // Dynamic QR for remaining balance
    let qrDataUrl = null;
    const balanceDue = Math.max(0, invoice.grand_total - invoice.paid_amount);
    if (business.upi_vpa && balanceDue > 0) {
      const activeUpiUri = buildDynamicUpiUri(business.upi_vpa, business.company_name, balanceDue, invoice.invoice_number);
      qrDataUrl = await generateQrDataUrl(activeUpiUri);
    }

    res.json({
      invoice,
      business,
      customer,
      items,
      payments,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/invoices/:id/pdf
 * Core REST API Endpoint Contract (Blueprint Section 7)
 * Generate & stream pixel-perfect A4 printable vector invoice with embedded NPCI QR
 * Publicly viewable and printable (direct browser view, WhatsApp share, customer portal)
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Invoice Not Found</h2><p>The requested invoice could not be located.</p></body></html>');
    }

    let business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(invoice.business_id);
    if (!business) {
      business = db.prepare('SELECT * FROM businesses ORDER BY id ASC LIMIT 1').get() || {
        company_name: 'SSJ Tech Solutions Pvt Ltd',
        state_code: '27'
      };
    }

    let customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
    if (!customer) {
      customer = {
        customer_name: 'Valued Client',
        company_name: '',
        gstin: '',
        state_code: business.state_code || '27',
        billing_address: ''
      };
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id) || [];
    const html = await renderInvoiceHtml(invoice, business, customer, items);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Print Render Error</h2><p>${err.message}</p></body></html>`);
  }
});

/**
 * GET /api/v1/invoices/:id/thermal
 * Generate & stream 3-inch (80mm) POS Thermal Receipt embedding dynamic UPI QR
 * (Blueprint Section 9 Phase 4 Requirement)
 */
router.get('/:id/thermal', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).send('<!DOCTYPE html><html><body style="font-family:monospace;padding:20px;text-align:center;"><h2>Receipt Not Found</h2></body></html>');
    }

    let business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(invoice.business_id);
    if (!business) {
      business = db.prepare('SELECT * FROM businesses ORDER BY id ASC LIMIT 1').get() || {
        company_name: 'SSJ Tech Solutions Pvt Ltd',
        state_code: '27'
      };
    }

    let customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
    if (!customer) {
      customer = {
        customer_name: 'Valued Client',
        company_name: '',
        gstin: '',
        state_code: business.state_code || '27',
        billing_address: ''
      };
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id) || [];
    const { renderThermalReceiptHtml } = require('../services/thermalRenderer');
    const html = await renderThermalReceiptHtml(invoice, business, customer, items);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<!DOCTYPE html><html><body style="font-family:monospace;padding:20px;text-align:center;"><h2>Receipt Render Error</h2><p>${err.message}</p></body></html>`);
  }
});

/**
 * POST /api/v1/invoices/:id/payment
 * Record partial or full payment for an invoice
 */
router.post('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { amount, payment_mode, reference_no, notes, payment_date } = req.body;
    const invoiceId = req.params.id;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(invoiceId, businessId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);

    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const newPaidAmount = Math.round((Number(invoice.paid_amount) + Number(amount)) * 100) / 100;
    
    let newStatus = invoice.status;
    if (newPaidAmount >= invoice.grand_total) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PARTIAL';
    }

    // Regenerate dynamic UPI QR for remaining balance if partial
    const balanceDue = Math.max(0, invoice.grand_total - newPaidAmount);
    let updatedUpiUri = null;
    if (business.upi_vpa && balanceDue > 0) {
      updatedUpiUri = buildDynamicUpiUri(business.upi_vpa, business.company_name, balanceDue, invoice.invoice_number);
    }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (business_id, invoice_id, customer_id, payment_date, amount, payment_mode, reference_no, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        businessId,
        invoice.id,
        invoice.customer_id,
        payDate,
        Number(amount),
        payment_mode || 'UPI',
        reference_no || null,
        notes || null
      );

      db.prepare(`
        UPDATE invoices 
        SET paid_amount = ?, status = ?, upi_qr_string = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, updatedUpiUri, invoice.id);
    })();

    res.json({
      message: 'Payment recorded successfully',
      paid_amount: newPaidAmount,
      balance_due: balanceDue,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/invoices/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === 'SUPER_ADMIN';
    const businessId = getEffectiveBusinessId(req);
    
    const invoice = isSuperAdmin
      ? db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id)
      : db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(req.params.id, businessId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const deleteTx = db.transaction(() => {
      // Clean up child dependencies safely before deleting the invoice
      db.prepare('UPDATE credit_notes SET invoice_id = NULL WHERE invoice_id = ?').run(invoice.id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoice.id);
      db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(invoice.id);
      db.prepare('DELETE FROM invoices WHERE id = ?').run(invoice.id);
    });
    deleteTx();

    res.json({ message: 'Invoice deleted successfully', id: invoice.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Public Client Portal Endpoint:
 * GET /api/v1/invoices/public/:id
 * Blueprint Section 1, Module 5: Customer views and pays outstanding invoices online
 */
router.get('/public/:id', async (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, (i.grand_total - i.paid_amount) as balance_due
      FROM invoices i
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const business = db.prepare(`
      SELECT id, company_name, email, phone, state_code, address_line1, city, pincode,
             bank_name, bank_account_no, bank_ifsc, upi_vpa, gstin, logo_url
      FROM businesses WHERE id = ?
    `).get(invoice.business_id);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);

    const balanceDue = Math.max(0, invoice.grand_total - invoice.paid_amount);
    let qrDataUrl = null;
    let upiDeepLink = null;

    if (business.upi_vpa && balanceDue > 0) {
      upiDeepLink = buildDynamicUpiUri(business.upi_vpa, business.company_name, balanceDue, invoice.invoice_number);
      qrDataUrl = await generateQrDataUrl(upiDeepLink);
    }

    res.json({
      invoice,
      business,
      customer,
      items,
      balanceDue,
      qrDataUrl,
      upiDeepLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
