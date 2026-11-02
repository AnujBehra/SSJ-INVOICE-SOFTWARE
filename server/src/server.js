const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const saasRoutes = require('./routes/saas.routes');
const businessRoutes = require('./routes/business.routes');
const customersRoutes = require('./routes/customers.routes');
const itemsRoutes = require('./routes/items.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const estimatesRoutes = require('./routes/estimates.routes');
const creditNotesRoutes = require('./routes/creditNotes.routes');
const deliveryChallansRoutes = require('./routes/deliveryChallans.routes');
const expensesRoutes = require('./routes/expenses.routes');
const reportsRoutes = require('./routes/reports.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'SSJ Invoice SaaS Billing & Invoicing Engine',
    version: '3.4.0-Enterprise',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/saas', saasRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/items', itemsRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/estimates', estimatesRoutes);
app.use('/api/v1/credit-notes', creditNotesRoutes);
app.use('/api/v1/delivery-challans', deliveryChallansRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/payments', paymentsRoutes);

// Background Cron Jobs (Blueprint Section 2: Background Jobs with Node-Cron)
// Runs daily at midnight to check expired subscriptions and flag them
cron.schedule('0 0 * * *', () => {
  console.log('[CRON] Running daily subscription audit & recurring invoice processor...');
  try {
    const now = new Date().toISOString();
    const expiredResult = db.prepare(`
      UPDATE businesses 
      SET status = 'EXPIRED' 
      WHERE subscription_expires_at IS NOT NULL 
        AND subscription_expires_at < ? 
        AND status = 'ACTIVE'
    `).run(now);

    if (expiredResult.changes > 0) {
      console.log(`[CRON] Locked ${expiredResult.changes} expired tenant business accounts.`);
    }
  } catch (err) {
    console.error('[CRON] Error during subscription audit:', err);
  }
});

// Vercel Cron Endpoint (for cloud scheduled daily audits)
app.get('/api/v1/saas/cron/audit', (req, res) => {
  try {
    const now = new Date().toISOString();
    const expiredResult = db.prepare(`
      UPDATE businesses 
      SET status = 'EXPIRED' 
      WHERE subscription_expires_at IS NOT NULL 
        AND subscription_expires_at < ? 
        AND status = 'ACTIVE'
    `).run(now);

    res.json({
      success: true,
      message: `Audit completed. Locked ${expiredResult.changes} expired tenant business accounts.`,
      timestamp: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build in production
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server locally if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`⚡ SSJ Invoice Enterprise Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;

