import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  PlusCircle, 
  FileText, 
  QrCode, 
  BarChart3,
  ExternalLink,
  Users2,
  Package
} from 'lucide-react';

export default function DashboardView({ 
  invoices = [], 
  customers = [], 
  expenses = [], 
  itemsCatalog = [],
  business, 
  onNewInvoice, 
  onViewInvoice, 
  onViewReports,
  onOpenPublicLink,
  onNavigate
}) {
  // Aggregate KPIs
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalBalanceDue = Math.max(0, totalInvoiced - totalReceived);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netEarnings = totalInvoiced - totalExpenses;

  // Aggregate GST components
  const totalCgst = invoices.reduce((sum, inv) => sum + Number(inv.cgst_amount || 0), 0);
  const totalSgst = invoices.reduce((sum, inv) => sum + Number(inv.sgst_amount || 0), 0);
  const totalIgst = invoices.reduce((sum, inv) => sum + Number(inv.igst_amount || 0), 0);
  const totalGstCollected = totalCgst + totalSgst + totalIgst;

  const plan = business?.plan;
  const currentUsage = plan?.currentMonthUsage || 0;
  const quotaLimit = plan?.max_invoices_per_month;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Billing & Invoicing Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial pulse for <strong className="text-slate-800">{business?.company_name || 'Your Business'}</strong> • GST State: {business?.state_code || '27'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewInvoice}
            className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('customers')}
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 transition"
              >
                <Users2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Customers ({customers.length})</span>
              </button>
              <button
                onClick={() => onNavigate('items')}
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 transition"
              >
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>Catalog ({itemsCatalog.length})</span>
              </button>
            </>
          )}
          <button
            onClick={onViewReports}
            className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* Quota Progress Banner if not unlimited */}
      {quotaLimit && quotaLimit !== -1 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Monthly Invoice Quota: {currentUsage} / {quotaLimit} Invoices Used
              </div>
              <p className="text-[11px] text-amber-700">
                You have {Math.max(0, quotaLimit - currentUsage)} invoices remaining this calendar month. Upgrade to Pro for unlimited billing.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-48 bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-amber-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (currentUsage / quotaLimit) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales Invoiced */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-3 tracking-tight">
            ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{invoices.length} Invoices Issued</span>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collections</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-3 tracking-tight">
            ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Direct to Tenant Bank & UPI
          </div>
        </div>

        {/* Outstanding Balance Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-3 tracking-tight">
            ₹{totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Pending customer settlement
          </div>
        </div>

        {/* GST Tax Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Collected</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-3 tracking-tight">
            ₹{totalGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            CGST: ₹{totalCgst.toFixed(0)} | IGST: ₹{totalIgst.toFixed(0)}
          </div>
        </div>

      </div>

      {/* Operational Status & Zero-Cost Dynamic UPI Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <QrCode className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-tight">Zero-Cost Dynamic UPI</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ₹0 GATEWAY FEE
              </span>
              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                VPA: {business?.upi_vpa || 'Not Configured'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Generates NPCI standard payment QR codes dynamically directly into invoices at ₹0 gateway fee.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {onNavigate && (
            <button
              onClick={() => onNavigate('settings')}
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Configure UPI
            </button>
          )}
          <button
            onClick={onNewInvoice}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">Live ledger of customer invoices and settlement statuses</p>
          </div>
          <button
            onClick={onNewInvoice}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <span>+ Create Invoice</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Taxable</th>
                <th className="px-6 py-3 text-right">Grand Total</th>
                <th className="px-6 py-3 text-right">Balance Due</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {invoices.slice(0, 5).map((inv) => {
                const balanceDue = Number(inv.grand_total) - Number(inv.paid_amount);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-bold text-indigo-600">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-3.5 text-slate-900">
                      <div>{inv.customer_name}</div>
                      {inv.customer_company && (
                        <div className="text-[11px] text-slate-500">{inv.customer_company}</div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {inv.invoice_date}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                      ₹{Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-rose-600">
                      ₹{balanceDue.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                        inv.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100"
                      >
                        Print/PDF
                      </button>
                      <button
                        onClick={() => onOpenPublicLink(inv.id)}
                        title="Customer Pay Link"
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                      >
                        Portal Link
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
