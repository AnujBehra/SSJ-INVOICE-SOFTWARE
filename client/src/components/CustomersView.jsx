import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  X, 
  ExternalLink,
  History,
  CheckCircle2
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

export default function CustomersView({ customers = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = customers.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenLedger = async (cust) => {
    setSelectedLedgerCustomer(cust);
    setIsLoadingLedger(true);
    try {
      const data = await api.getCustomer(cust.id);
      setLedgerData(data);
    } catch (err) {
      alert('Failed to load ledger: ' + err.message);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createCustomer({
        customer_name: customerName,
        company_name: companyName,
        gstin,
        email,
        phone,
        state_code: stateCode,
        billing_address: billingAddress,
        shipping_address: shippingAddress || billingAddress,
        opening_balance: Number(openingBalance || 0)
      });
      setIsAddModalOpen(false);
      // Reset form
      setCustomerName('');
      setCompanyName('');
      setGstin('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setShippingAddress('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Client Directory & Ledger Histories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage business clients, registered GSTIN profiles, Place of Supply, and running statements
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, company name, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Customer & Organization</th>
              <th className="px-6 py-3.5">GSTIN / Tax ID</th>
              <th className="px-6 py-3.5">POS State</th>
              <th className="px-6 py-3.5">Contact Details</th>
              <th className="px-6 py-3.5 text-right">Total Invoiced</th>
              <th className="px-6 py-3.5 text-right">Total Paid</th>
              <th className="px-6 py-3.5 text-right">Outstanding Due</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12 text-slate-400">
                  No customers found. Click "Add New Client" to create one.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 text-slate-900">
                    <div className="font-bold">{c.customer_name}</div>
                    {c.company_name ? (
                      <div className="text-[11px] text-slate-500">{c.company_name}</div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Individual Consumer</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {c.gstin ? (
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800 text-[11px]">
                        {c.gstin}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Unregistered (B2C)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded font-mono text-[11px]">
                      State {c.state_code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div>{c.email || '-'}</div>
                    <div className="text-[11px] text-slate-400">{c.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                    ₹{Number(c.total_invoiced || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-600 font-semibold">
                    ₹{Number(c.total_paid || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                    ₹{Number(c.outstanding_balance || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenLedger(c)}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Statement</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Add Customer / Business Client</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Enterprises LLP"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength="15"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCS1429B1Z2"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST State Code (Place of Supply) *</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows="2"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER STATEMENT MODAL */}
      {selectedLedgerCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Customer Ledger Statement - {selectedLedgerCustomer.customer_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedLedgerCustomer.company_name || 'Retail Client'} • GSTIN: {selectedLedgerCustomer.gstin || 'None'} • POS: State {selectedLedgerCustomer.state_code}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedLedgerCustomer(null); setLedgerData(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingLedger ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading ledger timeline...</div>
            ) : ledgerData ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500">Opening Balance:</span>
                    <span className="font-mono font-bold text-slate-900 ml-2">₹{ledgerData.customer.opening_balance.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Current Outstanding:</span>
                    <span className="font-mono font-extrabold text-rose-600 text-base ml-2">₹{ledgerData.outstanding_balance.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-left">Type</th>
                        <th className="px-4 py-2.5 text-left">Reference #</th>
                        <th className="px-4 py-2.5 text-right">Debit (Invoiced)</th>
                        <th className="px-4 py-2.5 text-right">Credit (Paid)</th>
                        <th className="px-4 py-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ledgerData.ledger.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-slate-400">No transactions recorded yet.</td>
                        </tr>
                      ) : (
                        ledgerData.ledger.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'INVOICE' ? 'bg-indigo-50 text-indigo-700' :
                                tx.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{tx.reference}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900">
                              {tx.debit > 0 ? `₹${tx.debit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600">
                              {tx.credit > 0 ? `₹${tx.credit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              ₹{tx.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
