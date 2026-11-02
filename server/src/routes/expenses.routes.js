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
 * GET /api/v1/expenses
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const expenses = db.prepare(`
      SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC
    `).all(businessId);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/expenses
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { category, vendor_name, expense_date, amount, tax_amount, payment_mode, notes } = req.body;

    if (!category || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Expense category and positive amount are required' });
    }

    const expDate = expense_date || new Date().toISOString().split('T')[0];

    const insert = db.prepare(`
      INSERT INTO expenses (business_id, category, vendor_name, expense_date, amount, tax_amount, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      category.trim(),
      vendor_name ? vendor_name.trim() : null,
      expDate,
      Number(amount),
      Number(tax_amount || 0),
      payment_mode || 'BANK_TRANSFER',
      notes || null
    );

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/expenses/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    db.prepare('DELETE FROM expenses WHERE id = ? AND business_id = ?').run(req.params.id, businessId);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
