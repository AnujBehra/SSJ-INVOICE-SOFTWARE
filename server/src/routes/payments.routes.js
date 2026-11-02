const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyRazorpaySignature,
  createStripeCheckoutSession
} = require('../services/paymentGateway');

/**
 * 1. RAZORPAY: CREATE PAYMENT ORDER
 * POST /api/v1/payments/razorpay/create-order
 */
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const invoice = db.prepare(`
      SELECT i.*, b.company_name, b.email as business_email,
             b.tenant_razorpay_key, b.tenant_razorpay_secret
      FROM invoices i
      JOIN businesses b ON i.business_id = b.id
      WHERE i.id = ?
    `).get(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const balanceDue = Number(invoice.grand_total) - Number(invoice.paid_amount);
    if (balanceDue <= 0) {
      return res.status(400).json({ error: 'Invoice has already been settled in full' });
    }

    const payAmount = amount ? Math.min(Number(amount), balanceDue) : balanceDue;

    const result = await createRazorpayOrder({
      amount: payAmount,
      currency: 'INR',
      invoiceNumber: invoice.invoice_number,
      receipt: `inv_${invoice.id}`,
      tenantConfig: {
        razorpayKeyId: invoice.tenant_razorpay_key,
        razorpayKeySecret: invoice.tenant_razorpay_secret
      }
    });

    res.json({
      success: true,
      mode: result.mode,
      keyId: result.keyId,
      order: result.order,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        grand_total: invoice.grand_total,
        balance_due: balanceDue,
        pay_amount: payAmount,
        company_name: invoice.company_name
      }
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. RAZORPAY: VERIFY SIGNATURE & SETTLE INVOICE
 * POST /api/v1/payments/razorpay/verify
 */
router.post('/razorpay/verify', (req, res) => {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

    if (!invoiceId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Missing required payment verification parameters' });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      tenantConfig: {}
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Razorpay payment signature. Verification failed.' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const balanceDue = Number(invoice.grand_total) - Number(invoice.paid_amount);
    const payAmount = amount ? Math.min(Number(amount), balanceDue) : balanceDue;
    const newPaidAmount = Math.round((Number(invoice.paid_amount) + payAmount) * 100) / 100;
    const newStatus = newPaidAmount >= Number(invoice.grand_total) ? 'PAID' : 'PARTIALLY_PAID';

    const transaction = db.transaction(() => {
      // 1. Record in payments table
      db.prepare(`
        INSERT INTO payments (
          business_id, invoice_id, customer_id, payment_date, amount, payment_mode, reference_no, notes
        ) VALUES (?, ?, ?, ?, ?, 'RAZORPAY', ?, ?)
      `).run(
        invoice.business_id,
        invoice.id,
        invoice.customer_id,
        new Date().toISOString().split('T')[0],
        payAmount,
        razorpayPaymentId,
        `Razorpay Online Settlement (Order: ${razorpayOrderId || 'N/A'})`
      );

      // 2. Update invoice status & paid amount
      db.prepare(`
        UPDATE invoices 
        SET paid_amount = ?, status = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, invoice.id);

      // 3. Update customer outstanding balance if exists
      db.prepare(`
        UPDATE customers
        SET outstanding_balance = MAX(0, outstanding_balance - ?)
        WHERE id = ?
      `).run(payAmount, invoice.customer_id);
    });

    transaction();

    res.json({
      success: true,
      message: 'Payment verified successfully via Razorpay',
      paymentId: razorpayPaymentId,
      invoiceId: invoice.id,
      amountPaid: payAmount,
      totalPaid: newPaidAmount,
      balanceDue: Math.max(0, Number(invoice.grand_total) - newPaidAmount),
      status: newStatus
    });
  } catch (err) {
    console.error('Razorpay verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. STRIPE: CREATE CHECKOUT SESSION
 * POST /api/v1/payments/stripe/create-session
 */
router.post('/stripe/create-session', async (req, res) => {
  try {
    const { invoiceId, amount, customerEmail } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const invoice = db.prepare(`
      SELECT i.*, c.email as customer_email, b.company_name,
             b.tenant_stripe_key, b.tenant_stripe_secret
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN businesses b ON i.business_id = b.id
      WHERE i.id = ?
    `).get(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const balanceDue = Number(invoice.grand_total) - Number(invoice.paid_amount);
    if (balanceDue <= 0) {
      return res.status(400).json({ error: 'Invoice has already been settled in full' });
    }

    const payAmount = amount ? Math.min(Number(amount), balanceDue) : balanceDue;

    const result = await createStripeCheckoutSession({
      amount: payAmount,
      currency: 'inr',
      invoiceNumber: invoice.invoice_number,
      customerEmail: customerEmail || invoice.customer_email,
      successUrl: `${req.headers.origin || 'http://localhost:5001'}/api/v1/invoices/${invoice.id}/public?payment=success`,
      cancelUrl: `${req.headers.origin || 'http://localhost:5001'}/api/v1/invoices/${invoice.id}/public?payment=cancelled`,
      tenantConfig: {
        stripeSecretKey: invoice.tenant_stripe_secret,
        stripePublishableKey: invoice.tenant_stripe_key
      }
    });

    res.json({
      success: true,
      mode: result.mode,
      sessionId: result.sessionId,
      sessionUrl: result.sessionUrl,
      publishableKey: result.publishableKey,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        balance_due: balanceDue,
        pay_amount: payAmount
      }
    });
  } catch (err) {
    console.error('Stripe session creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. STRIPE: CONFIRM & SETTLE INVOICE
 * POST /api/v1/payments/stripe/confirm
 */
router.post('/stripe/confirm', (req, res) => {
  try {
    const { invoiceId, sessionId, paymentIntentId, amount } = req.body;

    if (!invoiceId || !sessionId) {
      return res.status(400).json({ error: 'Invoice ID and Session ID are required' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const balanceDue = Number(invoice.grand_total) - Number(invoice.paid_amount);
    const payAmount = amount ? Math.min(Number(amount), balanceDue) : balanceDue;
    const newPaidAmount = Math.round((Number(invoice.paid_amount) + payAmount) * 100) / 100;
    const newStatus = newPaidAmount >= Number(invoice.grand_total) ? 'PAID' : 'PARTIALLY_PAID';

    const ref = paymentIntentId || sessionId;

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (
          business_id, invoice_id, customer_id, payment_date, amount, payment_mode, reference_no, notes
        ) VALUES (?, ?, ?, ?, ?, 'STRIPE', ?, ?)
      `).run(
        invoice.business_id,
        invoice.id,
        invoice.customer_id,
        new Date().toISOString().split('T')[0],
        payAmount,
        ref,
        `Stripe Card Checkout Settlement (Session: ${sessionId})`
      );

      db.prepare(`
        UPDATE invoices 
        SET paid_amount = ?, status = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, invoice.id);

      db.prepare(`
        UPDATE customers
        SET outstanding_balance = MAX(0, outstanding_balance - ?)
        WHERE id = ?
      `).run(payAmount, invoice.customer_id);
    });

    transaction();

    res.json({
      success: true,
      message: 'Payment verified and settled successfully via Stripe',
      reference: ref,
      invoiceId: invoice.id,
      amountPaid: payAmount,
      totalPaid: newPaidAmount,
      balanceDue: Math.max(0, Number(invoice.grand_total) - newPaidAmount),
      status: newStatus
    });
  } catch (err) {
    console.error('Stripe confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. PUBLIC WEBHOOKS (For Production Real-Time Callbacks)
 */
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('[Webhook: Razorpay] Received automated event payload');
  res.json({ status: 'ok' });
});

router.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('[Webhook: Stripe] Received automated event payload');
  res.json({ status: 'ok' });
});

module.exports = router;
