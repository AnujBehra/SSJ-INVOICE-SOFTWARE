const { generateQrDataUrl } = require('./upi');
const { numberToIndianWords } = require('./numToWords');
const { GST_STATE_CODES } = require('./gst');

/**
 * Generates high-fidelity, printable A4 HTML/CSS Tax Invoice with embedded Base64 UPI QR
 * Formatted cleanly according to Indian GST standards and Zoho Invoice benchmarks
 */
async function renderInvoiceHtml(invoice, business, customer, items) {
  const qrBase64 = invoice.upi_qr_string ? await generateQrDataUrl(invoice.upi_qr_string) : null;
  const isIntra = String(business.state_code || '').padStart(2, '0') === String(customer.state_code || '').padStart(2, '0');
  const amountWords = numberToIndianWords(invoice.grand_total);
  const businessStateName = GST_STATE_CODES[String(business.state_code || '').padStart(2, '0')] || 'State';
  const customerStateName = GST_STATE_CODES[String(customer.state_code || '').padStart(2, '0')] || 'State';

  const balanceDue = Math.max(0, invoice.grand_total - invoice.paid_amount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice.invoice_number}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 850px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .badge-tax {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 3px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
      text-align: right;
    }
    .meta-table {
      margin-left: auto;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .meta-table td {
      padding: 3px 8px;
      text-align: right;
      font-size: 12.5px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-value {
      color: #0f172a;
      font-weight: 700;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    .parties-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }
    .party-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .party-col:last-child {
      padding-left: 24px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-detail {
      color: #475569;
      font-size: 12.5px;
      line-height: 1.4;
    }
    .table-items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #cbd5e1;
    }
    .table-items th {
      background: #f8fafc;
      color: #334155;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 10px 8px;
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #e2e8f0;
      text-align: left;
    }
    .table-items td {
      padding: 10px 8px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      font-size: 12.5px;
      vertical-align: top;
    }
    .table-items tr:last-child td {
      border-bottom: 1px solid #cbd5e1;
    }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .summary-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }
    .summary-left {
      display: table-cell;
      width: 55%;
      vertical-align: top;
      padding-right: 24px;
    }
    .summary-right {
      display: table-cell;
      width: 45%;
      vertical-align: top;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 10px;
      font-size: 13px;
    }
    .grand-total-row td {
      background: #f1f5f9;
      font-weight: 800;
      font-size: 16px;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      padding: 10px;
    }
    .upi-box {
      border: 1px dashed #4f46e5;
      background: #f5f3ff;
      border-radius: 8px;
      padding: 14px;
      display: table;
      width: 100%;
      margin-top: 10px;
    }
    .upi-qr-cell {
      display: table-cell;
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }
    .upi-info-cell {
      display: table-cell;
      vertical-align: middle;
      padding-left: 14px;
    }
    .bank-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      background: #fafafa;
      margin-bottom: 14px;
      font-size: 12px;
    }
    .amount-words-box {
      background: #f8fafc;
      border-left: 3px solid #4f46e5;
      padding: 8px 12px;
      font-style: italic;
      font-size: 12px;
      color: #334155;
      margin-bottom: 16px;
    }
    .footer-notes {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    .signatory {
      text-align: right;
      margin-top: 40px;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-PAID { background: #dcfce7; color: #15803d; }
    .status-PARTIAL { background: #fef9c3; color: #a16207; }
    .status-SENT { background: #dbeafe; color: #1d4ed8; }
    .status-DRAFT { background: #f1f5f9; color: #475569; }
    .no-print {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn-action {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-action" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="invoice-card">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 55%;">
          <div class="badge-tax">TAX INVOICE</div>
          <h1 class="company-title">${business.company_name}</h1>
          <div class="party-detail">
            ${business.address_line1 ? business.address_line1 + '<br>' : ''}
            ${business.city ? business.city + ', ' : ''} ${businessStateName} - ${business.pincode || ''}<br>
            <strong>GSTIN:</strong> ${business.gstin || 'Unregistered'}<br>
            <strong>State Code:</strong> ${business.state_code} (${businessStateName})<br>
            ${business.phone ? '<strong>Phone:</strong> ' + business.phone + '<br>' : ''}
            <strong>Email:</strong> ${business.email}
          </div>
        </td>
        <td style="width: 45%;">
          <h2 class="invoice-title">#${invoice.invoice_number}</h2>
          <div style="text-align: right; margin-top: 6px;">
            <span class="status-badge status-${invoice.status}">${invoice.status}</span>
          </div>
          <table class="meta-table">
            <tr>
              <td class="meta-label">Invoice Date:</td>
              <td class="meta-value">${invoice.invoice_date}</td>
            </tr>
            <tr>
              <td class="meta-label">Due Date:</td>
              <td class="meta-value">${invoice.due_date}</td>
            </tr>
            <tr>
              <td class="meta-label">Place of Supply (POS):</td>
              <td class="meta-value">${customer.state_code} - ${customerStateName}</td>
            </tr>
            <tr>
              <td class="meta-label">Tax Type:</td>
              <td class="meta-value" style="color: #4f46e5;">${isIntra ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="divider"></div>

    <!-- Bill To / Ship To -->
    <div class="parties-grid">
      <div class="party-col">
        <div class="section-title">Billed To (Customer):</div>
        <div class="party-name">${customer.company_name || customer.customer_name}</div>
        <div class="party-detail">
          ${customer.company_name ? 'Attn: ' + customer.customer_name + '<br>' : ''}
          ${customer.billing_address || 'Address on file'}<br>
          <strong>State:</strong> ${customerStateName} (Code: ${customer.state_code})<br>
          <strong>GSTIN:</strong> ${customer.gstin || 'Consumer / Unregistered'}<br>
          ${customer.phone ? '<strong>Phone:</strong> ' + customer.phone + '<br>' : ''}
          ${customer.email ? '<strong>Email:</strong> ' + customer.email : ''}
        </div>
      </div>
      <div class="party-col">
        <div class="section-title">Shipped / Delivered To:</div>
        <div class="party-detail">
          ${customer.shipping_address || customer.billing_address || 'Same as billing address'}<br>
          <strong>Place of Supply:</strong> ${customerStateName} (${customer.state_code})
        </div>
      </div>
    </div>

    <!-- Items Table with GST Split -->
    <table class="table-items">
      <thead>
        <tr>
          <th style="width: 4%;" class="text-center">#</th>
          <th style="width: 32%;">Item Description</th>
          <th style="width: 10%;" class="text-center">HSN/SAC</th>
          <th style="width: 8%;" class="text-right">Qty</th>
          <th style="width: 12%;" class="text-right">Rate (₹)</th>
          <th style="width: 12%;" class="text-right">Taxable (₹)</th>
          ${isIntra ? `
            <th style="width: 11%;" class="text-right">CGST</th>
            <th style="width: 11%;" class="text-right">SGST</th>
          ` : `
            <th style="width: 16%;" class="text-right">IGST</th>
          `}
          <th style="width: 14%;" class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>
              <strong>${it.item_name}</strong>
            </td>
            <td class="text-center">${it.hsn_sac_code || '-'}</td>
            <td class="text-right">${it.quantity} ${it.unit || ''}</td>
            <td class="text-right">₹${Number(it.unit_price).toFixed(2)}</td>
            <td class="text-right">₹${Number(it.quantity * it.unit_price).toFixed(2)}</td>
            ${isIntra ? `
              <td class="text-right">
                <span style="font-size: 11px; color: #64748b;">${it.tax_rate / 2}%</span><br>
                ₹${Number(it.cgst_amount).toFixed(2)}
              </td>
              <td class="text-right">
                <span style="font-size: 11px; color: #64748b;">${it.tax_rate / 2}%</span><br>
                ₹${Number(it.sgst_amount).toFixed(2)}
              </td>
            ` : `
              <td class="text-right">
                <span style="font-size: 11px; color: #64748b;">${it.tax_rate}%</span><br>
                ₹${Number(it.igst_amount).toFixed(2)}
              </td>
            `}
            <td class="text-right"><strong>₹${Number(it.total_amount).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Amount in Words -->
    <div class="amount-words-box">
      <strong>Total in Words:</strong> ${amountWords}
    </div>

    <!-- Summary & UPI QR Section -->
    <div class="summary-grid">
      <div class="summary-left">
        <!-- Bank Details -->
        ${business.bank_name ? `
          <div class="bank-box">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Bank Transfer Details:</div>
            <strong>Bank:</strong> ${business.bank_name}<br>
            <strong>A/C No:</strong> ${business.bank_account_no}<br>
            <strong>IFSC:</strong> ${business.bank_ifsc}<br>
            ${business.upi_vpa ? `<strong>UPI ID:</strong> ${business.upi_vpa}` : ''}
          </div>
        ` : ''}

        <!-- Dynamic NPCI UPI QR Engine Box -->
        ${qrBase64 && balanceDue > 0 ? `
          <div class="upi-box">
            <div class="upi-qr-cell">
              <img src="${qrBase64}" alt="UPI QR Code" style="width: 120px; height: 120px; border-radius: 4px; display: block; margin: 0 auto; border: 1px solid #cbd5e1;">
            </div>
            <div class="upi-info-cell">
              <div style="font-weight: 800; font-size: 14px; color: #4338ca; margin-bottom: 2px;">⚡ Scan & Pay via UPI</div>
              <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">
                Use Google Pay, PhonePe, Paytm, BHIM, or any UPI App.
              </div>
              <div style="font-size: 12px;"><strong>Amount:</strong> <span style="font-size: 14px; color: #0f172a; font-weight: 800;">₹${balanceDue.toFixed(2)}</span></div>
              <div style="font-size: 11.5px; color: #64748b;"><strong>UPI VPA:</strong> ${business.upi_vpa}</div>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="summary-right">
        <table class="totals-table">
          <tr>
            <td class="meta-label">Taxable Subtotal:</td>
            <td class="text-right meta-value">₹${Number(invoice.subtotal).toFixed(2)}</td>
          </tr>
          ${isIntra ? `
            <tr>
              <td class="meta-label">Central GST (CGST):</td>
              <td class="text-right meta-value">₹${Number(invoice.cgst_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="meta-label">State GST (SGST):</td>
              <td class="text-right meta-value">₹${Number(invoice.sgst_amount).toFixed(2)}</td>
            </tr>
          ` : `
            <tr>
              <td class="meta-label">Integrated GST (IGST):</td>
              <td class="text-right meta-value">₹${Number(invoice.igst_amount).toFixed(2)}</td>
            </tr>
          `}
          <tr class="grand-total-row">
            <td>Grand Total:</td>
            <td class="text-right">₹${Number(invoice.grand_total).toFixed(2)}</td>
          </tr>
          <tr>
            <td class="meta-label">Amount Paid:</td>
            <td class="text-right" style="color: #16a34a; font-weight: 700;">₹${Number(invoice.paid_amount).toFixed(2)}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="font-weight: 700; color: #dc2626;">Balance Due:</td>
            <td class="text-right" style="font-weight: 800; font-size: 15px; color: #dc2626;">₹${balanceDue.toFixed(2)}</td>
          </tr>
        </table>

        <div class="signatory">
          For <strong>${business.company_name}</strong>
          <br><br><br>
          <div style="border-top: 1px dashed #94a3b8; display: inline-block; padding-top: 4px; min-width: 140px; text-align: center;">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>

    <!-- Notes & Terms -->
    ${invoice.notes || invoice.terms ? `
      <div class="footer-notes">
        ${invoice.notes ? `<strong>Notes:</strong><br>${invoice.notes.replace(/\n/g, '<br>')}<br><br>` : ''}
        ${invoice.terms ? `<strong>Terms & Conditions:</strong><br>${invoice.terms.replace(/\n/g, '<br>')}` : ''}
      </div>
    ` : ''}
  </div>
</body>
</html>`;
}

module.exports = { renderInvoiceHtml };
