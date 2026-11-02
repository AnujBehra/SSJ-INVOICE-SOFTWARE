const QRCode = require('qrcode');

/**
 * Dynamic Zero-Cost NPCI UPI URI Builder (Node.js)
 * Conforms directly to the SSJ Invoice Enterprise Specification
 */
function buildDynamicUpiUri(vpa, payeeName, amount, invoiceNo) {
  if (!vpa) return null;
  const cleanName = encodeURIComponent(payeeName ? payeeName.trim() : 'Merchant');
  const cleanNote = encodeURIComponent(`Payment for Invoice #${invoiceNo}`);
  // Standardized NPCI Specification Format
  return `upi://pay?pa=${vpa}&pn=${cleanName}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${cleanNote}`;
}

async function generateQrDataUrl(upiString) {
  if (!upiString) return null;
  // Generate Base64 PNG image stream for embedded HTML/PDF rendering
  return await QRCode.toDataURL(upiString, { width: 250, margin: 1 });
}

module.exports = {
  buildDynamicUpiUri,
  generateQrDataUrl
};
