const bcrypt = require('bcryptjs');
const db = require('./db');
const { buildDynamicUpiUri, generateQrDataUrl } = require('./services/upi');
const { isIntraState, calculateItemGst, calculateInvoiceTotals } = require('./services/gst');

async function seedDatabase() {
  console.log('--- Initializing & Seeding LedgerPulse 360™ Database ---');

  // 1. Seed SaaS Plans
  const existingPlans = db.prepare('SELECT COUNT(*) as count FROM saas_plans').get();
  if (existingPlans.count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO saas_plans (id, plan_name, price_monthly, price_yearly, max_invoices_per_month, has_dynamic_qr, has_gst_reports, has_multi_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // As specified in blueprint Image 2:
    // Free: ₹0, max 10 invoices/mo, single user, static QR
    // Pro (Monthly): ₹499/mo, unlimited invoices (-1), dynamic UPI QR, Razorpay, Estimate to Invoice
    // Enterprise (Yearly): ₹4,999/yr, multi-user staff, GSTR-1 & 3B export, custom branding & logo, recurring
    insertPlan.run(1, 'Free Plan', 0.00, 0.00, 10, 0, 0, 0);
    insertPlan.run(2, 'Pro Plan (Monthly)', 499.00, 4990.00, -1, 1, 1, 0);
    insertPlan.run(3, 'Enterprise (Yearly)', 499.00, 4999.00, -1, 1, 1, 1);
    console.log('✓ Seeded SaaS Subscription Plans (Free, Pro, Enterprise)');
  }

  // 2. Seed SuperAdmin User
  const existingSuperAdmin = db.prepare("SELECT * FROM users WHERE role = 'SUPER_ADMIN'").get();
  if (!existingSuperAdmin) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(null, 'SaaS Super Administrator', 'superadmin@invoicepro.com', passwordHash, 'SUPER_ADMIN', 'ACTIVE');
    console.log('✓ Seeded SuperAdmin: superadmin@invoicepro.com (pass: admin123)');
  }

  // 3. Seed Demo Tenant Business
  const existingBusiness = db.prepare('SELECT * FROM businesses WHERE id = 1').get();
  let businessId = 1;
  if (!existingBusiness) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const info = db.prepare(`
      INSERT INTO businesses (
        id, company_name, gstin, email, phone, state_code, address_line1, city, pincode,
        bank_name, bank_account_no, bank_ifsc, upi_vpa, saas_plan_id, subscription_expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'Zenith Innovations Pvt Ltd',
      '27AABCZ1429B1Z8',
      'billing@zenithcloud.com',
      '+91 98765 43210',
      '27', // Maharashtra
      'Tower B, Cyber City High Street, Bandra Kurla Complex',
      'Mumbai',
      '400051',
      'HDFC Bank Ltd',
      '50200088991122',
      'HDFC0000123',
      'zenithbilling@hdfcbank',
      2, // Pro Plan
      nextYear.toISOString(),
      'ACTIVE'
    );
    businessId = info.lastInsertRowid || 1;
    console.log('✓ Seeded Business Tenant: Zenith Innovations Pvt Ltd');

    // Seed Business Admin User
    const passwordHash = bcrypt.hashSync('demo123', 10);
    db.prepare(`
      INSERT INTO users (business_id, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(businessId, 'Rajesh Sharma', 'demo@zenithcloud.com', passwordHash, 'BUSINESS_ADMIN', 'ACTIVE');
    console.log('✓ Seeded Business Admin: demo@zenithcloud.com (pass: demo123)');
  }

  // 4. Seed Catalog Items (Products & Services with HSN/SAC codes)
  const existingItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE business_id = ?').get(businessId);
  if (existingItems.count === 0) {
    const insertItem = db.prepare(`
      INSERT INTO items (business_id, item_name, unit, hsn_sac_code, sales_price, tax_rate, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(businessId, 'Cloud Infrastructure Setup & Maintenance', 'Hours', '998313', 2500.00, 18.00, 100);
    insertItem.run(businessId, 'Enterprise ERP & Billing SaaS License', 'User/Mo', '997331', 1200.00, 18.00, 500);
    insertItem.run(businessId, 'High-Performance Bare-Metal Server Node', 'Pcs', '847150', 65000.00, 18.00, 12);
    insertItem.run(businessId, 'Dynamic Payment Gateway Integration Service', 'Service', '998314', 15000.00, 18.00, 50);
    insertItem.run(businessId, 'IT Support & SLA AMC Annual Contract', 'Year', '998713', 35000.00, 18.00, 20);
    console.log('✓ Seeded Items & Services Catalog');
  }

  // 5. Seed Customers (One Intra-State Maharashtra, One Inter-State Karnataka)
  const existingCustomers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ?').get(businessId);
  if (existingCustomers.count === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (business_id, customer_name, company_name, gstin, email, phone, state_code, billing_address, shipping_address, opening_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Intra-state (Maharashtra - 27)
    insertCustomer.run(
      businessId,
      'Vikram Deshmukh',
      'Apex Retail Innovations LLP',
      '27AAACA5566C1ZB',
      'accounts@apexretail.in',
      '+91 91234 56789',
      '27',
      'Plot 45, MIDC Industrial Area, Hinjewadi Phase 1, Pune, MH - 411057',
      'Plot 45, MIDC Industrial Area, Hinjewadi Phase 1, Pune, MH - 411057',
      0.00
    );

    // Inter-state (Karnataka - 29)
    insertCustomer.run(
      businessId,
      'Kavita Raman',
      'Novasoft Technologies Pvt Ltd',
      '29AABCN8899D1ZG',
      'finance@novasoft.com',
      '+91 98888 77665',
      '29',
      '7th Floor, Koramangala 4th Block, 100ft Road, Bengaluru, KA - 560034',
      '7th Floor, Koramangala 4th Block, 100ft Road, Bengaluru, KA - 560034',
      0.00
    );

    // B2C Customer without GSTIN (Intra-state)
    insertCustomer.run(
      businessId,
      'Amitabh Banerjee',
      'Personal Consumer',
      null,
      'amitabh.b@gmail.com',
      '+91 97777 66554',
      '27',
      'Flat 302, Palm Heights, Bandra West, Mumbai, MH - 400050',
      'Flat 302, Palm Heights, Bandra West, Mumbai, MH - 400050',
      0.00
    );
    console.log('✓ Seeded Customers (Intra-state, Inter-state, and B2C)');
  }

  // 6. Seed Invoices with dynamic NPCI UPI QR string and item lines
  const existingInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE business_id = ?').get(businessId);
  if (existingInvoices.count === 0) {
    const customer1 = db.prepare("SELECT * FROM customers WHERE business_id = ? AND gstin = '27AAACA5566C1ZB'").get(businessId);
    const customer2 = db.prepare("SELECT * FROM customers WHERE business_id = ? AND gstin = '29AABCN8899D1ZG'").get(businessId);
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);

    // Invoice 1: Intra-state (CGST 9% + SGST 9%)
    const isIntra1 = isIntraState(business.state_code, customer1.state_code);
    const item1Gst = calculateItemGst(10, 2500, 18, isIntra1); // 25,000 + 2,250 + 2,250 = 29,500
    const item2Gst = calculateItemGst(1, 15000, 18, isIntra1); // 15,000 + 1,350 + 1,350 = 17,700
    const totals1 = calculateInvoiceTotals([item1Gst, item2Gst]); // 40,000 + 3,600 + 3,600 = 47,200

    const upiUri1 = buildDynamicUpiUri(business.upi_vpa, business.company_name, totals1.grandTotal, 'INV-2026-001');

    const inv1 = db.prepare(`
      INSERT INTO invoices (
        business_id, customer_id, invoice_number, invoice_date, due_date,
        subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
        upi_qr_string, status, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      customer1.id,
      'INV-2026-001',
      '2026-10-01',
      '2026-10-15',
      totals1.subtotal,
      totals1.cgstAmount,
      totals1.sgstAmount,
      totals1.igstAmount,
      totals1.grandTotal,
      0.00,
      upiUri1,
      'SENT',
      'Thank you for your business. Please scan the UPI QR code to make immediate payment.',
      '1. Payment due within 15 days of invoice date.\n2. Invoices overdue by 30+ days attract 18% p.a. interest.'
    );

    const insertInvItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, item_name, hsn_sac_code, quantity, unit, unit_price, tax_rate,
        cgst_amount, sgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInvItem.run(inv1.lastInsertRowid, 'Cloud Infrastructure Setup & Maintenance', '998313', 10, 'Hours', 2500, 18, item1Gst.cgstAmount, item1Gst.sgstAmount, 0, item1Gst.totalAmount);
    insertInvItem.run(inv1.lastInsertRowid, 'Dynamic Payment Gateway Integration Service', '998314', 1, 'Service', 15000, 18, item2Gst.cgstAmount, item2Gst.sgstAmount, 0, item2Gst.totalAmount);

    // Invoice 2: Inter-state (IGST 18%) - Partially Paid
    const isIntra2 = isIntraState(business.state_code, customer2.state_code);
    const item3Gst = calculateItemGst(1, 65000, 18, isIntra2); // 65,000 + 11,700 IGST = 76,700
    const totals2 = calculateInvoiceTotals([item3Gst]);

    const upiUri2 = buildDynamicUpiUri(business.upi_vpa, business.company_name, totals2.grandTotal - 30000, 'INV-2026-002');

    const inv2 = db.prepare(`
      INSERT INTO invoices (
        business_id, customer_id, invoice_number, invoice_date, due_date,
        subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount,
        upi_qr_string, status, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      customer2.id,
      'INV-2026-002',
      '2026-09-20',
      '2026-10-05',
      totals2.subtotal,
      totals2.cgstAmount,
      totals2.sgstAmount,
      totals2.igstAmount,
      totals2.grandTotal,
      30000.00,
      upiUri2,
      'PARTIAL',
      'Inter-state IT Hardware delivery to Bangalore datacenter.',
      'Goods once sold are covered under OEM warranty.'
    );

    insertInvItem.run(inv2.lastInsertRowid, 'High-Performance Bare-Metal Server Node', '847150', 1, 'Pcs', 65000, 18, 0, 0, item3Gst.igstAmount, item3Gst.totalAmount);

    // Record partial payment for Invoice 2
    db.prepare(`
      INSERT INTO payments (business_id, invoice_id, customer_id, payment_date, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(businessId, inv2.lastInsertRowid, customer2.id, '2026-09-25', 30000.00, 'UPI', 'UPI-REF-9923847', 'Part payment received via UPI QR scan');

    console.log('✓ Seeded Invoices (Intra-State with CGST+SGST, Inter-State with IGST) & Payment Record');
  }

  // 7. Seed Estimate / Quote
  const existingEstimates = db.prepare('SELECT COUNT(*) as count FROM estimates WHERE business_id = ?').get(businessId);
  if (existingEstimates.count === 0) {
    const customer1 = db.prepare("SELECT * FROM customers WHERE business_id = ? AND gstin = '27AAACA5566C1ZB'").get(businessId);
    const est = db.prepare(`
      INSERT INTO estimates (
        business_id, customer_id, estimate_number, estimate_date, expiry_date,
        subtotal, cgst_amount, sgst_amount, igst_amount, grand_total, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      customer1.id,
      'EST-2026-001',
      '2026-10-05',
      '2026-10-25',
      35000.00,
      3150.00,
      3150.00,
      0.00,
      41300.00,
      'SENT',
      'Quotation for Annual IT Support & AMC SLA contract.'
    );

    db.prepare(`
      INSERT INTO estimate_items (
        estimate_id, item_name, hsn_sac_code, quantity, unit, unit_price, tax_rate,
        cgst_amount, sgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(est.lastInsertRowid, 'IT Support & SLA AMC Annual Contract', '998713', 1, 'Year', 35000.00, 18.00, 3150.00, 3150.00, 0.00, 41300.00);

    console.log('✓ Seeded Estimate EST-2026-001 (Ready for 1-click conversion)');
  }

  // 8. Seed Expenses
  const existingExpenses = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE business_id = ?').get(businessId);
  if (existingExpenses.count === 0) {
    const insertExp = db.prepare(`
      INSERT INTO expenses (business_id, category, vendor_name, expense_date, amount, tax_amount, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExp.run(businessId, 'Cloud Hosting', 'Hostinger International', '2026-10-02', 8500.00, 1530.00, 'BANK_TRANSFER', 'Ubuntu VPS Dedicated instances');
    insertExp.run(businessId, 'Office Utilities & Fiber', 'Tata Tele Business', '2026-10-03', 4200.00, 756.00, 'UPI', 'Gigabit Leased Line');
    console.log('✓ Seeded Operating Expenses');
  }

  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
