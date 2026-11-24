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
      const custName = customer_name || req.body.customer?.customer_name || 'Client';
      const custCompany = req.body.company_name || null;
      try {
        if (customer_id && !isNaN(Number(customer_id))) {
          db.prepare(`
            INSERT OR REPLACE INTO customers (id, business_id, customer_name, company_name, state_code)
            VALUES (?, ?, ?, ?, '27')
          `).run(Number(customer_id), businessId, custName, custCompany);
          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(customer_id));
        }
      } catch (e) {
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
      const ins = db.prepare(`
        INSERT INTO customers (business_id, customer_name, state_code)
        VALUES (?, 'Valued Client', '27')
      `).run(businessId);
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

    const created = db.prepare('SELECT * FROM credit_notes WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
