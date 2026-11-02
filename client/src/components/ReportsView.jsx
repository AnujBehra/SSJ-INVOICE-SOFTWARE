import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  ShieldCheck, 
  Layers, 
  Clock, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function ReportsView({ business }) {
  const [activeTab, setActiveTab] = useState('gstr1'); // 'gstr1' | 'gstr3b' | 'aging' | 'sales'
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(currentYear));

  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [agingData, setAgingData] = useState(null);
  const [salesRegister, setSalesRegister] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'gstr1') {
        const data = await api.getGstr1(month, year);
        setGstr1Data(data);
      } else if (activeTab === 'gstr3b') {
        const data = await api.getGstr3b(month, year);
        setGstr3bData(data);
      } else if (activeTab === 'aging') {
        const data = await api.getAgingReport();
        setAgingData(data);
      } else if (activeTab === 'sales') {
        const data = await api.getSalesRegister();
        setSalesRegister(data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, month, year]);

  // Download GSTR-1 official JSON for GST portal upload
  const downloadGstr1Json = () => {
    if (!gstr1Data || !gstr1Data.gstr1Json) return;
    const jsonString = JSON.stringify(gstr1Data.gstr1Json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${business?.gstin || 'TAX'}_${month}${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Statutory GST Reports & Financial Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ready-to-file GSTR-1, GSTR-3B summary computations, Sales Register, and Aging Reports
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Period:</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              const name = new Date(currentYear, i).toLocaleString('en-IN', { month: 'short' });
              return <option key={m} value={m}>{name}</option>;
            })}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        {[
          { id: 'gstr1', label: 'GSTR-1 Outward Supplies', badge: 'JSON Export' },
          { id: 'gstr3b', label: 'GSTR-3B Tax Liability', badge: 'ITC Offset' },
          { id: 'aging', label: 'Invoice Aging Report', badge: null },
          { id: 'sales', label: 'Sales Register', badge: null }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchReports} className="font-bold underline text-amber-800 hover:text-amber-900 ml-3">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading statutory tax report...</div>
      ) : activeTab === 'gstr1' && gstr1Data ? (
        
        /* GSTR-1 TAB */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-slate-900">GSTR-1 Outward Supplies Summary</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Portal Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Period: {gstr1Data.meta.period} • GSTIN: <strong className="font-mono text-slate-800">{gstr1Data.meta.gstin || 'Unregistered'}</strong>
              </p>
            </div>
            <button
              onClick={downloadGstr1Json}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Official GSTR-1 JSON</span>
            </button>
          </div>

          {/* Table 4 B2B */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                Table 4: B2B Invoices (Registered Taxpayers with GSTIN)
              </span>
              <span className="text-xs font-bold text-slate-500">{gstr1Data.b2b.length} Records</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-2.5">GSTIN of Recipient</th>
                  <th className="px-6 py-2.5">Receiver Name</th>
                  <th className="px-6 py-2.5">Invoice #</th>
                  <th className="px-6 py-2.5">POS</th>
                  <th className="px-6 py-2.5 text-right">Taxable Value</th>
                  <th className="px-6 py-2.5 text-right">IGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">CGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">SGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">Total Invoice (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {gstr1Data.b2b.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-slate-400">No B2B invoices in selected period</td>
                  </tr>
                ) : (
                  gstr1Data.b2b.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-bold text-indigo-700">{b.ctin}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">{b.cname}</td>
                      <td className="px-6 py-3 font-mono text-slate-600">{b.inum}</td>
                      <td className="px-6 py-3 font-mono text-slate-600">State {b.pos}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-800">₹{b.taxable_value.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{b.igst.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{b.cgst.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{b.sgst.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">₹{b.val.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 12 HSN Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                Table 12: HSN/SAC Summary of Outward Supplies
              </span>
              <span className="text-xs font-bold text-slate-500">{gstr1Data.hsn.length} HSN Codes</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-2.5">HSN/SAC Code</th>
                  <th className="px-6 py-2.5">Description</th>
                  <th className="px-6 py-2.5 text-center">UQC</th>
                  <th className="px-6 py-2.5 text-right">Total Qty</th>
                  <th className="px-6 py-2.5 text-right">Taxable Value</th>
                  <th className="px-6 py-2.5 text-right">IGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">CGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">SGST (₹)</th>
                  <th className="px-6 py-2.5 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {gstr1Data.hsn.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-slate-400">No HSN entries recorded</td>
                  </tr>
                ) : (
                  gstr1Data.hsn.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-bold text-indigo-700">{h.hsn_sc}</td>
                      <td className="px-6 py-3 text-slate-800">{h.desc}</td>
                      <td className="px-6 py-3 text-center text-slate-600">{h.uqc}</td>
                      <td className="px-6 py-3 text-right font-mono">{h.qty}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-800">₹{h.txval.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{h.iamt.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{h.camt.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">₹{h.samt.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">₹{h.val.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : activeTab === 'gstr3b' && gstr3bData ? (

        /* GSTR-3B TAB */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">3.1 Outward Taxable Value</span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{gstr3bData.table_3_1_outward_supplies.taxable_value.toFixed(2)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Total GST: ₹{(gstr3bData.table_3_1_outward_supplies.igst + gstr3bData.table_3_1_outward_supplies.cgst + gstr3bData.table_3_1_outward_supplies.sgst).toFixed(2)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-emerald-600 uppercase">4. Eligible Input Tax Credit (ITC)</span>
              <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
                ₹{gstr3bData.table_4_eligible_itc.total_eligible_tax.toFixed(2)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                From recorded operating expenses
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-700/50 shadow-xs">
              <span className="text-xs font-bold text-indigo-200 uppercase">Net GST Tax Payable</span>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                ₹{gstr3bData.net_tax_payable.total.toFixed(2)}
              </div>
              <div className="mt-2 text-[11px] text-indigo-300">
                After deducting Input Tax Credit
              </div>
            </div>

          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-900">
              GSTR-3B Tax Computation Matrix
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-2.5">Component</th>
                  <th className="px-6 py-2.5 text-right">Integrated Tax (IGST)</th>
                  <th className="px-6 py-2.5 text-right">Central Tax (CGST)</th>
                  <th className="px-6 py-2.5 text-right">State Tax (SGST)</th>
                  <th className="px-6 py-2.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="px-6 py-3.5 font-bold text-slate-900">3.1 Outward Tax Liability</td>
                  <td className="px-6 py-3.5 text-right font-mono">₹{gstr3bData.table_3_1_outward_supplies.igst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono">₹{gstr3bData.table_3_1_outward_supplies.cgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono">₹{gstr3bData.table_3_1_outward_supplies.sgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-bold">
                    ₹{(gstr3bData.table_3_1_outward_supplies.igst + gstr3bData.table_3_1_outward_supplies.cgst + gstr3bData.table_3_1_outward_supplies.sgst).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-bold text-emerald-700">Less: 4. Eligible ITC Available</td>
                  <td className="px-6 py-3.5 text-right font-mono text-emerald-600">₹{gstr3bData.table_4_eligible_itc.itc_igst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-emerald-600">₹{gstr3bData.table_4_eligible_itc.itc_cgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-emerald-600">₹{gstr3bData.table_4_eligible_itc.itc_sgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-600">
                    ₹{gstr3bData.table_4_eligible_itc.total_eligible_tax.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-extrabold">
                  <td className="px-6 py-3.5 text-indigo-900">Net Tax Payable in Cash</td>
                  <td className="px-6 py-3.5 text-right font-mono text-indigo-700">₹{gstr3bData.net_tax_payable.igst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-indigo-700">₹{gstr3bData.net_tax_payable.cgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-indigo-700">₹{gstr3bData.net_tax_payable.sgst.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-black text-indigo-900">
                    ₹{gstr3bData.net_tax_payable.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      ) : activeTab === 'aging' && agingData ? (

        /* INVOICE AGING TAB */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Total Outstanding Receivables</span>
              <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
                ₹{agingData.totalOutstanding.toFixed(2)}
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full font-bold text-xs border border-rose-200">
              Aging Ledger
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(agingData.buckets).map(([key, bucket]) => (
              <div key={key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-600">{bucket.label}</div>
                <div className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
                  ₹{bucket.amount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{bucket.count} Invoices</div>
              </div>
            ))}
          </div>
        </div>

      ) : activeTab === 'sales' && salesRegister ? (

        /* SALES REGISTER TAB */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-900">
            Sales Register (All Invoices)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-2.5">Invoice #</th>
                <th className="px-6 py-2.5">Date</th>
                <th className="px-6 py-2.5">Customer</th>
                <th className="px-6 py-2.5 text-right">Taxable</th>
                <th className="px-6 py-2.5 text-right">CGST</th>
                <th className="px-6 py-2.5 text-right">SGST</th>
                <th className="px-6 py-2.5 text-right">IGST</th>
                <th className="px-6 py-2.5 text-right">Grand Total</th>
                <th className="px-6 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {salesRegister.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-bold text-indigo-600">{s.invoice_number}</td>
                  <td className="px-6 py-3 text-slate-600">{s.invoice_date}</td>
                  <td className="px-6 py-3 text-slate-900">{s.customer_name}</td>
                  <td className="px-6 py-3 text-right font-mono">₹{Number(s.subtotal || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono">₹{Number(s.cgst_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono">₹{Number(s.sgst_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono">₹{Number(s.igst_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold">₹{Number(s.grand_total || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : null}

    </div>
  );
}
