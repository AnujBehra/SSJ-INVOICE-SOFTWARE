let Database;
let isNodeSqlite = false;

try {
  // Built into modern Node.js (v22+) - zero compilation, no node-gyp, 100% cloud native
  const sqlite = require('node:sqlite');
  Database = sqlite.DatabaseSync;
  isNodeSqlite = true;
} catch (e) {
  Database = require('better-sqlite3');
}

const path = require('path');
const fs = require('fs');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let dbPath = path.join(__dirname, '../data');
let dbFileName = 'ssj_invoicepro.db';

let fullDbPath = path.join(dbPath, dbFileName);

if (isServerless) {
  const tmpDir = '/tmp/data';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const tmpDbFile = path.join(tmpDir, 'ssj_invoicepro.db');
  
  if (!fs.existsSync(tmpDbFile) && fs.existsSync(fullDbPath)) {
    try {
      fs.copyFileSync(fullDbPath, tmpDbFile);
      console.log('✓ Cloned SQLite database to /tmp for Vercel Serverless runtime.');
    } catch (err) {
      console.warn('Could not copy sqlite db to /tmp, initializing new database:', err.message);
    }
  }
  fullDbPath = tmpDbFile;
} else {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
}

const db = isNodeSqlite ? new Database(fullDbPath) : new Database(fullDbPath, { verbose: null });

if (isNodeSqlite) {
  // Compatibility polyfills for node:sqlite DatabaseSync to match better-sqlite3 API
  if (!db.pragma) {
    db.pragma = function (pragmaStr) {
      try {
        return db.exec(`PRAGMA ${pragmaStr};`);
      } catch (err) {
        return null;
      }
    };
  }
  if (!db.transaction) {
    db.transaction = function (fn) {
      return function (...args) {
        db.exec('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          db.exec('COMMIT');
          return result;
        } catch (err) {
          try { db.exec('ROLLBACK'); } catch (_) {}
          throw err;
        }
      };
    };
  }
}

if (!isServerless) {
  db.pragma('journal_mode = WAL');
} else {
  db.pragma('journal_mode = DELETE');
}
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  -- 1. SaaS Platform Subscription Plans
  CREATE TABLE IF NOT EXISTS saas_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_name TEXT NOT NULL,
    price_monthly REAL NOT NULL,
    price_yearly REAL NOT NULL,
    max_invoices_per_month INTEGER DEFAULT -1, -- -1 = Unlimited
    has_dynamic_qr INTEGER DEFAULT 1,
    has_gst_reports INTEGER DEFAULT 1,
    has_multi_user INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Businesses / Tenants Table
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    gstin TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    state_code TEXT NOT NULL, -- e.g. '27' for Maharashtra
    address_line1 TEXT,
    city TEXT,
    pincode TEXT,
    logo_url TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    upi_vpa TEXT, -- Tenant UPI ID e.g. business@upi
    tenant_razorpay_key TEXT,
    tenant_razorpay_secret TEXT,
    saas_plan_id INTEGER,
    subscription_expires_at DATETIME,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, SUSPENDED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saas_plan_id) REFERENCES saas_plans(id)
  );

  -- 3. System Users & Staff (Multi-Tenancy)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- SUPER_ADMIN, BUSINESS_ADMIN, ACCOUNTANT, STAFF
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- 4. Customer / Client Directory
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    company_name TEXT,
    gstin TEXT,
    email TEXT,
    phone TEXT,
    state_code TEXT NOT NULL,
    billing_address TEXT,
    shipping_address TEXT,
    opening_balance REAL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- 5. Items & Services Master Catalog
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    unit TEXT DEFAULT 'Pcs',
    hsn_sac_code TEXT,
    sales_price REAL NOT NULL,
    tax_rate REAL DEFAULT 18.00, -- e.g. 0, 5, 12, 18, 28
    stock_quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- 6. Invoices Header Table
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst_amount REAL DEFAULT 0.00,
    sgst_amount REAL DEFAULT 0.00,
    igst_amount REAL DEFAULT 0.00,
    grand_total REAL NOT NULL,
    paid_amount REAL DEFAULT 0.00,
    upi_qr_string TEXT,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, PARTIAL, PAID, CANCELLED
    notes TEXT,
    terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 7. Invoice Line Items
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    item_id INTEGER,
    item_name TEXT NOT NULL,
    hsn_sac_code TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'Pcs',
    unit_price REAL NOT NULL,
    tax_rate REAL DEFAULT 18.00,
    cgst_amount REAL DEFAULT 0.00,
    sgst_amount REAL DEFAULT 0.00,
    igst_amount REAL DEFAULT 0.00,
    total_amount REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  -- 8. Estimates / Quotes Table
  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    estimate_number TEXT NOT NULL,
    estimate_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst_amount REAL DEFAULT 0.00,
    sgst_amount REAL DEFAULT 0.00,
    igst_amount REAL DEFAULT 0.00,
    grand_total REAL NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED, CONVERTED
    converted_invoice_id INTEGER,
    notes TEXT,
    terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 9. Estimate Line Items
  CREATE TABLE IF NOT EXISTS estimate_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id INTEGER NOT NULL,
    item_id INTEGER,
    item_name TEXT NOT NULL,
    hsn_sac_code TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'Pcs',
    unit_price REAL NOT NULL,
    tax_rate REAL DEFAULT 18.00,
    cgst_amount REAL DEFAULT 0.00,
    sgst_amount REAL DEFAULT 0.00,
    igst_amount REAL DEFAULT 0.00,
    total_amount REAL NOT NULL,
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
  );

  -- 10. Credit Notes
  CREATE TABLE IF NOT EXISTS credit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_id INTEGER,
    credit_note_number TEXT NOT NULL,
    credit_note_date TEXT NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'OPEN', -- OPEN, APPLIED, REFUNDED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );

  -- 11. Delivery Challans
  CREATE TABLE IF NOT EXISTS delivery_challans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    challan_number TEXT NOT NULL,
    challan_date TEXT NOT NULL,
    items_json TEXT NOT NULL,
    status TEXT DEFAULT 'DELIVERED',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 12. Payments Received
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'UPI', -- UPI, BANK_TRANSFER, CASH, RAZORPAY, CHEQUE
    reference_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 13. Expenses
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    vendor_name TEXT,
    expense_date TEXT NOT NULL,
    amount REAL NOT NULL,
    tax_amount REAL DEFAULT 0.00,
    payment_mode TEXT DEFAULT 'BANK_TRANSFER',
    notes TEXT,
    receipt_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- 14. Recurring Invoices
  CREATE TABLE IF NOT EXISTS recurring_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    frequency TEXT NOT NULL, -- MONTHLY, QUARTERLY, YEARLY
    next_run_date TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAUSED
    items_json TEXT NOT NULL,
    auto_send INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 15. Platform Settings (SuperAdmin Platform Configuration & Payment Gateways)
  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 16. Audit Logs (Enterprise system & organization activity logs)
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    user_id INTEGER,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe runtime column migrations
try {
  db.exec('ALTER TABLE businesses ADD COLUMN tenant_stripe_key TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN tenant_stripe_secret TEXT');
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN terms_conditions TEXT DEFAULT 'Payment due within 15 days of invoice date.'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN customer_notes TEXT DEFAULT 'Thank you for your business. Please scan the dynamic UPI QR code to make immediate payment.'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN invoice_prefix TEXT DEFAULT 'INV-'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN estimate_prefix TEXT DEFAULT 'EST-'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN brand_color TEXT DEFAULT '#4f46e5'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN signatory_title TEXT DEFAULT 'Authorized Signatory'");
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN pan_number TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN website TEXT');
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN invoice_suffix TEXT DEFAULT ''");
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN next_invoice_number INTEGER DEFAULT 1');
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN round_off_totals INTEGER DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE businesses ADD COLUMN portal_enabled INTEGER DEFAULT 1');
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN portal_banner_text TEXT DEFAULT 'Welcome to our secure client self-service portal. Review invoices, download PDF receipts, and make instant zero-cost UPI payments.'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_invoice_subject TEXT DEFAULT 'Tax Invoice #{{invoice_number}} from {{company_name}}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_invoice_body TEXT DEFAULT 'Dear {{customer_name}},\n\nPlease find attached tax invoice #{{invoice_number}} for {{grand_total}} due on {{due_date}}.\n\nKindly scan the Dynamic NPCI UPI QR code or click the self-service portal link to make payment.\n\nWarm regards,\n{{company_name}}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_receipt_subject TEXT DEFAULT 'Payment Receipt for Invoice #{{invoice_number}} - {{company_name}}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_receipt_body TEXT DEFAULT 'Dear {{customer_name}},\n\nThank you! We have received your payment of {{amount_paid}} for invoice #{{invoice_number}}.\n\nWarm regards,\n{{company_name}}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_reminder_subject TEXT DEFAULT 'Payment Reminder: Invoice #{{invoice_number}} is due on {{due_date}}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN email_reminder_body TEXT DEFAULT 'Dear {{customer_name}},\n\nThis is a friendly reminder that invoice #{{invoice_number}} with balance due {{balance_due}} is due on {{due_date}}.\n\nPlease scan the Dynamic UPI QR code to complete payment.\n\nWarm regards,\n{{company_name}}'");
} catch (e) {}

// Safe migrations for delivery_challans
try {
  db.exec('ALTER TABLE delivery_challans ADD COLUMN transport_mode TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE delivery_challans ADD COLUMN vehicle_number TEXT');
} catch (e) {}

// Ensure demo accounts have valid password hashes
try {
  const bcrypt = require('bcryptjs');
  const demoHash = bcrypt.hashSync('demo123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE email = 'demo@ssjtech.com'").run(demoHash);
  db.prepare("UPDATE users SET password_hash = ? WHERE email = 'superadmin@invoicepro.com'").run(adminHash);
  db.prepare("UPDATE users SET password_hash = ? WHERE email = 'behraaanuj@gmail.com'").run(demoHash);
} catch (e) {}

module.exports = db;
