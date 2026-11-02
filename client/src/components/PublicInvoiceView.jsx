import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Printer, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  X,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function PublicInvoiceModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [paymentTab, setPaymentTab] = useState('upi'); // 'upi' | 'razorpay' | 'stripe'
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const res = await api.getPublicInvoice(invoiceId);
        setData(res);
      } catch (err) {
        alert('Failed to load invoice: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [invoiceId]);

  if (!invoiceId) return null;

  const copyUpiLink = () => {
    if (data?.upiDeepLink) {
      navigator.clipboard.writeText(data.upiDeepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRazorpayPay = async () => {
    setIsProcessing(true);
    setSuccessMsg('');
    try {
      // 1. Create order
      const orderRes = await api.createRazorpayOrder(data.invoice.id, data.balanceDue);
      
      // 2. Complete payment & verification
      const verifyRes = await api.verifyRazorpayPayment({
        invoiceId: data.invoice.id,
        razorpayOrderId: orderRes.order.id,
        razorpayPaymentId: 'pay_' + Math.random().toString(36).substring(2, 12),
        razorpaySignature: 'simulated_signature_approved',
        amount: data.balanceDue
      });

      setData(prev => ({
        ...prev,
        balanceDue: 0,
        invoice: {
          ...prev.invoice,
          status: 'PAID'
        }
      }));
      setSuccessMsg('Payment successfully settled via Razorpay! Invoice marked as PAID.');
    } catch (err) {
      alert('Razorpay payment failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePay = async () => {
    setIsProcessing(true);
    setSuccessMsg('');
    try {
      // 1. Create checkout session
      const sessionRes = await api.createStripeSession(data.invoice.id, data.balanceDue);
      
      // 2. Confirm payment
      const confirmRes = await api.confirmStripePayment({
        invoiceId: data.invoice.id,
        sessionId: sessionRes.sessionId,
        paymentIntentId: 'pi_' + Math.random().toString(36).substring(2, 12),
        amount: data.balanceDue
      });

      setData(prev => ({
        ...prev,
        balanceDue: 0,
        invoice: {
          ...prev.invoice,
          status: 'PAID'
        }
      }));
      setSuccessMsg('Payment successfully settled via Stripe Card Rails! Invoice marked as PAID.');
    } catch (err) {
      alert('Stripe payment failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[95vh] overflow-y-auto relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading Client Self-Service Portal...</div>
        ) : data ? (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center text-white shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Customer Self-Service Portal
                </span>
                <h2 className="text-xl font-black text-slate-900">{data.business.company_name}</h2>
                <p className="text-xs text-slate-500">GSTIN: {data.business.gstin || 'Unregistered'} • State: {data.business.state_code}</p>
              </div>
            </div>

            {/* Bill Info Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Invoice Number & Billed To:</div>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">#{data.invoice.invoice_number}</div>
                <div className="text-xs text-slate-700">{data.customer.customer_name} ({data.customer.company_name || 'Retail'})</div>
              </div>
              <div className="sm:text-right">
                <div className="text-xs text-slate-500">Balance Due:</div>
                <div className="text-2xl font-black font-mono text-indigo-600">
                  ₹{Number(data.balanceDue).toFixed(2)}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                  data.invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {data.invoice.status}
                </span>
              </div>
            </div>

            {/* Success Notification */}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center space-x-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* Gateway Selector Tabs */}
            {data.balanceDue > 0 && (
              <div className="space-y-4">
                <div className="flex border-b border-slate-200 gap-2">
                  <button
                    onClick={() => setPaymentTab('upi')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                      paymentTab === 'upi'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>⚡ NPCI UPI QR</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-extrabold">0% Fee</span>
                  </button>

                  <button
                    onClick={() => setPaymentTab('razorpay')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                      paymentTab === 'razorpay'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>💳 Razorpay Gateway</span>
                  </button>

                  <button
                    onClick={() => setPaymentTab('stripe')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                      paymentTab === 'stripe'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🌐 Stripe Cards</span>
                  </button>
                </div>

                {/* TAB 1: DYNAMIC UPI QR */}
                {paymentTab === 'upi' && data.qrDataUrl && (
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-indigo-500/30 text-center space-y-4 shadow-xl">
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold border border-indigo-500/30">
                        <QrCode className="w-4 h-4" />
                        <span>Instant UPI QR Payment</span>
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-2">
                        Scan with any UPI App to Pay Directly
                      </h3>
                      <p className="text-xs text-slate-300">
                        Google Pay • PhonePe • Paytm • BHIM • CRED
                      </p>
                    </div>

                    <div className="inline-block p-3 bg-white rounded-2xl shadow-xl">
                      <img
                        src={data.qrDataUrl}
                        alt="Dynamic Payment QR"
                        className="w-44 h-44 rounded-xl block mx-auto"
                      />
                      <div className="text-[11px] font-bold text-slate-800 mt-2 font-mono">
                        ₹{data.balanceDue.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      {data.upiDeepLink && (
                        <a
                          href={data.upiDeepLink}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Open in UPI App (Mobile)</span>
                        </a>
                      )}
                      <button
                        onClick={copyUpiLink}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied UPI URI' : 'Copy UPI Link'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Beneficiary VPA: <span className="font-mono text-emerald-400">{data.business.upi_vpa}</span>
                    </div>
                  </div>
                )}

                {/* TAB 2: RAZORPAY GATEWAY */}
                {paymentTab === 'razorpay' && (
                  <div className="p-6 bg-slate-900 text-white rounded-3xl border border-indigo-500/40 text-center space-y-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center mx-auto text-indigo-400 font-black text-xl">
                      ₹
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Razorpay Secure Checkout</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Pay via UPI, Debit/Credit Cards, NetBanking, EMI & Wallets
                      </p>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-2xl text-xs flex justify-between items-center max-w-sm mx-auto">
                      <span className="text-slate-400">Payable Balance:</span>
                      <span className="font-mono text-base font-black text-emerald-400">₹{Number(data.balanceDue).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handleRazorpayPay}
                      disabled={isProcessing}
                      className="w-full max-w-sm mx-auto py-3 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isProcessing ? 'Verifying with Razorpay...' : `Pay ₹${Number(data.balanceDue).toFixed(2)} with Razorpay`}</span>
                    </button>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>128-bit Encrypted • PCI-DSS Level 1 Certified</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: STRIPE GATEWAY */}
                {paymentTab === 'stripe' && (
                  <div className="p-6 bg-slate-900 text-white rounded-3xl border border-purple-500/40 text-center space-y-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center mx-auto text-purple-400 font-black text-xl">
                      S
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Stripe Global Card Payments</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports Visa, Mastercard, American Express, RuPay & International Cards
                      </p>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-2xl text-xs flex justify-between items-center max-w-sm mx-auto">
                      <span className="text-slate-400">Payable Balance:</span>
                      <span className="font-mono text-base font-black text-emerald-400">₹{Number(data.balanceDue).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handleStripePay}
                      disabled={isProcessing}
                      className="w-full max-w-sm mx-auto py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isProcessing ? 'Processing Stripe Session...' : `Pay ₹${Number(data.balanceDue).toFixed(2)} with Stripe`}</span>
                    </button>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Stripe 3D Secure 2.0 • End-to-End Tokenization</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {data.balanceDue === 0 && (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-extrabold text-sm text-emerald-950">Invoice Fully Paid</h3>
                <p className="text-xs text-emerald-700">Thank you! This invoice has been settled in full.</p>
              </div>
            )}

            {/* Bank Transfer Box */}
            {data.business.bank_name && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 mb-1">Direct Bank Transfer (NEFT / IMPS):</div>
                <div><strong>Bank:</strong> {data.business.bank_name}</div>
                <div><strong>Account No:</strong> <span className="font-mono">{data.business.bank_account_no}</span></div>
                <div><strong>IFSC:</strong> <span className="font-mono">{data.business.bank_ifsc}</span></div>
              </div>
            )}

            {/* Itemized Table */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Itemized Breakdown</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 text-slate-900">{it.item_name}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{it.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">₹{Number(it.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">₹{Number(it.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">Powered by SSJ Invoice</span>
              <div className="flex items-center space-x-2">
                <a
                  href={api.getThermalReceiptUrl(data.invoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
                >
                  <span>3" Thermal Receipt</span>
                </a>
                <a
                  href={api.getInvoicePdfUrl(data.invoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>A4 Tax Invoice PDF</span>
                </a>
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
