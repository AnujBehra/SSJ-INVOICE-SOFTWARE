import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  QrCode, 
  Landmark, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';

const GST_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '19', name: 'West Bengal' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }
];

export default function SettingsView({ business, onRefresh }) {
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Bank & UPI QR
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');

  // Live Test QR State
  const [testAmount, setTestAmount] = useState('500');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setCompanyName(business.company_name || '');
      setGstin(business.gstin || '');
      setPhone(business.phone || '');
      setStateCode(business.state_code || '27');
      setAddressLine1(business.address_line1 || '');
      setCity(business.city || '');
      setPincode(business.pincode || '');
      setBankName(business.bank_name || '');
      setBankAccountNo(business.bank_account_no || '');
      setBankIfsc(business.bank_ifsc || '');
      setUpiVpa(business.upi_vpa || '');
      setRazorpayKey(business.tenant_razorpay_key || '');
      setStripeKey(business.tenant_stripe_key || '');
    }
  }, [business]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    try {
      await api.updateBusinessSettings({
        company_name: companyName,
        gstin,
        phone,
        state_code: stateCode,
        address_line1: addressLine1,
        city,
        pincode,
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_ifsc: bankIfsc,
        upi_vpa: upiVpa,
        tenant_razorpay_key: razorpayKey,
        tenant_stripe_key: stripeKey
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      onRefresh();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Test UPI string
  const cleanName = encodeURIComponent(companyName.trim() || 'Merchant');
  const cleanNote = encodeURIComponent('Test QR Payment Verification');
  const testUpiUri = upiVpa ? `upi://pay?pa=${upiVpa}&pn=${cleanName}&am=${Number(testAmount || 1).toFixed(2)}&cu=INR&tn=${cleanNote}` : '';
  const testQrUrl = testUpiUri ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(testUpiUri)}` : null;

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Business & Payment Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure legal GST identity, banking coordinates, and instant UPI settlement VPA
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card 1: Legal Business Identity & GST */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Legal Business Identity & GST State</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Firm Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business GSTIN (15 Digits)</label>
              <input
                type="text"
                maxLength="15"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCS1429B1Z2"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST State Code (Origin POS) *</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                {GST_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registered Address Line</label>
            <textarea
              rows="2"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            ></textarea>
          </div>
        </div>

        {/* Card 2: UPI Instant Payment QR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <QrCode className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">UPI Instant Payment Configuration</h2>
                <p className="text-[11px] text-slate-500">Virtual Payment Address (VPA) for real-time customer settlement</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
              DIRECT SETTLEMENT
            </span>
          </div>

          {/* Professional Zero-Cost Dynamic UPI Feature Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <QrCode className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Zero-Cost Dynamic UPI</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    ₹0 GATEWAY FEE
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Generates NPCI standard payment QR codes dynamically directly into invoices at ₹0 gateway fee. Payments settle directly into your verified bank account with zero intermediary commissions.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-semibold">NPCI Compliant</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UPI VPA Address *</label>
                <input
                  type="text"
                  required
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value.toLowerCase())}
                  placeholder="e.g. billing@ssjtech or merchant@upi"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Customer payments from Google Pay, PhonePe, Paytm, and BHIM route directly to this VPA.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Live Test Amount (₹)</label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Live QR Tester Preview */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center space-x-4">
              {testQrUrl ? (
                <>
                  <img
                    src={testQrUrl}
                    alt="Live UPI QR"
                    className="w-28 h-28 bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs"
                  />
                  <div className="text-xs">
                    <div className="font-extrabold text-indigo-950">Live UPI Preview</div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Scan with PhonePe or GPay to verify your VPA.
                    </p>
                    <div className="mt-2 font-mono font-bold text-indigo-700 text-xs">
                      ₹{Number(testAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 w-full text-xs text-slate-400">
                  Enter your UPI VPA to preview live dynamic QR code.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Bank Account & Payment Gateway */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Landmark className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-extrabold text-slate-900">Bank Transfer & Payment Gateway Credentials</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank Ltd"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="50200012345678"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Razorpay Key ID (Cards / UPI / NetBanking)</label>
              <input
                type="text"
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                placeholder="rzp_live_xxxxxxxxxxxx or rzp_test_..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stripe Publishable Key (International Cards)</label>
              <input
                type="text"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                placeholder="pk_live_xxxxxxxxxxxx or pk_test_..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="text-xs font-bold text-emerald-600 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Business and UPI settings updated successfully!</span>
            </div>
          ) : <div></div>}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
