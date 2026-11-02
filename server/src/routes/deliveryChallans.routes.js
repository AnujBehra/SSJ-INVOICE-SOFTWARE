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
 * GET /api/v1/delivery-challans
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const challans = db.prepare(`
      SELECT dc.*, c.customer_name, c.company_name as customer_company
      FROM delivery_challans dc
      JOIN customers c ON dc.customer_id = c.id
      WHERE dc.business_id = ?
      ORDER BY dc.id DESC
    `).all(businessId);
    res.json(challans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/delivery-challans
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const businessId = getEffectiveBusinessId(req);
    const { customer_id, challan_number, challan_date, items, notes } = req.body;

    if (!customer_id || !items) {
      return res.status(400).json({ error: 'Customer ID and items are required' });
    }

    let dcNumber = challan_number;
    if (!dcNumber) {
      const year = new Date().getFullYear();
      const lastDc = db.prepare('SELECT id FROM delivery_challans WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(businessId);
      const nextSeq = (lastDc ? lastDc.id : 0) + 1;
      dcNumber = `DC-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    const dcDate = challan_date || new Date().toISOString().split('T')[0];

    const insert = db.prepare(`
      INSERT INTO delivery_challans (business_id, customer_id, challan_number, challan_date, items_json, status, notes)
      VALUES (?, ?, ?, ?, ?, 'DELIVERED', ?)
    `).run(
      businessId,
      customer_id,
      dcNumber,
      dcDate,
      JSON.stringify(items),
      notes || null
    );

    const created = db.prepare('SELECT * FROM delivery_challans WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
