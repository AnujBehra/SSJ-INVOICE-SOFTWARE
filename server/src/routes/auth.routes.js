const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

/**
 * POST /api/v1/auth/login
 * Core API Endpoint Contract (Blueprint Section 7)
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(`
      SELECT u.*, b.company_name, b.status as business_status, b.saas_plan_id, b.subscription_expires_at
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE u.email = ?
    `).get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account has been deactivated' });
    }

    // SuperAdmin does not require business checks
    if (user.role !== 'SUPER_ADMIN' && user.business_status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Tenant business account has been suspended by SaaS administrator' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        businessId: user.business_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch plan details if business exists
    let plan = null;
    let invoiceCount = 0;
    if (user.business_id) {
      plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(user.saas_plan_id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const count = db.prepare(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE business_id = ? AND invoice_date >= ? AND invoice_date <= ?
      `).get(user.business_id, startOfMonth, endOfMonth);
      invoiceCount = count.count;
    }

    const planObj = plan ? {
      ...plan,
      currentMonthUsage: invoiceCount
    } : null;

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        companyName: user.company_name,
        plan: planObj,
        business: user.business_id ? {
          id: user.business_id,
          company_name: user.company_name,
          state_code: user.state_code,
          saas_plan_id: user.saas_plan_id,
          plan: planObj
        } : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * POST /api/v1/auth/register
 * Tenant Registration & Self-Onboarding
 */
router.post('/register', (req, res) => {
  try {
    const { companyName, fullName, email, password, phone, stateCode } = req.body;

    if (!companyName || !fullName || !email || !password || !stateCode) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email address already in use' });
    }

    const existingBiz = db.prepare('SELECT id FROM businesses WHERE email = ?').get(email.trim().toLowerCase());
    if (existingBiz) {
      return res.status(409).json({ error: 'A business with this email already exists' });
    }

    const freePlan = db.prepare("SELECT * FROM saas_plans WHERE plan_name LIKE '%Free%' OR id = 1").get() || { id: 1 };
    
    // Set 30 days active trial period
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 30);

    const insertBiz = db.prepare(`
      INSERT INTO businesses (
        company_name, email, phone, state_code, saas_plan_id, subscription_expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      companyName.trim(),
      email.trim().toLowerCase(),
      phone || null,
      stateCode.trim(),
      freePlan.id,
      trialExpiry.toISOString()
    );

    const businessId = insertBiz.lastInsertRowid;
    const passwordHash = bcrypt.hashSync(password, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'BUSINESS_ADMIN', 'ACTIVE')
    `).run(businessId, fullName.trim(), email.trim().toLowerCase(), passwordHash);

    const userId = insertUser.lastInsertRowid;

    // Seed starter catalog items & initial sample customer for the new business
    try {
      const insertItem = db.prepare(`
        INSERT INTO items (business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertItem.run(businessId, 'Consulting & Professional Services', 'Hours', '998311', 2500.00, 18.00, 100);
      insertItem.run(businessId, 'Software License & Subscription', 'User/Mo', '997331', 1200.00, 18.00, 500);
      insertItem.run(businessId, 'General Commercial Products', 'Pcs', '847150', 5000.00, 18.00, 50);

      db.prepare(`
        INSERT INTO customers (business_id, customer_name, company_name, gstin, email, phone, state_code, billing_address, opening_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        businessId,
        'Sample Customer',
        'Acme Enterprise Ltd',
        `${stateCode.trim()}AAACB1234A1Z5`,
        'accounts@acme-corp.com',
        '9876543210',
        stateCode.trim(),
        `Plot 42, Industrial Area, State ${stateCode.trim()}`
      );
    } catch (seedErr) {
      console.warn('Non-fatal starter seed warning:', seedErr.message);
    }

    const token = jwt.sign(
      {
        userId,
        businessId,
        role: 'BUSINESS_ADMIN'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Business tenant created successfully',
      token,
      user: {
        id: userId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: 'BUSINESS_ADMIN',
        businessId,
        companyName: companyName.trim(),
        plan: freePlan
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

/**
 * GET /api/v1/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    let business = null;
    let plan = null;
    let invoiceCount = 0;

    if (user.business_id) {
      business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id);
      if (business && business.saas_plan_id) {
        plan = db.prepare('SELECT * FROM saas_plans WHERE id = ?').get(business.saas_plan_id);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const count = db.prepare(`
          SELECT COUNT(*) as count FROM invoices 
          WHERE business_id = ? AND invoice_date >= ? AND invoice_date <= ?
        `).get(business.id, startOfMonth, endOfMonth);
        invoiceCount = count.count;
      }
    }

    const planObj = plan ? {
      ...plan,
      currentMonthUsage: invoiceCount
    } : null;

    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        companyName: business?.company_name || null,
        plan: planObj,
        business: business ? {
          ...business,
          plan: planObj
        } : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
