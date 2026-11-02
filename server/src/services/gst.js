/**
 * LedgerPulse 360™ - Autonomous GST & HSN/SAC Engine
 * Indian GST Tax Calculation, State Code Mapping, and Place of Supply (POS)
 */

const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory'
};

/**
 * Determines whether a transaction is Intra-State or Inter-State
 * @param {string} businessStateCode 2-digit GST state code
 * @param {string} customerStateCode 2-digit GST state code
 */
function isIntraState(businessStateCode, customerStateCode) {
  const bState = String(businessStateCode || '').padStart(2, '0');
  const cState = String(customerStateCode || '').padStart(2, '0');
  return bState === cState;
}

/**
 * Calculates item-level GST components
 * Intra-state: CGST (50%) + SGST (50%)
 * Inter-state: IGST (100%)
 */
function calculateItemGst(quantity, unitPrice, taxRate, isIntra) {
  const taxableAmount = Math.round(Number(quantity) * Number(unitPrice) * 100) / 100;
  const rate = Number(taxRate || 0);

  if (isIntra) {
    const halfRate = rate / 2;
    const cgstAmount = Math.round((taxableAmount * halfRate) / 100 * 100) / 100;
    const sgstAmount = Math.round((taxableAmount * halfRate) / 100 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;
    return {
      taxableAmount,
      taxRate: rate,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalAmount
    };
  } else {
    const igstAmount = Math.round((taxableAmount * rate) / 100 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + igstAmount) * 100) / 100;
    return {
      taxableAmount,
      taxRate: rate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: rate,
      igstAmount,
      totalAmount
    };
  }
}

/**
 * Calculates invoice header aggregate totals
 */
function calculateInvoiceTotals(itemsWithGst) {
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let grandTotal = 0;

  for (const item of itemsWithGst) {
    subtotal += item.taxableAmount;
    cgstTotal += item.cgstAmount;
    sgstTotal += item.sgstAmount;
    igstTotal += item.igstAmount;
    grandTotal += item.totalAmount;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgstAmount: Math.round(cgstTotal * 100) / 100,
    sgstAmount: Math.round(sgstTotal * 100) / 100,
    igstAmount: Math.round(igstTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
}

/**
 * Automated GST Split Engine (Node.js / JavaScript)
 * Directly implements Blueprint Specification Section 8
 */
function calculateGST(lineItems, businessStateCode, customerStateCode) {
  let subtotal = 0;
  let totalTax = 0;
  const isIntrastate = (String(businessStateCode).padStart(2, '0') === String(customerStateCode).padStart(2, '0'));

  const calculatedItems = lineItems.map(item => {
    const qty = Number(item.qty || item.quantity || 1);
    const unitPrice = Number(item.unit_price || 0);
    const taxRate = Number(item.tax_rate || 0);

    const lineBase = Math.round(qty * unitPrice * 100) / 100;
    const lineTax = Math.round((lineBase * taxRate) / 100 * 100) / 100;
    subtotal += lineBase;
    totalTax += lineTax;
    return { ...item, lineBase, lineTax };
  });

  let cgst = 0, sgst = 0, igst = 0;
  if (isIntrastate) {
    cgst = Math.round((totalTax / 2) * 100) / 100; // Intrastate: 50% CGST + 50% SGST
    sgst = Math.round((totalTax / 2) * 100) / 100;
  } else {
    igst = Math.round(totalTax * 100) / 100;       // Interstate: 100% IGST
  }

  return { 
    subtotal: Math.round(subtotal * 100) / 100, 
    cgst, 
    sgst, 
    igst, 
    totalTax: Math.round(totalTax * 100) / 100, 
    grandTotal: Math.round((subtotal + totalTax) * 100) / 100, 
    items: calculatedItems 
  };
}

module.exports = {
  GST_STATE_CODES,
  isIntraState,
  calculateItemGst,
  calculateInvoiceTotals,
  calculateGST
};

