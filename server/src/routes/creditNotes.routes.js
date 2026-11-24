const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

function getEffectiveBusinessId(req) {
  if (req.user && req.user.business_id) return req.user.business_id;
  if (req.query && req.query.business_id) return Number(req.query.business_id);
  const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
  return firstBiz ? firstBiz.id : 1;
}

/**
 * POST /api/v1/credit-notes/sync
 * Bulk-sync local persistent credit notes to the server
 */
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { creditNotes = [] } = req.body;

    if (!Array.isArray(creditNotes) || creditNotes.length === 0) {
      return res.json({ success: true, synced: 0 });
    }

    const defaultCust = db.prepare('SELECT id FROM customers WHERE business_id = ? ORDER BY id ASC LIMIT 1').get(businessId);
    let defaultCustId = defaultCust ? defaultCust.id : 1;

    let syncedCount = 0;
    const syncTx = db.transaction(() => {
      for (const cn of creditNotes) {
        if (!cn || !cn.credit_note_number) continue;
        const cnId = cn.id && !isNaN(Number(cn.id)) ? Number(cn.id) : null;
        let cId = cn.customer_id && !isNaN(Number(cn.customer_id)) ? Number(cn.customer_id) : defaultCustId;

        // Auto-heal customer
        let custCheck = db.prepare('SELECT id FROM customers WHERE id = ?').get(cId);
        if (!custCheck) {
          const insCust = db.prepare(`
            INSERT INTO customers (business_id, customer_name, state_code)
            VALUES (?, ?, '27')
          `).run(businessId, cn.customer_name || 'Client');
          cId = insCust.lastInsertRowid;
        }

        if (cnId) {
          db.prepare(`
            INSERT OR REPLACE INTO credit_notes (
              id, business_id, customer_id, invoice_id, credit_note_number, credit_note_date, amount, reason, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
          `).run(
            cnId,
            businessId,
            cId,
            cn.invoice_id || null,
            cn.credit_note_number,
            cn.credit_note_date || new Date().toISOString().split('T')[0],
            Number(cn.amount || 0),
            cn.reason || null,
            cn.status || 'OPEN',
            cn.created_at || null
          );
          syncedCount++;
        } else {
          db.prepare(`
            INSERT INTO credit_notes (
              business_id, customer_id, invoice_id, credit_note_number, credit_note_date, amount, reason, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            businessId,
            cId,
            cn.invoice_id || null,
            cn.credit_note_number,
            cn.credit_note_date || new Date().toISOString().split('T')[0],
            Number(cn.amount || 0),
            cn.reason || null,
            cn.status || 'OPEN'
          );
          syncedCount++;
        }
      }
    });

    syncTx();
    res.json({ success: true, synced: syncedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/credit-notes
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const notes = db.prepare(`
      SELECT cn.*, COALESCE(c.customer_name, 'Client') as customer_name, i.invoice_number
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.business_id = ?
      ORDER BY cn.id DESC
    `).all(businessId);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/credit-notes
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { customer_id, customer_name, invoice_id, credit_note_number, credit_note_date, amount, reason } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Positive credit amount is required' });
    }

    // Resolve Customer
    let customer = null;
    if (customer_id && !isNaN(Number(customer_id))) {
      customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(Number(customer_id), businessId);
      if (!customer) {
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(customer_id));
      }
    }

    if (!customer && (customer_name || req.body.customer)) {
      const custName = (customer_name || req.body.customer?.customer_name || 'Client').trim();
      const custCompany = req.body.company_name || null;
      if (customer_id && !isNaN(Number(customer_id))) {
        try {
          db.prepare(`
            INSERT OR REPLACE INTO customers (id, business_id, customer_name, company_name, state_code)
            VALUES (?, ?, ?, ?, '27')
          `).run(Number(customer_id), businessId, custName, custCompany);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(customer_id));
        } catch (e) {}
      }
      if (!customer) {
        try {
          const ins = db.prepare(`
            INSERT INTO customers (business_id, customer_name, company_name, state_code)
            VALUES (?, ?, ?, '27')
          `).run(businessId, custName, custCompany);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
        } catch (err) {}
      }
    }

    if (!customer) {
      customer = db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY id ASC LIMIT 1').get(businessId);
    }

    if (!customer) {
      const fallbackName = (customer_name || 'Valued Client').trim();
      const ins = db.prepare(`
        INSERT INTO customers (business_id, customer_name, state_code)
        VALUES (?, ?, '27')
      `).run(businessId, fallbackName);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ins.lastInsertRowid);
    }

    let cnNumber = credit_note_number;
    if (!cnNumber) {
      const year = new Date().getFullYear();
      const lastCn = db.prepare('SELECT id FROM credit_notes WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(businessId);
      const nextSeq = (lastCn ? lastCn.id : 0) + 1;
      cnNumber = `CN-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    const cnDate = credit_note_date || new Date().toISOString().split('T')[0];

    const insert = db.prepare(`
      INSERT INTO credit_notes (business_id, customer_id, invoice_id, credit_note_number, credit_note_date, amount, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `).run(
      businessId,
      customer.id,
      invoice_id || null,
      cnNumber,
      cnDate,
      Number(amount),
      reason || null
    );

    const created = db.prepare(`
      SELECT cn.*, c.customer_name, i.invoice_number 
      FROM credit_notes cn 
      LEFT JOIN customers c ON cn.customer_id = c.id 
      LEFT JOIN invoices i ON cn.invoice_id = i.id 
      WHERE cn.id = ?
    `).get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/credit-notes/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM credit_notes WHERE id = ? AND business_id = ?').get(id, businessId);
    if (!existing) {
      return res.json({ success: true, message: 'Credit note already removed' });
    }
    db.prepare('DELETE FROM credit_notes WHERE id = ? AND business_id = ?').run(id, businessId);
    res.json({ success: true, message: 'Credit note deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/credit-notes/:id/send-email
 */
router.post('/:id/send-email', authenticateToken, async (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { id } = req.params;
    const { to, subject, body } = req.body;

    const cn = db.prepare('SELECT * FROM credit_notes WHERE id = ? AND business_id = ?').get(id, businessId);
    if (!cn) {
      return res.status(404).json({ error: 'Credit Note not found' });
    }

    const { sendDocumentEmail } = require('../services/emailService');
    const result = await sendDocumentEmail({
      to,
      subject,
      body,
      documentType: 'CREDIT_NOTE',
      documentId: id,
      businessId,
      userId: req.user ? req.user.id : null,
      userEmail: req.user ? req.user.email : null
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/credit-notes/:id/print
 * GST Rule 53 Compliant Printable Credit Note
 */
router.get('/:id/print', async (req, res) => {
  try {
    const cn = db.prepare(`
      SELECT cn.*, c.customer_name, c.company_name as customer_company, c.gstin as customer_gstin, c.billing_address, c.state_code as customer_state_code,
             i.invoice_number, i.invoice_date
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.id = ?
    `).get(req.params.id);

    if (!cn) {
      return res.status(404).send('<!DOCTYPE html><html><body><h2>Credit Note Not Found</h2></body></html>');
    }

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(cn.business_id) || {
      company_name: 'SSJ Tech Solutions Pvt Ltd',
      gstin: '27AABCU9603R1ZM',
      state_code: '27',
      address_line1: 'SSJ Tech Park, Sector 5',
      city: 'Pune'
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Credit Note #${cn.credit_note_number} - ${business.company_name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 24px; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 16px; }
    .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
    .box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .title { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .total-box { margin-top: 20px; text-align: right; }
    .total-amount { font-size: 18px; font-weight: 800; color: #4f46e5; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    @media print {
      body { padding: 0; background: none; }
      .container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin: 0 0 4px; font-size: 20px; color: #0f172a;">${business.company_name}</h1>
        <div style="color: #64748b; font-size: 12px;">GSTIN: ${business.gstin || 'Unregistered'} • State Code: ${business.state_code || '27'}</div>
        <div style="color: #64748b; font-size: 12px;">${business.address_line1 || ''} ${business.city || ''}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">GST Rule 53 Credit Note</span>
        <h2 style="margin: 6px 0 2px; font-size: 16px; color: #4f46e5;">#${cn.credit_note_number}</h2>
        <div style="color: #64748b; font-size: 12px;">Date: ${cn.credit_note_date}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="title">Customer / Recipient</div>
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${cn.customer_name}</div>
        ${cn.customer_company ? `<div>${cn.customer_company}</div>` : ''}
        ${cn.customer_gstin ? `<div>GSTIN: ${cn.customer_gstin}</div>` : ''}
        ${cn.billing_address ? `<div>${cn.billing_address}</div>` : ''}
      </div>
      <div class="box">
        <div class="title">Adjustment Reference</div>
        <div><strong>Original Invoice:</strong> ${cn.invoice_number ? '#' + cn.invoice_number : 'General Account Credit'}</div>
        ${cn.invoice_date ? `<div><strong>Invoice Date:</strong> ${cn.invoice_date}</div>` : ''}
        <div><strong>Reason:</strong> ${cn.reason || 'Goods Return / Price Adjustment'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Adjustment Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 700;">Credit Note Adjustment</div>
            <div style="font-size: 11px; color: #64748b;">${cn.reason || 'Trade credit adjustment issued under GST Rule 53'}</div>
          </td>
          <td style="text-align: right; font-weight: 800; font-family: monospace;">
            ₹${Number(cn.amount).toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div style="font-size: 12px; color: #64748b;">Total Credit Issued</div>
      <div class="total-amount">₹${Number(cn.amount).toFixed(2)}</div>
    </div>

    <div class="footer">
      <div>Issued by <strong>SSJ Invoice PRO</strong> • Rule 53 Statutory GST Credit Note</div>
      <div style="text-align: right; border-top: 1px dashed #cbd5e1; width: 180px; padding-top: 4px;">
        Authorized Signatory
      </div>
    </div>
  </div>
  <script>
    if (new URLSearchParams(window.location.search).get('print') === 'true') {
      window.onload = function() { setTimeout(function() { window.print(); }, 300); };
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<!DOCTYPE html><html><body><h2>Print Error: ${err.message}</h2></body></html>`);
  }
});

module.exports = router;
