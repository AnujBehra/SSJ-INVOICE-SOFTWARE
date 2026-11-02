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
 * GET /api/v1/customers
 * List customers with calculated outstanding balances
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const customers = db.prepare(`
      SELECT 
        c.*,
        COALESCE((SELECT SUM(i.grand_total) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'CANCELLED'), 0) as total_invoiced,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id), 0) as total_paid,
        COALESCE((SELECT SUM(cn.amount) FROM credit_notes cn WHERE cn.customer_id = c.id), 0) as total_credited
      FROM customers c
      WHERE c.business_id = ?
      ORDER BY c.customer_name ASC
    `).all(businessId);

    // Compute net balance: opening_balance + total_invoiced - total_paid - total_credited
    const withBalances = customers.map(c => ({
      ...c,
      outstanding_balance: Math.round((c.opening_balance + c.total_invoiced - c.total_paid - c.total_credited) * 100) / 100
    }));

    res.json(withBalances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/customers
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const {
      customer_name,
      company_name,
      gstin,
      email,
      phone,
      state_code,
      billing_address,
      shipping_address,
      opening_balance
    } = req.body;

    if (!customer_name || !state_code) {
      return res.status(400).json({ error: 'Customer name and GST state code are required' });
    }

    const insert = db.prepare(`
      INSERT INTO customers (
        business_id, customer_name, company_name, gstin, email, phone, state_code,
        billing_address, shipping_address, opening_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      customer_name.trim(),
      company_name ? company_name.trim() : null,
      gstin ? gstin.trim().toUpperCase() : null,
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      state_code.trim(),
      billing_address || null,
      shipping_address || null,
      Number(opening_balance || 0)
    );

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/customers/:id
 * Customer profile + Full Ledger Statement
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const customer = db.prepare(`
      SELECT * FROM customers WHERE id = ? AND business_id = ?
    `).get(req.params.id, businessId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Ledger transactions: Invoices, Payments, Credit Notes
    const invoices = db.prepare(`
      SELECT id, invoice_number as reference, invoice_date as date, 'INVOICE' as type, grand_total as debit, 0.00 as credit, status
      FROM invoices 
      WHERE customer_id = ? AND business_id = ? AND status != 'CANCELLED'
    `).all(customer.id, businessId);

    const payments = db.prepare(`
      SELECT id, reference_no as reference, payment_date as date, 'PAYMENT' as type, 0.00 as debit, amount as credit, payment_mode as status
      FROM payments 
      WHERE customer_id = ? AND business_id = ?
    `).all(customer.id, businessId);

    const creditNotes = db.prepare(`
      SELECT id, credit_note_number as reference, credit_note_date as date, 'CREDIT_NOTE' as type, 0.00 as debit, amount as credit, status
      FROM credit_notes 
      WHERE customer_id = ? AND business_id = ?
    `).all(customer.id, businessId);

    const allTxns = [...invoices, ...payments, ...creditNotes].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = customer.opening_balance;
    const ledger = allTxns.map(tx => {
      runningBalance = runningBalance + tx.debit - tx.credit;
      return {
        ...tx,
        balance: Math.round(runningBalance * 100) / 100
      };
    });

    res.json({
      customer,
      outstanding_balance: Math.round(runningBalance * 100) / 100,
      ledger
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/customers/:id
 */
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const {
      customer_name,
      company_name,
      gstin,
      email,
      phone,
      state_code,
      billing_address,
      shipping_address,
      opening_balance
    } = req.body;

    db.prepare(`
      UPDATE customers SET
        customer_name = COALESCE(?, customer_name),
        company_name = ?,
        gstin = ?,
        email = ?,
        phone = ?,
        state_code = COALESCE(?, state_code),
        billing_address = ?,
        shipping_address = ?,
        opening_balance = COALESCE(?, opening_balance)
      WHERE id = ? AND business_id = ?
    `).run(
      customer_name,
      company_name || null,
      gstin ? gstin.trim().toUpperCase() : null,
      email || null,
      phone || null,
      state_code,
      billing_address || null,
      shipping_address || null,
      opening_balance,
      req.params.id,
      businessId
    );

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/customers/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    db.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').run(req.params.id, businessId);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
