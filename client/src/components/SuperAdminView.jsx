import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  Building2, 
  Users, 
  Lock, 
  Unlock, 
  Plus, 
  Calendar,
  DollarSign,
  AlertOctagon,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export default function SuperAdminView() {
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        api.getSuperAdminMetrics(),
        api.getSuperAdminTenants()
      ]);
      setMetrics(m);
      setTenants(t);
    } catch (err) {
      alert('SuperAdmin fetch failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (tenantId, newStatus, extendDays = null) => {
    try {
      await api.updateTenantStatus(tenantId, { status: newStatus, extendDays });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePlan = async (tenantId, planId) => {
    try {
      await api.updateTenantStatus(tenantId, { planId });
      fetchData();
    } catch (err) {
      alert('Failed to update plan: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              SaaS Platform SuperAdmin Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global multi-tenant governance, monthly recurring revenue metrics, and tenant lifecycle locking
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading SuperAdmin metrics...</div>
      ) : (
        <>
          {/* Platform Revenue & Growth Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-700/50 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-indigo-300">Monthly Recurring Revenue (MRR)</span>
                <div className="text-3xl font-black mt-2 font-mono">
                  ₹{Number(metrics.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-2 text-[11px] text-indigo-200">
                  From active paid subscriptions
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Total Tenant Businesses</span>
                <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                  {metrics.totalTenants}
                </div>
                <div className="mt-2 text-[11px] text-emerald-600 font-bold">
                  {metrics.activeTenants} Active • {metrics.expiredTenants} Expired
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Platform Invoices Processed</span>
                <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                  {metrics.totalInvoices}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Across all registered tenants
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Gross Invoicing Volume</span>
                <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                  ₹{Number(metrics.totalInvoiceVolume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Facilitated via dynamic UPI & Gateway
                </div>
              </div>

            </div>
          )}

          {/* Tenants Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                Tenant Organizations Directory ({tenants.length})
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Tenant Business</th>
                  <th className="px-6 py-3">Contact Email</th>
                  <th className="px-6 py-3">Current Plan</th>
                  <th className="px-6 py-3 text-center">Invoices Issued</th>
                  <th className="px-6 py-3">Subscription Expiry</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div>{t.company_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">ID #{t.id} • State: {t.state_code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {t.email}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={t.plan_id || 1}
                        onChange={(e) => handleUpdatePlan(t.id, Number(e.target.value))}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded text-[11px] border border-indigo-200 cursor-pointer focus:outline-none"
                      >
                        <option value={1}>Free Plan</option>
                        <option value={2}>Pro Plan (Monthly)</option>
                        <option value={3}>Enterprise (Yearly)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">
                      {t.invoice_count}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      {t.subscription_expires_at ? new Date(t.subscription_expires_at).toLocaleDateString() : 'Forever'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'EXPIRED' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {t.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'SUSPENDED')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold"
                        >
                          Activate (+30d)
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 365)}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold"
                      >
                        +1 Year
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
