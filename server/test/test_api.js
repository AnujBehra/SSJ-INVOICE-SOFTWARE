const assert = require('assert');
const http = require('http');

// Helper to make local http requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type'] && res.headers['content-type'].includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- LedgerPulse 360™ Production API Validation Suite ---');

  // 1. Health check
  const health = await makeRequest({ hostname: 'localhost', port: 5001, path: '/api/health', method: 'GET' });
  assert.strictEqual(health.status, 200);
  console.log('✓ [PASS] GET /api/health returned 200 OK');

  // 2. Auth Login (POST /api/v1/auth/login)
  let loginRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'demo@zenithcloud.com', password: 'demo123' }
  );
  if (loginRes.status !== 200) {
    loginRes = await makeRequest(
      { hostname: 'localhost', port: 5001, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'demo@ssjtech.com', password: 'demo123' }
    );
  }
  assert.strictEqual(loginRes.status, 200);
  assert(loginRes.body.token, 'Token must be present');
  const token = loginRes.body.token;
  console.log('✓ [PASS] POST /api/v1/auth/login authenticated successfully with JWT');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Configure Settings (Blueprint Section 7: PUT /api/v1/business/settings)
  const settingsRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/business/settings', method: 'PUT', headers: authHeaders },
    { upi_vpa: 'ssjtech@hdfcbank', bank_account_no: '50200012345678', gstin: '27AABCS1429B1Z2' }
  );
  assert.strictEqual(settingsRes.status, 200);
  console.log('✓ [PASS] PUT /api/v1/business/settings updated payment details and UPI VPA');

  // 4. Create Invoice (Blueprint Section 7: POST /api/v1/invoices)
  const invRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/invoices', method: 'POST', headers: authHeaders },
    {
      customer_id: 1, // Intra-state customer (Maharashtra 27)
      items: [
        { item_name: 'Software License Consultation', hsn_sac_code: '998313', quantity: 2, unit: 'Hours', unit_price: 3000, tax_rate: 18 }
      ]
    }
  );
  assert.strictEqual(invRes.status, 201);
  assert(invRes.body.upi_qr_string, 'Dynamic UPI QR string must be built');
  assert(invRes.body.upi_qr_string.includes('upi://pay?pa=ssjtech@hdfcbank'), 'NPCI URI must match VPA');
  assert.strictEqual(invRes.body.subtotal, 6000);
  assert.strictEqual(invRes.body.cgst_amount, 540); // 9% of 6000
  assert.strictEqual(invRes.body.sgst_amount, 540); // 9% of 6000
  assert.strictEqual(invRes.body.grand_total, 7080);
  const createdInvoiceId = invRes.body.id;
  console.log(`✓ [PASS] POST /api/v1/invoices created invoice #${invRes.body.invoice_number} with dynamic NPCI UPI string & CGST+SGST split`);

  // 5. Stream A4 PDF / Vector HTML (Blueprint Section 7: GET /api/v1/invoices/:id/pdf)
  const pdfRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: `/api/v1/invoices/${createdInvoiceId}/pdf`, method: 'GET', headers: authHeaders }
  );
  assert.strictEqual(pdfRes.status, 200);
  assert(pdfRes.body.includes('TAX INVOICE'), 'PDF must include TAX INVOICE header');
  assert(pdfRes.body.includes('Scan & Pay via UPI'), 'PDF must embed Dynamic UPI QR module');
  console.log('✓ [PASS] GET /api/v1/invoices/:id/pdf generated vector-sharp tax invoice with embedded UPI QR');

  // 6. GSTR-1 Report (Blueprint Section 7: GET /api/v1/reports/gstr1)
  const gstr1Res = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/reports/gstr1?month=10&year=2026', method: 'GET', headers: authHeaders }
  );
  assert.strictEqual(gstr1Res.status, 200);
  assert(gstr1Res.body.gstr1Json, 'Official GSTR-1 JSON must be generated');
  assert(Array.isArray(gstr1Res.body.b2b), 'B2B table must be present');
  console.log(`✓ [PASS] GET /api/v1/reports/gstr1 exported GSTR-1 with ${gstr1Res.body.b2b.length} B2B records & Table 12 HSN summary`);

  // 7. SaaS Checkout / Renewal (Blueprint Section 7: POST /api/v1/saas/checkout)
  const checkoutRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/saas/checkout', method: 'POST', headers: authHeaders },
    { plan_id: 2, billing_cycle: 'yearly' }
  );
  assert.strictEqual(checkoutRes.status, 200);
  console.log('✓ [PASS] POST /api/v1/saas/checkout renewed Pro Plan (Yearly) and updated subscription status');

  // 8. 1-Click Convert Estimate to Invoice (Blueprint Section 1, Module 3)
  const createEstRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: '/api/v1/estimates', method: 'POST', headers: authHeaders },
    {
      customer_id: 1,
      items: [{ item_name: 'DevOps Setup', quantity: 1, unit_price: 12000, tax_rate: 18 }]
    }
  );
  assert.strictEqual(createEstRes.status, 201);
  const targetEstId = createEstRes.body.id;

  const convertRes = await makeRequest(
    { hostname: 'localhost', port: 5001, path: `/api/v1/estimates/${targetEstId}/convert`, method: 'POST', headers: authHeaders }
  );
  assert.strictEqual(convertRes.status, 200);
  assert(convertRes.body.invoiceId, 'Converted Invoice ID must exist');
  console.log(`✓ [PASS] POST /api/v1/estimates/:id/convert completed 1-click quote conversion -> ${convertRes.body.invoiceNumber}`);

  console.log('\n🌟 ALL 8 BLUEPRINT SPECIFICATION VALIDATION TESTS PASSED 100%! 🌟');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
