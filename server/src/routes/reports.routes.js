const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { GST_STATE_CODES } = require('../services/gst');

function resolveBusiness(req) {
  let businessId = req.query.business_id || (req.user && req.user.business_id);
  if (!businessId) {
    const firstBiz = db.prepare('SELECT id FROM businesses ORDER BY id ASC LIMIT 1').get();
    businessId = firstBiz ? firstBiz.id : null;
  }
  if (!businessId) {
    return null;
  }
  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) || null;
}

/**
 * GET /api/v1/reports/gstr1
 * Core REST API Endpoint Contract (Blueprint Section 7)
 * Query: ?month=10&year=2026
 * Export official GSTR-1 JSON/CSV ready for GST Portal upload
 */
router.get('/gstr1', authenticateToken, (req, res) => {
  try {
    const business = resolveBusiness(req);
    const month = req.query.month ? String(req.query.month).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const year = req.query.year ? String(req.query.year) : String(new Date().getFullYear());

    if (!business) {
      return res.json({
        period: { month, year },
        business: null,
        b2b: [],
        b2cl: [],
        b2cs: [],
        hsn: [],
        gstr1Json: null,
        totals: {
          totalTaxable: 0,
          totalIgst: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalTax: 0,
          grandTotal: 0
        }
      });
    }

    const startDate = `${year}-${month}-01`;
    // Last day of month
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const invoices = db.prepare(`
      SELECT 
        i.*,
        c.customer_name,
        c.company_name as customer_company,
        c.gstin as customer_gstin,
        c.state_code as customer_state_code
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ? 
        AND i.invoice_date >= ? 
        AND i.invoice_date <= ?
        AND i.status != 'CANCELLED'
      ORDER BY i.invoice_date ASC
    `).all(business.id, startDate, endDate);

    const b2bInvoices = [];
    const b2clInvoices = [];
    const b2csInvoices = [];
    const hsnMap = {};

    for (const inv of invoices) {
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      const isInterState = String(business.state_code).padStart(2, '0') !== String(inv.customer_state_code).padStart(2, '0');
      const hasGstin = Boolean(inv.customer_gstin && inv.customer_gstin.trim().length >= 15);

      // Accumulate HSN Summary
      for (const it of items) {
        const code = it.hsn_sac_code || '999999';
        if (!hsnMap[code]) {
          hsnMap[code] = {
            hsn_sc: code,
            desc: it.item_name,
            uqc: it.unit || 'OTH',
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0
          };
        }
        hsnMap[code].qty += Number(it.quantity);
        hsnMap[code].val += Number(it.total_amount);
        hsnMap[code].txval += Number(it.quantity) * Number(it.unit_price);
        hsnMap[code].iamt += Number(it.igst_amount);
        hsnMap[code].camt += Number(it.cgst_amount);
        hsnMap[code].samt += Number(it.sgst_amount);
      }

      // Classification into GSTR-1 Tables
      if (hasGstin) {
        // Table 4: B2B
        b2bInvoices.push({
          ctin: inv.customer_gstin,
          cname: inv.customer_company || inv.customer_name,
          inum: inv.invoice_number,
          idt: inv.invoice_date,
          val: Number(inv.grand_total),
          pos: inv.customer_state_code,
          rchrg: 'N',
          inv_typ: 'R',
          taxable_value: Number(inv.subtotal),
          igst: Number(inv.igst_amount),
          cgst: Number(inv.cgst_amount),
          sgst: Number(inv.sgst_amount),
          items
        });
      } else if (isInterState && Number(inv.grand_total) > 250000) {
        // Table 5: B2CL (Inter-state unregistered > ₹2.5 Lakhs)
        b2clInvoices.push({
          pos: inv.customer_state_code,
          inum: inv.invoice_number,
          idt: inv.invoice_date,
          val: Number(inv.grand_total),
          taxable_value: Number(inv.subtotal),
          igst: Number(inv.igst_amount)
        });
      } else {
        // Table 7: B2CS (Small B2C Intra-state or Inter-state <= ₹2.5 Lakhs)
        b2csInvoices.push({
          pos: inv.customer_state_code,
          taxable_value: Number(inv.subtotal),
          igst: Number(inv.igst_amount),
          cgst: Number(inv.cgst_amount),
          sgst: Number(inv.sgst_amount),
          grand_total: Number(inv.grand_total)
        });
      }
    }

    const hsnSummary = Object.values(hsnMap).map(h => ({
      ...h,
      qty: Math.round(h.qty * 100) / 100,
      val: Math.round(h.val * 100) / 100,
      txval: Math.round(h.txval * 100) / 100,
      iamt: Math.round(h.iamt * 100) / 100,
      camt: Math.round(h.camt * 100) / 100,
      samt: Math.round(h.samt * 100) / 100
    }));

    // GSTN Standard JSON Structure
    const gstr1Json = {
      gstin: business.gstin || 'UNREGISTERED',
      fp: `${month}${year}`,
      version: 'GSTR1_v2.0',
      hash: 'hash-placeholder',
      b2b: b2bInvoices.map(b => ({
        ctin: b.ctin,
        inv: [{
          inum: b.inum,
          idt: b.idt.split('-').reverse().join('-'), // DD-MM-YYYY
          val: b.val,
          pos: b.pos,
          rchrg: b.rchrg,
          inv_typ: b.inv_typ,
          itms: b.items.map((it, idx) => ({
            num: idx + 1,
            itm_det: {
              rt: it.tax_rate,
              txval: Number(it.quantity * it.unit_price),
              iamt: it.igst_amount,
              camt: it.cgst_amount,
              samt: it.sgst_amount,
              csamt: 0
            }
          }))
        }]
      })),
      b2cl: b2clInvoices,
      b2cs: b2csInvoices,
      hsn: { data: hsnSummary }
    };

    res.json({
      meta: {
        business_name: business.company_name,
        gstin: business.gstin,
        period: `${month}/${year}`,
        startDate,
        endDate,
        total_invoices: invoices.length
      },
      summary: {
        b2b_count: b2bInvoices.length,
        b2cl_count: b2clInvoices.length,
        b2cs_count: b2csInvoices.length,
        hsn_count: hsnSummary.length
      },
      b2b: b2bInvoices,
      b2cl: b2clInvoices,
      b2cs: b2csInvoices,
      hsn: hsnSummary,
      gstr1Json
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/reports/gstr3b
 * Summary report: Outward Taxable Supplies (Table 3.1) and Eligible ITC (Table 4)
 */
router.get('/gstr3b', authenticateToken, (req, res) => {
  try {
    const business = resolveBusiness(req);
    const month = req.query.month ? String(req.query.month).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const year = req.query.year ? String(req.query.year) : String(new Date().getFullYear());

    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    if (!business) {
      return res.json({
        period: `${month}/${year}`,
        startDate,
        endDate,
        business: {
          name: 'No Business Configured',
          gstin: ''
        },
        table_3_1_outward_supplies: {
          taxable_value: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0.00
        },
        table_4_eligible_itc: {
          total_eligible_tax: 0,
          itc_igst: 0.00,
          itc_cgst: 0,
          itc_sgst: 0
        },
        net_tax_payable: {
          igst: 0,
          cgst: 0,
          sgst: 0,
          total: 0
        }
      });
    }

    // 3.1 Outward Taxable Supplies from Invoices
    const sales = db.prepare(`
      SELECT 
        COALESCE(SUM(subtotal), 0) as total_taxable,
        COALESCE(SUM(igst_amount), 0) as total_igst,
        COALESCE(SUM(cgst_amount), 0) as total_cgst,
        COALESCE(SUM(sgst_amount), 0) as total_sgst
      FROM invoices 
      WHERE business_id = ? 
        AND invoice_date >= ? 
        AND invoice_date <= ?
        AND status != 'CANCELLED'
    `).get(business.id, startDate, endDate);

    // 4. Eligible ITC from Expenses
    const expenses = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expense,
        COALESCE(SUM(tax_amount), 0) as total_tax_input
      FROM expenses 
      WHERE business_id = ? 
        AND expense_date >= ? 
        AND expense_date <= ?
    `).get(business.id, startDate, endDate);

    // Split expense tax input 50/50 CGST & SGST assumption
    const itmInputTax = Number(expenses.total_tax_input);
    const itcCGST = Math.round((itmInputTax / 2) * 100) / 100;
    const itcSGST = Math.round((itmInputTax / 2) * 100) / 100;

    const netIgst = Number(sales.total_igst);
    const netCgst = Math.max(0, Number(sales.total_cgst) - itcCGST);
    const netSgst = Math.max(0, Number(sales.total_sgst) - itcSGST);

    res.json({
      period: `${month}/${year}`,
      startDate,
      endDate,
      business: {
        name: business.company_name,
        gstin: business.gstin
      },
      table_3_1_outward_supplies: {
        taxable_value: Math.round(sales.total_taxable * 100) / 100,
        igst: Math.round(sales.total_igst * 100) / 100,
        cgst: Math.round(sales.total_cgst * 100) / 100,
        sgst: Math.round(sales.total_sgst * 100) / 100,
        cess: 0.00
      },
      table_4_eligible_itc: {
        total_eligible_tax: itmInputTax,
        itc_igst: 0.00,
        itc_cgst: itcCGST,
        itc_sgst: itcSGST
      },
      net_tax_payable: {
        igst: Math.round(netIgst * 100) / 100,
        cgst: Math.round(netCgst * 100) / 100,
        sgst: Math.round(netSgst * 100) / 100,
        total: Math.round((netIgst + netCgst + netSgst) * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/reports/aging
 * Invoice Aging Report: Current, 1-30, 31-60, 60+ Days Overdue
 */
router.get('/aging', authenticateToken, (req, res) => {
  try {
    const business = resolveBusiness(req);
    if (!business) {
      return res.json({
        totalOutstanding: 0,
        buckets: {
          current: { label: 'Current (Not Overdue)', count: 0, amount: 0, items: [] },
          days_1_30: { label: '1 - 30 Days Overdue', count: 0, amount: 0, items: [] },
          days_31_60: { label: '31 - 60 Days Overdue', count: 0, amount: 0, items: [] },
          days_60_plus: { label: '60+ Days Overdue', count: 0, amount: 0, items: [] }
        }
      });
    }

    const today = new Date();
    const unpaidInvoices = db.prepare(`
      SELECT 
        i.id, i.invoice_number, i.invoice_date, i.due_date,
        i.grand_total, i.paid_amount, (i.grand_total - i.paid_amount) as balance_due,
        i.status,
        c.customer_name, c.company_name as customer_company
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ? AND i.status != 'PAID' AND i.status != 'CANCELLED'
    `).all(business.id);

    const buckets = {
      current: { label: 'Current (Not Overdue)', count: 0, amount: 0, items: [] },
      days_1_30: { label: '1 - 30 Days Overdue', count: 0, amount: 0, items: [] },
      days_31_60: { label: '31 - 60 Days Overdue', count: 0, amount: 0, items: [] },
      days_60_plus: { label: '60+ Days Overdue', count: 0, amount: 0, items: [] }
    };

    for (const inv of unpaidInvoices) {
      const dueDate = new Date(inv.due_date);
      const diffTime = today - dueDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const balance = Number(inv.balance_due);

      const record = { ...inv, daysOverdue: Math.max(0, diffDays) };

      if (diffDays <= 0) {
        buckets.current.count += 1;
        buckets.current.amount += balance;
        buckets.current.items.push(record);
      } else if (diffDays <= 30) {
        buckets.days_1_30.count += 1;
        buckets.days_1_30.amount += balance;
        buckets.days_1_30.items.push(record);
      } else if (diffDays <= 60) {
        buckets.days_31_60.count += 1;
        buckets.days_31_60.amount += balance;
        buckets.days_31_60.items.push(record);
      } else {
        buckets.days_60_plus.count += 1;
        buckets.days_60_plus.amount += balance;
        buckets.days_60_plus.items.push(record);
      }
    }

    const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.amount, 0);

    res.json({
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      buckets
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/reports/sales-register
 */
router.get('/sales-register', authenticateToken, (req, res) => {
  try {
    const business = resolveBusiness(req);
    if (!business) {
      return res.json([]);
    }

    const list = db.prepare(`
      SELECT 
        i.invoice_number, i.invoice_date, i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount,
        i.grand_total, i.paid_amount, i.status,
        c.customer_name, c.company_name as customer_company, c.gstin as customer_gstin,
        c.state_code as customer_state_code
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ?
      ORDER BY i.invoice_date DESC
    `).all(business.id);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
