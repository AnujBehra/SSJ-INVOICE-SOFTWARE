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
 * GET /api/v1/items
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const items = db.prepare(`
      SELECT * FROM items WHERE business_id = ? ORDER BY item_name ASC
    `).all(businessId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/items
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity } = req.body;

    if (!item_name || sales_price === undefined) {
      return res.status(400).json({ error: 'Item name and sales price are required' });
    }

    const insert = db.prepare(`
      INSERT INTO items (business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      item_name.trim(),
      unit || 'Pcs',
      hsn_sac_code ? hsn_sac_code.trim() : null,
      Number(sales_price),
      tax_rate !== undefined ? Number(tax_rate) : 18.00,
      Number(stock_quantity || 0)
    );

    const created = db.prepare('SELECT * FROM items WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/items/:id
 */
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity } = req.body;

    db.prepare(`
      UPDATE items SET
        item_name = COALESCE(?, item_name),
        unit = COALESCE(?, unit),
        hsn_sac_code = ?,
        sales_price = COALESCE(?, sales_price),
        tax_rate = COALESCE(?, tax_rate),
        stock_quantity = COALESCE(?, stock_quantity)
      WHERE id = ? AND business_id = ?
    `).run(
      item_name,
      unit,
      hsn_sac_code || null,
      sales_price,
      tax_rate,
      stock_quantity,
      req.params.id,
      businessId
    );

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/items/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    db.prepare('DELETE FROM items WHERE id = ? AND business_id = ?').run(req.params.id, businessId);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
