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
  CheckCircle2,
  Trash2,
  ExternalLink,
  Crown,
  Settings,
  CreditCard,
  Edit,
  Save,
  X,
  Search,
  KeyRound,
  Mail,
  Phone
} from 'lucide-react';
import { api } from '../services/api';

export default function SuperAdminView({ activeSubTab = 'overview', onImpersonate }) {
  const [currentTab, setCurrentTab] = useState(activeSubTab || 'overview');
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // New Tenant Form
  const [newCompany, setNewCompany] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('password123');
  const [newPhone, setNewPhone] = useState('');
  const [newStateCode, setNewStateCode] = useState('27');
  const [newPlanId, setNewPlanId] = useState(1);
  const [newExtendDays, setNewExtendDays] = useState(365);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  // New / Edit Plan Form
  const [planName, setPlanName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('499');
  const [priceYearly, setPriceYearly] = useState('4990');
  const [maxInvoices, setMaxInvoices] = useState('-1');
  const [hasDynamicQr, setHasDynamicQr] = useState(true);
  const [hasGstReports, setHasGstReports] = useState(true);
  const [hasMultiUser, setHasMultiUser] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Settings Form
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [platformName, setPlatformName] = useState('SSJ INVOICE');
  const [supportEmail, setSupportEmail] = useState('support@ssjinvoice.com');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, t, p, s] = await Promise.all([
        api.getSuperAdminMetrics().catch(() => null),
        api.getSuperAdminTenants().catch(() => []),
        api.getPlans().catch(() => []),
        api.getSuperAdminSettings().catch(() => ({}))
      ]);
      setMetrics(m);
      setTenants(t);
      setPlans(p);
      setSettings(s || {});
      if (s) {
        setRazorpayKeyId(s.razorpay_key_id || '');
        setRazorpayKeySecret(s.razorpay_key_secret || '');
        setStripePublishableKey(s.stripe_publishable_key || '');
        setStripeSecretKey(s.stripe_secret_key || '');
        setPlatformName(s.platform_name || 'SSJ INVOICE');
        setSupportEmail(s.support_email || 'support@ssjinvoice.com');
      }
    } catch (err) {
      console.error('SuperAdmin fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Status and Plan update for Tenant
  const handleUpdateStatus = async (tenantId, newStatus, extendDays = null) => {
    try {
      await api.updateTenantStatus(tenantId, { status: newStatus, extendDays });
      showNotification('Tenant status updated successfully');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePlan = async (tenantId, planId) => {
    try {
      await api.updateTenantStatus(tenantId, { planId });
      showNotification('Tenant plan updated successfully');
      fetchData();
    } catch (err) {
      alert('Failed to update plan: ' + err.message);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenantId, companyName) => {
    if (!confirm(`Are you sure you want to permanently delete tenant '${companyName}'? All their invoices, staff, and records will be deleted.`)) {
      return;
    }
    try {
      await api.deleteSuperAdminTenant(tenantId);
      showNotification(`Tenant '${companyName}' deleted permanently.`);
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Add Tenant / Admin
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newCompany.trim() || !newAdminEmail.trim()) {
      alert('Company name and admin email are required');
      return;
    }
    try {
      setIsSubmittingTenant(true);
      await api.createSuperAdminTenant({
        company_name: newCompany.trim(),
        email: newAdminEmail.trim().toLowerCase(),
        phone: newPhone.trim() || null,
        state_code: newStateCode,
        password: newAdminPassword,
        full_name: newAdminName.trim() || 'Business Administrator',
        plan_id: Number(newPlanId),
        extendDays: Number(newExtendDays || 365)
      });
      setIsAddTenantOpen(false);
      setNewCompany('');
      setNewAdminEmail('');
      setNewAdminName('');
      setNewPhone('');
      showNotification('New Business Tenant & Admin created successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to create tenant: ' + err.message);
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  // Plans Management: Open modal
  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanName('');
    setPriceMonthly('499');
    setPriceYearly('4990');
    setMaxInvoices('-1');
    setHasDynamicQr(true);
    setHasGstReports(true);
    setHasMultiUser(false);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (p) => {
    setEditingPlan(p);
    setPlanName(p.plan_name);
    setPriceMonthly(String(p.price_monthly));
    setPriceYearly(String(p.price_yearly));
    setMaxInvoices(String(p.max_invoices_per_month));
    setHasDynamicQr(Boolean(p.has_dynamic_qr));
    setHasGstReports(Boolean(p.has_gst_reports));
    setHasMultiUser(Boolean(p.has_multi_user));
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planName.trim()) {
      alert('Please enter a plan name');
      return;
    }
    try {
      setIsSubmittingPlan(true);
      const payload = {
        plan_name: planName.trim(),
        price_monthly: Number(priceMonthly),
        price_yearly: Number(priceYearly),
        max_invoices_per_month: Number(maxInvoices),
        has_dynamic_qr: hasDynamicQr ? 1 : 0,
        has_gst_reports: hasGstReports ? 1 : 0,
        has_multi_user: hasMultiUser ? 1 : 0
      };

      if (editingPlan) {
        await api.updateSuperAdminPlan(editingPlan.id, payload);
        showNotification(`Plan '${planName}' updated successfully`);
      } else {
        await api.createSuperAdminPlan(payload);
        showNotification(`New Plan '${planName}' added successfully`);
      }
      setIsPlanModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save plan: ' + err.message);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleDeletePlan = async (p) => {
    if (p.id === 1) {
      alert('Cannot delete the default Free Plan (ID 1).');
      return;
    }
    if (!confirm(`Are you sure you want to remove the plan '${p.plan_name}'? Any businesses on this plan will be automatically reassigned to Free Plan.`)) {
      return;
    }
    try {
      await api.deleteSuperAdminPlan(p.id);
      showNotification(`Plan '${p.plan_name}' deleted successfully.`);
      fetchData();
    } catch (err) {
      alert('Failed to delete plan: ' + err.message);
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await api.updateSuperAdminSettings({
        razorpay_key_id: razorpayKeyId.trim(),
        razorpay_key_secret: razorpayKeySecret.trim(),
        stripe_publishable_key: stripePublishableKey.trim(),
        stripe_secret_key: stripeSecretKey.trim(),
        platform_name: platformName.trim(),
        support_email: supportEmail.trim()
      });
      showNotification('Platform Settings & Payment Gateways saved successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.id).includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* SuperAdmin Header & Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                SuperAdmin Platform Control
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Global multi-tenant governance, subscription plan management, and platform payment gateways
              </p>
            </div>
          </div>

          {/* Quick Sub-Tab Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setCurrentTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Overview & MRR
            </button>
            <button
              onClick={() => setCurrentTab('tenants')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'tenants' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Tenants & Admins ({tenants.length})
            </button>
            <button
              onClick={() => setCurrentTab('plans')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'plans' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Subscription Plans ({plans.length})
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Payment Gateways & Settings
            </button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading SuperAdmin platform data...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & MRR */}
          {currentTab === 'overview' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-700/50 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-indigo-300">Monthly Recurring Revenue (MRR)</span>
                  <div className="text-3xl font-black mt-2 font-mono">
                    ₹{Number(metrics.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="mt-2 text-[11px] text-indigo-200">
                    From active paid SaaS tiers
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Total Registered Tenants</span>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                    {metrics.totalTenants}
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-600 font-bold">
                    {metrics.activeTenants} Active • {metrics.expiredTenants} Expired
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Invoices Processed</span>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                    {metrics.totalInvoices}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Across all platform tenants
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Gross Invoice Turnover</span>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                    ₹{Number(metrics.totalInvoiceVolume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Total billing volume processed
                  </div>
                </div>

              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Platform Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => { setCurrentTab('tenants'); setIsAddTenantOpen(true); }}
                    className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-600" />
                    <span>Add New Business Admin</span>
                  </button>
                  <button
                    onClick={() => { setCurrentTab('plans'); handleOpenAddPlan(); }}
                    className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-indigo-600" />
                    <span>Create New Subscription Plan</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('settings')}
                    className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>Configure Payment Gateways</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TENANTS & ADMINS MANAGEMENT */}
          {currentTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tenant business by name, email, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <button
                  onClick={() => setIsAddTenantOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Business Admin</span>
                </button>
              </div>

              {/* Tenants Directory Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3.5">Tenant Company</th>
                        <th className="px-6 py-3.5">Admin Email</th>
                        <th className="px-6 py-3.5">Current Plan</th>
                        <th className="px-6 py-3.5 text-center">Invoices</th>
                        <th className="px-6 py-3.5">Subscription Expiry</th>
                        <th className="px-6 py-3.5 text-center">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-12 text-slate-400">
                            No tenant organizations found.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-6 py-4 font-bold text-slate-900">
                              <div>{t.company_name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                ID #{t.id} • State: {t.state_code}
                              </div>
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
                                {plans.map(p => (
                                  <option key={p.id} value={p.id}>{p.plan_name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">
                              {t.invoice_count}
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-[11px]">
                              {t.subscription_expires_at ? new Date(t.subscription_expires_at).toLocaleDateString() : 'Permanent'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                t.status === 'EXPIRED' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* 1-Click Access Workspace (Impersonation) */}
                              <button
                                onClick={() => onImpersonate && onImpersonate(t.id)}
                                title="Access this Tenant's Workspace"
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Access</span>
                              </button>

                              {/* Activate / Suspend */}
                              {t.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleUpdateStatus(t.id, 'SUSPENDED')}
                                  title="Suspend Tenant Access"
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold transition cursor-pointer"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                                  title="Activate Tenant (+30 Days)"
                                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold transition cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}

                              <button
                                onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 365)}
                                title="Extend Expiry by 1 Year"
                                className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-semibold transition cursor-pointer"
                              >
                                +1 Yr
                              </button>

                              {/* Delete Tenant */}
                              <button
                                onClick={() => handleDeleteTenant(t.id, t.company_name)}
                                title="Delete Tenant Permanently"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded text-xs transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION PLANS MANAGEMENT */}
          {currentTab === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">SaaS Platform Subscription Plans</h3>
                  <p className="text-xs text-slate-500">Configure tiers, monthly/yearly pricing, invoice quotas, and feature flags</p>
                </div>
                <button
                  onClick={handleOpenAddPlan}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Plan</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-base text-slate-900">{p.plan_name}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          ID #{p.id}
                        </span>
                      </div>
                      <div className="mt-3 font-mono">
                        <span className="text-2xl font-black text-slate-900">₹{p.price_monthly}</span>
                        <span className="text-xs text-slate-500"> / month</span>
                        <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                          ₹{p.price_yearly} / year
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Invoice Quota:</span>
                          <span className="font-bold text-slate-900">
                            {p.max_invoices_per_month === -1 ? 'Unlimited' : `${p.max_invoices_per_month} / mo`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Dynamic UPI QR:</span>
                          <span className={`font-bold ${p.has_dynamic_qr ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p.has_dynamic_qr ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>GST Reports:</span>
                          <span className={`font-bold ${p.has_gst_reports ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p.has_gst_reports ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Multi-User Staff:</span>
                          <span className={`font-bold ${p.has_multi_user ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p.has_multi_user ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditPlan(p)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Edit
                      </button>
                      {p.id !== 1 && (
                        <button
                          onClick={() => handleDeletePlan(p)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM PAYMENT GATEWAYS & SETTINGS */}
          {currentTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Platform Gateways & Global Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure SaaS subscription checkout gateways (Razorpay & Stripe keys) and platform identity
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Razorpay Platform Gateway */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Platform Razorpay Gateway (SaaS Subscriptions)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Used to process payments when business tenants upgrade or renew their SaaS plans.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Razorpay Key ID</label>
                      <input
                        type="text"
                        placeholder="rzp_live_xxxxxxxxxxxx"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Razorpay Key Secret</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={razorpayKeySecret}
                        onChange={(e) => setRazorpayKeySecret(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Stripe Platform Gateway */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Platform Stripe Gateway (Global Card Processing)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Stripe Publishable Key</label>
                      <input
                        type="text"
                        placeholder="pk_live_xxxxxxxxxxxx"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Stripe Secret Key</label>
                      <input
                        type="password"
                        placeholder="sk_live_xxxxxxxxxxxx"
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Identity */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Platform Identity & Support
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Platform Brand Name</label>
                      <input
                        type="text"
                        value={platformName}
                        onChange={(e) => setPlatformName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Support Email</label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSettings ? 'Saving...' : 'Save Platform Settings'}</span>
                  </button>
                </div>

              </form>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ADD BUSINESS ADMIN / TENANT */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Add New Business Admin / Tenant</h3>
              </div>
              <button onClick={() => setIsAddTenantOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@acme.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State Code (POS)</label>
                  <input
                    type="text"
                    maxLength="2"
                    value={newStateCode}
                    onChange={(e) => setNewStateCode(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Initial Plan</label>
                  <select
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.plan_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trial / Expiry Days</label>
                  <input
                    type="number"
                    value={newExtendDays}
                    onChange={(e) => setNewExtendDays(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTenantOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTenant}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isSubmittingTenant ? 'Creating...' : 'Create Business Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUBSCRIPTION PLAN */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingPlan ? `Edit Plan: ${editingPlan.plan_name}` : 'Create New Subscription Plan'}
                </h3>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter Growth, Agency Unlimited"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Invoice Limit (-1 for Unlimited)
                </label>
                <input
                  type="number"
                  value={maxInvoices}
                  onChange={(e) => setMaxInvoices(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-700 mb-1">Included Feature Flags:</span>
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDynamicQr}
                    onChange={(e) => setHasDynamicQr(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Dynamic NPCI UPI QR Code Engine</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasGstReports}
                    onChange={(e) => setHasGstReports(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Statutory GST Reports (GSTR-1 JSON & GSTR-3B)</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMultiUser}
                    onChange={(e) => setHasMultiUser(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Multi-User Staff & Role Permissions</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlan}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isSubmittingPlan ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
