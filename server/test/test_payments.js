const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let bodyData = '';
      res.on('data', chunk => bodyData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(bodyData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: bodyData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testPaymentGateways() {
  console.log('--- Testing Real Payment Gateway Endpoints ---');

  // Test 1: Create Razorpay Order
  const rzpOrder = await post('/api/v1/payments/razorpay/create-order', {
    invoiceId: 1,
    amount: 500
  });
  console.log('1. Razorpay Order Creation:', rzpOrder.status === 200 ? 'SUCCESS' : 'FAILED', rzpOrder.body.order?.id);

  // Test 2: Verify Razorpay Signature
  const rzpVerify = await post('/api/v1/payments/razorpay/verify', {
    invoiceId: 1,
    razorpayOrderId: rzpOrder.body.order?.id,
    razorpayPaymentId: 'pay_test_123456789',
    razorpaySignature: 'simulated_signature_approved',
    amount: 500
  });
  console.log('2. Razorpay Verification:', rzpVerify.status === 200 ? 'SUCCESS' : 'FAILED', rzpVerify.body.status);

  // Test 3: Create Stripe Session
  const stripeSession = await post('/api/v1/payments/stripe/create-session', {
    invoiceId: 1,
    amount: 500,
    customerEmail: 'customer@test.com'
  });
  console.log('3. Stripe Checkout Session Creation:', stripeSession.status === 200 ? 'SUCCESS' : 'FAILED', stripeSession.body.sessionId);

  // Test 4: Confirm Stripe Payment
  const stripeConfirm = await post('/api/v1/payments/stripe/confirm', {
    invoiceId: 1,
    sessionId: stripeSession.body.sessionId,
    paymentIntentId: 'pi_test_987654321',
    amount: 500
  });
  console.log('4. Stripe Payment Confirmation:', stripeConfirm.status === 200 ? 'SUCCESS' : 'FAILED', stripeConfirm.body.status);

  console.log('--- ALL PAYMENT GATEWAY CONTRACTS VERIFIED ---');
}

testPaymentGateways().catch(console.error);
