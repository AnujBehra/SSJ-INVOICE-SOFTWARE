const { generateQrDataUrl } = require('./upi');
const { GST_STATE_CODES } = require('./gst');

/**
 * Generates compact 3-inch (80mm) Thermal POS Receipt
 * Conforms to Phase 4 Blueprint Specification (Thermal Receipt Generator)
 */
async function renderThermalReceiptHtml(invoice, business, customer, items) {
  const qrBase64 = invoice.upi_qr_string ? await generateQrDataUrl(invoice.upi_qr_string) : null;
  const isIntra = String(business.state_code || '').padStart(2, '0') === String(customer.state_code || '').padStart(2, '0');
  const balanceDue = Math.max(0, invoice.grand_total - invoice.paid_amount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt #${invoice.invoice_number}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm 3mm;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 76mm;
      margin: 0 auto;
      padding: 4mm 1mm;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.3;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .header-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    th, td {
      padding: 2px 0;
    }
    .qr-container {
      text-align: center;
      margin: 8px 0;
    }
    .qr-container img {
      width: 140px;
      height: 140px;
    }
    .no-print {
      margin-bottom: 8px;
      text-align: center;
    }
    .btn-print {
      background: #000;
      color: #fff;
      border: none;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .no-print { display: none; }
      body { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print 3" Thermal Receipt</button>
  </div>

  <div class="text-center">
    <div class="header-title">${business.company_name}</div>
    <div>${business.address_line1 || ''}</div>
    <div>GSTIN: ${business.gstin || 'Unregistered'}</div>
    <div>State Code: ${business.state_code}</div>
    ${business.phone ? `<div>Tel: ${business.phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div>
    <strong>TAX INVOICE:</strong> #${invoice.invoice_number}<br>
    <strong>Date:</strong> ${invoice.invoice_date}<br>
    <strong>Client:</strong> ${customer.company_name || customer.customer_name}<br>
    <strong>POS:</strong> State ${customer.state_code} (${isIntra ? 'Intra-State' : 'Inter-State'})
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => `
        <tr>
          <td colspan="4" class="bold" style="padding-top: 3px;">${it.item_name}</td>
        </tr>
        <tr>
          <td style="color: #444; font-size: 9.5px;">HSN:${it.hsn_sac_code || '-'} (${it.tax_rate}%)</td>
          <td class="text-center">${it.quantity}</td>
          <td class="text-right">₹${Number(it.unit_price).toFixed(2)}</td>
          <td class="text-right bold">₹${Number(it.total_amount).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td>Taxable Subtotal:</td>
      <td class="text-right">₹${Number(invoice.subtotal).toFixed(2)}</td>
    </tr>
    ${isIntra ? `
      <tr>
        <td>CGST:</td>
        <td class="text-right">₹${Number(invoice.cgst_amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td>SGST:</td>
        <td class="text-right">₹${Number(invoice.sgst_amount).toFixed(2)}</td>
      </tr>
    ` : `
      <tr>
        <td>IGST:</td>
        <td class="text-right">₹${Number(invoice.igst_amount).toFixed(2)}</td>
      </tr>
    `}
    <tr class="bold" style="font-size: 13px;">
      <td>GRAND TOTAL:</td>
      <td class="text-right">₹${Number(invoice.grand_total).toFixed(2)}</td>
    </tr>
    <tr>
      <td>Amount Paid:</td>
      <td class="text-right">₹${Number(invoice.paid_amount).toFixed(2)}</td>
    </tr>
    <tr class="bold">
      <td>BALANCE DUE:</td>
      <td class="text-right">₹${balanceDue.toFixed(2)}</td>
    </tr>
  </table>

  ${qrBase64 && balanceDue > 0 ? `
    <div class="divider"></div>
    <div class="qr-container">
      <div class="bold" style="font-size: 11px;">SCAN TO PAY VIA UPI</div>
      <div style="font-size: 9px; margin-bottom: 4px;">GPay • PhonePe • Paytm • BHIM</div>
      <img src="${qrBase64}" alt="UPI QR">
      <div style="font-size: 10px;" class="bold">Amount: ₹${balanceDue.toFixed(2)}</div>
      <div style="font-size: 9px;">UPI: ${business.upi_vpa}</div>
    </div>
  ` : ''}

  <div class="divider"></div>
  <div class="text-center" style="font-size: 9.5px;">
    Thank you for your business!<br>
    Visit Again • E. & O.E.
  </div>
</body>
</html>`;
}

module.exports = { renderThermalReceiptHtml };
