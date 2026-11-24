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
 * POST /api/v1/items/sync
 * Bulk-sync local persistent catalog items to the server
 */
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, synced: 0 });
    }

    const syncStmt = db.prepare(`
      INSERT OR REPLACE INTO items (
        id, business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);

    let syncedCount = 0;
    const syncTx = db.transaction(() => {
      for (const it of items) {
        if (!it || !it.item_name) continue;
        const itemId = it.id && !isNaN(Number(it.id)) ? Number(it.id) : null;
        if (itemId) {
          syncStmt.run(
            itemId,
            businessId,
            it.item_name.trim(),
            it.unit || 'Pcs',
            it.hsn_sac_code ? it.hsn_sac_code.trim() : null,
            Number(it.sales_price || 0),
            it.tax_rate !== undefined ? Number(it.tax_rate) : 18.00,
            Number(it.stock_quantity || 0),
            it.created_at || null
          );
          syncedCount++;
        } else {
          db.prepare(`
            INSERT INTO items (business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            businessId,
            it.item_name.trim(),
            it.unit || 'Pcs',
            it.hsn_sac_code ? it.hsn_sac_code.trim() : null,
            Number(it.sales_price || 0),
            it.tax_rate !== undefined ? Number(it.tax_rate) : 18.00,
            Number(it.stock_quantity || 0)
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

    if (!item_name || !item_name.trim()) {
      return res.status(400).json({ error: 'Item description or name is required' });
    }

    const price = (sales_price !== undefined && sales_price !== null && !isNaN(Number(sales_price)))
      ? Number(sales_price)
      : 0;

    const insert = db.prepare(`
      INSERT INTO items (business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      item_name.trim(),
      unit || 'Pcs',
      hsn_sac_code ? hsn_sac_code.trim() : null,
      price,
      (tax_rate !== undefined && tax_rate !== null && !isNaN(Number(tax_rate))) ? Number(tax_rate) : 18.00,
      (stock_quantity !== undefined && stock_quantity !== null && !isNaN(Number(stock_quantity))) ? Number(stock_quantity) : 0
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
