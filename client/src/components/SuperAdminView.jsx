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
  Phone,
  History,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserPlus,
  Download,
  Megaphone,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

const GST_STATES = [
  { code: '27', name: 'Maharashtra (27)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '08', name: 'Rajasthan (08)' },
  { code: '23', name: 'Madhya Pradesh (23)' },
  { code: '32', name: 'Kerala (32)' },
  { code: '21', name: 'Odisha (21)' },
  { code: '10', name: 'Bihar (10)' },
  { code: '03', name: 'Punjab (03)' }
];

export default function SuperAdminView({ activeSubTab = 'overview', onImpersonate, onSwitchToTenantWorkspace }) {
  const [currentTab, setCurrentTab] = useState(activeSubTab || 'overview');
  const [tenantSubView, setTenantSubView] = useState('tenants'); // 'tenants' | 'admins'
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [creationMode, setCreationMode] = useState('new_tenant'); // 'new_tenant' | 'existing_tenant'
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [modalError, setModalError] = useState('');
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planModalError, setPlanModalError] = useState('');
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [newCompany, setNewCompany] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('password123');
  const [newPhone, setNewPhone] = useState('');
  const [newStateCode, setNewStateCode] = useState('27');
  const [newPlanId, setNewPlanId] = useState(1);
  const [newExtendDays, setNewExtendDays] = useState(365);
  const [newAdminRole, setNewAdminRole] = useState('BUSINESS_ADMIN');
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

  // Platform Broadcast Announcement State
  const [broadcastAnnouncement, setBroadcastAnnouncement] = useState('');
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  // Tenant Fleet Management States (Data Export & Security)
  const [isExportingTenantId, setIsExportingTenantId] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, t, p, s, a, b] = await Promise.all([
        api.getSuperAdminMetrics().catch(() => null),
        api.getSuperAdminTenants().catch(() => []),
        api.getPlans().catch(() => []),
        api.getSuperAdminSettings().catch(() => ({})),
        api.getSuperAdminAdmins().catch(() => []),
        api.getAnnouncement().catch(() => ({ announcement: '', active: false }))
      ]);
      setMetrics(m);
      setTenants(t || []);
      setPlans(p || []);
      setSettings(s || {});
      setAdmins(a || []);
      if (b) {
        setBroadcastAnnouncement(b.announcement || '');
        setBroadcastActive(Boolean(b.active));
      }
      if (t && t.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(String(t[0].id));
      }
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

  const handleExportTenant = async (tenantId, companyName) => {
    try {
      setIsExportingTenantId(tenantId);
      const data = await api.exportTenant(tenantId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant_${tenantId}_${(companyName || 'tenant').replace(/[^a-zA-Z0-9]/g, '_')}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export tenant data: ' + err.message);
    } finally {
      setIsExportingTenantId(null);
    }
  };

  const handleResetTenantPassword = async (tenantId, companyName) => {
    if (!confirm(`Are you sure you want to reset the administrator password for '${companyName}'? A secure temporary password will be generated.`)) return;
    try {
      const res = await api.resetTenantPassword(tenantId);
      setTempPasswordModal({
        email: res.email,
        tempPassword: res.temporaryPassword,
        companyName
      });
      setCopiedPass(false);
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    }
  };

  const handleSaveBroadcast = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingBroadcast(true);
      await api.setAnnouncement({
        announcement: broadcastAnnouncement,
        active: broadcastActive
      });
      showNotification('Global broadcast announcement updated successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to save announcement: ' + err.message);
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await api.getSuperAdminAuditLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
      fetchData();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (currentTab === 'audit') {
      fetchAuditLogs();
    }
  }, [currentTab]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Status and Plan update for Tenant
  const handleUpdateStatus = async (tenantId, newStatus, extendDays = null) => {
    try {
      await api.updateTenantStatus(tenantId, { status: newStatus, extendDays });
      showNotification(`Tenant status updated to ${newStatus}${extendDays ? ` (+${extendDays} days)` : ''}`);
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

  const handleExtendSubscription = async (tenantId, days) => {
    try {
      await api.updateTenantStatus(tenantId, { extendDays: days, status: 'ACTIVE' });
      showNotification(`Subscription extended by ${days} days`);
      fetchData();
    } catch (err) {
      alert('Failed to extend subscription: ' + err.message);
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

  // Delete Admin User
  const handleDeleteAdmin = async (userId, adminName) => {
    if (!confirm(`Are you sure you want to delete administrator '${adminName}'?`)) {
      return;
    }
    try {
      await api.deleteSuperAdminAdmin(userId);
      showNotification(`Administrator '${adminName}' deleted successfully.`);
      fetchData();
    } catch (err) {
      alert('Delete admin failed: ' + err.message);
    }
  };

  // Open modal pre-configured to add an admin to a specific tenant
  const handleOpenAddAdminForTenant = (tenantId) => {
    setSelectedBusinessId(String(tenantId));
    setCreationMode('existing_tenant');
    setNewAdminRole('BUSINESS_ADMIN');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const targetTenant = tenants.find(t => String(t.id) === String(tenantId));
    const domain = targetTenant ? targetTenant.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : 'corp';
    setNewAdminName('Co-Administrator');
    setNewAdminEmail(`coadmin_${randomSuffix}@${domain}.io`);
    setNewAdminPassword('password123');
    setModalError('');
    setIsAddTenantOpen(true);
  };

  // 1-Click Auto-Fill Demo Details for instant testing
  const handleAutoFillDemoTenant = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    if (creationMode === 'new_tenant') {
      setNewCompany(`Apex Solutions Pvt Ltd #${randomSuffix}`);
      setNewAdminName(`Rajiv Patel`);
      setNewAdminEmail(`admin_${randomSuffix}@apextech${randomSuffix}.com`);
      setNewAdminPassword('password123');
      setNewPhone(`+91 98200 ${randomSuffix}12`);
      setNewStateCode('27');
      setNewPlanId(plans[0]?.id || 1);
      setNewExtendDays(365);
    } else {
      setNewAdminName(`Sanjay Verma`);
      setNewAdminEmail(`admin_${randomSuffix}@partnerbiz${randomSuffix}.com`);
      setNewAdminPassword('password123');
      setNewAdminRole('BUSINESS_ADMIN');
      if (!selectedBusinessId && tenants.length > 0) {
        setSelectedBusinessId(String(tenants[0].id));
      }
    }
    setModalError('');
  };

  // Quick generate unique email helper to avoid duplicate email errors
  const handleGenerateUniqueEmail = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const domain = (newCompany || 'company').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'biz';
    setNewAdminEmail(`admin_${randomSuffix}@${domain}.com`);
  };

  // Create Tenant or Admin Submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newAdminEmail.trim()) {
      setModalError('Please enter an administrator email address');
      return;
    }

    try {
      setIsSubmittingTenant(true);

      if (creationMode === 'new_tenant') {
        if (!newCompany.trim()) {
          setModalError('Company / Organization name is required');
          setIsSubmittingTenant(false);
          return;
        }

        const res = await api.createSuperAdminTenant({
          company_name: newCompany.trim(),
          email: newAdminEmail.trim(),
          full_name: newAdminName.trim() || 'Business Administrator',
          password: newAdminPassword || 'password123',
          phone: (newPhone || '').trim(),
          state_code: newStateCode || '27',
          plan_id: Number(newPlanId || 1),
          extendDays: Number(newExtendDays || 365)
        });

        setIsAddTenantOpen(false);
        setTenantSubView('tenants');
        showNotification(res.message || `Tenant '${newCompany}' and Admin created successfully!`);
      } else {
        // Add admin to existing business
        const targetBizId = selectedBusinessId || (tenants && tenants[0] ? String(tenants[0].id) : '');
        if (!targetBizId) {
          setModalError('Please select an existing business organization');
          setIsSubmittingTenant(false);
          return;
        }

        const res = await api.createSuperAdminAdmin({
          business_id: Number(targetBizId),
          full_name: newAdminName.trim() || 'Business Administrator',
          email: newAdminEmail.trim(),
          password: newAdminPassword || 'password123',
          role: newAdminRole || 'BUSINESS_ADMIN'
        });

        setIsAddTenantOpen(false);
        setTenantSubView('admins');
        showNotification(res.message || `Administrator added successfully! Viewing in Business Admins List.`);
      }

      // Reset Form
      setNewCompany('');
      setNewAdminEmail('');
      setNewAdminName('');
      setNewPhone('');
      setNewAdminPassword('password123');

      // Refresh data
      await fetchData();
    } catch (err) {
      setModalError(err.message || 'Action failed. Please try again.');
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  // Plan CRUD
  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanModalError('');
    setPlanName('');
    setPriceMonthly('699');
    setPriceYearly('6990');
    setMaxInvoices('-1');
    setHasDynamicQr(true);
    setHasGstReports(true);
    setHasMultiUser(false);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (p) => {
    setEditingPlan(p);
    setPlanModalError('');
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
    setPlanModalError('');
    if (!planName.trim()) {
      setPlanModalError('Please enter a plan name');
      return;
    }
    try {
      setIsSubmittingPlan(true);
      const pMonthly = isNaN(Number(priceMonthly)) ? 0 : Math.max(0, Number(priceMonthly));
      const pYearly = isNaN(Number(priceYearly)) ? 0 : Math.max(0, Number(priceYearly));
      const pMaxInv = isNaN(Number(maxInvoices)) ? -1 : Number(maxInvoices);

      const payload = {
        plan_name: planName.trim(),
        price_monthly: pMonthly,
        price_yearly: pYearly,
        max_invoices_per_month: pMaxInv,
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
      setPlanModalError(err.message || 'Failed to save plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleDeletePlan = (p) => {
    if (p.id === 1) {
      alert('Cannot delete the default Free Plan (ID 1).');
      return;
    }
    setPlanToDelete(p);
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setIsDeletingPlan(true);
      await api.deleteSuperAdminPlan(planToDelete.id);
      // Optimistic removal so card disappears immediately
      setPlans(prev => prev.filter(p => p.id !== planToDelete.id));
      showNotification(`Plan '${planToDelete.plan_name}' removed successfully.`);
      setPlanToDelete(null);
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // Platform Settings Save
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
      fetchData();
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.id).includes(searchTerm);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const filteredAdmins = admins.filter(a => {
    const matchesSearch =
      a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(a.id).includes(searchTerm);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* SuperAdmin Header & Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>SuperAdmin Platform Director</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  Global SaaS Scope
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Global multi-tenant governance, subscription plan management, platform payment gateways & audit trails
              </p>
            </div>
          </div>

          {/* Quick Sub-Tab Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {onSwitchToTenantWorkspace && (
              <button
                type="button"
                onClick={onSwitchToTenantWorkspace}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Switch to Tenant Admin Workspace to manage invoices, settings, and business operations"
              >
                <Building2 className="w-4 h-4 text-indigo-200" />
                <span>Open Tenant Workspace</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              {[
                { id: 'overview', label: 'Overview & MRR' },
                { id: 'tenants', label: `Tenants & Admins (${tenants.length})` },
                { id: 'plans', label: `Subscription Plans (${plans.length})` },
                { id: 'settings', label: 'Payment Gateways & Settings' },
                { id: 'audit', label: 'Platform Audit Trail' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    currentTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Toast Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
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
              
              {/* Primary SaaS KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-xs">
                  <div className="text-amber-100 text-xs font-bold uppercase tracking-wider">Monthly Recurring Revenue</div>
                  <div className="text-2xl font-black mt-2 font-mono">₹{Number(metrics.monthlyRecurringRevenue || 0).toLocaleString()}</div>
                  <div className="text-[11px] text-amber-100/90 mt-1 flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Active paid tenant subscriptions</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Businesses</div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{metrics.totalTenants}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    <span className="font-bold text-emerald-600">{metrics.activeTenants} Active</span> • {metrics.expiredTenants || 0} Expired
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Administrators</div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{admins.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Registered tenant admins & staff
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Conversion Rate</div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {metrics.totalTenants > 0 ? Math.round((metrics.activeTenants / metrics.totalTenants) * 100) : 0}%
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Free to Pro conversions
                  </div>
                </div>
              </div>

              {/* Quick Actions & Platform Governance Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>Subscription Plan Distribution</span>
                  </h3>
                  <div className="space-y-3">
                    {plans.map(p => {
                      const count = tenants.filter(t => t.plan_id === p.id).length;
                      const percentage = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{p.plan_name}</span>
                            <span className="font-mono font-bold text-slate-900">{count} tenants ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Quick Management Actions</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCreationMode('new_tenant'); setIsAddTenantOpen(true); }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Add Business Admin</div>
                      <div className="text-[10px] text-slate-500">Create new tenant workspace</div>
                    </button>
                    <button
                      onClick={handleOpenAddPlan}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer"
                    >
                      <Crown className="w-4 h-4 text-indigo-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Add Subscription Tier</div>
                      <div className="text-[10px] text-slate-500">Create a new pricing plan</div>
                    </button>
                    <button
                      onClick={() => setCurrentTab('settings')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-purple-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Payment Gateways</div>
                      <div className="text-[10px] text-slate-500">Configure Razorpay & Stripe</div>
                    </button>
                    <button
                      onClick={() => setCurrentTab('audit')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer"
                    >
                      <History className="w-4 h-4 text-blue-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">System Activity</div>
                      <div className="text-[10px] text-slate-500">Review platform audit logs</div>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TENANTS & ADMINS */}
          {currentTab === 'tenants' && (
            <div className="space-y-4">
              
              {/* Directory Switcher Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* View Switcher: Tenants vs Admins */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setTenantSubView('tenants')}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      tenantSubView === 'tenants' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Organizations ({tenants.length})</span>
                  </button>
                  <button
                    onClick={() => setTenantSubView('admins')}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      tenantSubView === 'admins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>Business Admins List ({admins.length})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={tenantSubView === 'tenants' ? "Search organizations, admins, states..." : "Search admin name, email, company..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  {['ALL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        statusFilter === st
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Actions: Add Business Admin / Add Organization */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreationMode('existing_tenant');
                      setNewAdminRole('BUSINESS_ADMIN');
                      setModalError('');
                      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                      const targetId = selectedBusinessId || (tenants && tenants[0] ? String(tenants[0].id) : '');
                      setSelectedBusinessId(targetId);
                      const targetTenant = tenants.find(t => String(t.id) === String(targetId)) || tenants[0];
                      const domain = targetTenant ? targetTenant.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : 'biz';
                      setNewAdminName('New Business Admin');
                      setNewAdminEmail(`admin_${randomSuffix}@${domain}.com`);
                      setNewAdminPassword('password123');
                      setIsAddTenantOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start md:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Business Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreationMode('new_tenant');
                      setModalError('');
                      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                      setNewCompany(`Apex Tech Solutions ${randomSuffix}`);
                      setNewAdminName('Vikram Patel');
                      setNewAdminEmail(`admin_${randomSuffix}@apexsolutions${randomSuffix}.com`);
                      setNewAdminPassword('password123');
                      setNewPhone('+91 98765 43210');
                      setIsAddTenantOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-slate-100 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start md:self-auto"
                  >
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>+ New Organization</span>
                  </button>
                </div>
              </div>

              {/* SUBVIEW 1: ORGANIZATIONS / TENANTS LIST */}
              {tenantSubView === 'tenants' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5">Tenant Organization</th>
                          <th className="px-5 py-3.5">Primary Administrator</th>
                          <th className="px-5 py-3.5">Current Plan</th>
                          <th className="px-5 py-3.5 text-center">Invoices</th>
                          <th className="px-5 py-3.5">Subscription Expiry</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredTenants.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-12 text-slate-400">
                              No tenant organizations found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredTenants.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-5 py-4 font-bold text-slate-900">
                                <div>{t.company_name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Tenant #{t.id} • POS State: {t.state_code}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {(() => {
                                  const orgAdmins = admins.filter(a => Number(a.business_id) === Number(t.id));
                                  const primaryAdmin = orgAdmins.find(a => a.email === (t.admin_email || t.email)) || orgAdmins[0] || { full_name: t.admin_name || 'Admin User', email: t.admin_email || t.email, role: 'BUSINESS_ADMIN' };
                                  const otherAdmins = orgAdmins.filter(a => a.id !== primaryAdmin.id);

                                  return (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                          {primaryAdmin.full_name ? primaryAdmin.full_name[0].toUpperCase() : 'A'}
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                            <span>{primaryAdmin.full_name || 'Admin User'}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-700 font-semibold rounded border border-amber-200">Primary</span>
                                          </div>
                                          <div className="text-[11px] font-mono text-slate-500">{primaryAdmin.email}</div>
                                        </div>
                                      </div>

                                      {otherAdmins.length > 0 && (
                                        <div className="pl-9 pt-1 border-t border-slate-100">
                                          <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex items-center justify-between">
                                            <span>Team Admins ({otherAdmins.length})</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSearchTerm(t.company_name);
                                                setTenantSubView('admins');
                                              }}
                                              className="text-[9px] text-indigo-600 hover:underline cursor-pointer"
                                            >
                                              View in Admins List &rarr;
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {otherAdmins.map(oa => (
                                              <span key={oa.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200" title={oa.email}>
                                                <span className="font-bold text-indigo-700 mr-1">{oa.full_name}</span>
                                                <span className="font-mono text-slate-400 text-[9px]">({oa.role})</span>
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-4">
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
                              <td className="px-5 py-4 text-center font-mono font-bold text-slate-800">
                                {t.invoice_count}
                              </td>
                              <td className="px-5 py-4 text-slate-600 text-[11px]">
                                <div>{t.subscription_expires_at ? new Date(t.subscription_expires_at).toLocaleDateString() : 'Permanent'}</div>
                                <div className="flex items-center space-x-1 mt-1">
                                  <button
                                    onClick={() => handleExtendSubscription(t.id, 30)}
                                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Extend by 30 days"
                                  >
                                    +30d
                                  </button>
                                  <button
                                    onClick={() => handleExtendSubscription(t.id, 365)}
                                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Extend by 1 year"
                                  >
                                    +1y
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                  t.status === 'EXPIRED' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenAddAdminForTenant(t.id)}
                                  title="Add Business Administrator to this Organization"
                                  className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <UserPlus className="w-3 h-3 text-amber-600" />
                                  <span>+ Admin</span>
                                </button>

                                <button
                                  onClick={() => onImpersonate && onImpersonate(t.id)}
                                  title="Access this Tenant's Workspace (1-Click Workspace Impersonation)"
                                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Access</span>
                                </button>

                                <button
                                  onClick={() => handleExportTenant(t.id, t.company_name)}
                                  disabled={isExportingTenantId === t.id}
                                  title="Export Organization Database (JSON Backup)"
                                  className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <Download className="w-3 h-3 text-slate-600" />
                                  <span>{isExportingTenantId === t.id ? 'Exporting...' : 'Export'}</span>
                                </button>

                                <button
                                  onClick={() => handleResetTenantPassword(t.id, t.company_name)}
                                  title="Reset Administrator Password"
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer inline-flex items-center"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

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
                                    title="Reactivate Tenant"
                                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold transition cursor-pointer"
                                  >
                                    Activate
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteTenant(t.id, t.company_name)}
                                  title="Delete Tenant Permanently"
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBVIEW 2: BUSINESS ADMINS DIRECTORY LIST */}
              {tenantSubView === 'admins' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5">Administrator Name</th>
                          <th className="px-5 py-3.5">Login Email</th>
                          <th className="px-5 py-3.5">Assigned Organization</th>
                          <th className="px-5 py-3.5">SaaS Plan</th>
                          <th className="px-5 py-3.5">Role</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredAdmins.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-12 text-slate-400">
                              No administrators found matching your search. Click "+ Add Business Admin" above to register an administrator.
                            </td>
                          </tr>
                        ) : (
                          filteredAdmins.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-5 py-4 font-bold text-slate-900">
                                <div className="flex items-center space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {a.full_name ? a.full_name[0].toUpperCase() : 'A'}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900">{a.full_name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Admin ID #{a.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 font-mono text-slate-700">
                                {a.email}
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-900">{a.company_name || 'Unassigned'}</div>
                                {a.state_code && <div className="text-[10px] text-slate-500">POS State: {a.state_code}</div>}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {a.plan_name || 'Free Plan'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                                  {a.role}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                                {a.business_id && (
                                  <button
                                    onClick={() => onImpersonate && onImpersonate(a.business_id)}
                                    title="Access Workspace as this Admin"
                                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Access</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteAdmin(a.id, a.full_name)}
                                  title="Delete this administrator"
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SUBSCRIPTION PLANS (SSJ Subscription Engine) */}
          {currentTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Subscription Tier Engine</h3>
                  <p className="text-xs text-slate-500">Configure quotas, pricing, and feature flags available to commercial tenants</p>
                </div>
                <button
                  onClick={handleOpenAddPlan}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Plan</span>
                </button>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(p => {
                  const assignedCount = tenants.filter(t => t.plan_id === p.id).length;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-base text-slate-900">{p.plan_name}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {assignedCount} Subscribers
                          </span>
                        </div>

                        <div className="flex items-baseline space-x-1">
                          <span className="text-2xl font-black text-slate-900 font-mono">₹{p.price_monthly}</span>
                          <span className="text-xs text-slate-500">/ month</span>
                          <span className="text-slate-400 text-xs">|</span>
                          <span className="text-xs text-slate-600 font-mono font-semibold">₹{p.price_yearly}/yr</span>
                        </div>

                        {/* Features Checklist */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>
                              <strong>{p.max_invoices_per_month === -1 ? 'Unlimited' : p.max_invoices_per_month}</strong> Invoices / Mo
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${p.has_dynamic_qr ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className={p.has_dynamic_qr ? '' : 'text-slate-400'}>Dynamic NPCI UPI QR Code</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${p.has_gst_reports ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className={p.has_gst_reports ? '' : 'text-slate-400'}>GST Filing Reports (GSTR-1 & B2B)</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${p.has_multi_user ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className={p.has_multi_user ? '' : 'text-slate-400'}>Multi-User Organization Staff</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleOpenEditPlan(p)}
                          className="flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Plan</span>
                        </button>

                        {p.id !== 1 && (
                          <button
                            onClick={() => handleDeletePlan(p)}
                            className="flex items-center space-x-1 text-xs font-bold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT GATEWAYS & SETTINGS */}
          {currentTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl space-y-6">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>SaaS Platform Payment Gateways</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These payment gateway keys collect subscription plan fees when commercial businesses upgrade or renew their plan.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Razorpay Platform Gateway */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Platform Razorpay Gateway (UPI, Cards, NetBanking for SaaS Subscriptions)
                    </h4>
                  </div>
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
                    Platform Identity & Support Contact
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

                {/* Global Broadcast Announcement */}
                <div className="p-4 border border-slate-200 rounded-xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Global Platform Broadcast Announcement (All Tenants)
                      </h4>
                    </div>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastActive}
                        onChange={(e) => setBroadcastActive(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Broadcast Active</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Publish an announcement banner displayed at the top of every business administrator's dashboard (e.g. GST updates, compliance notices, scheduled maintenance).
                  </p>
                  <div>
                    <textarea
                      rows="2"
                      placeholder="e.g. Notice: Government GST e-Invoicing statutory update effective Dec 2026. Please verify your HSN/SAC codes in Items Catalog."
                      value={broadcastAnnouncement}
                      onChange={(e) => setBroadcastAnnouncement(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveBroadcast}
                      disabled={isSavingBroadcast}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>{isSavingBroadcast ? 'Publishing...' : 'Publish Announcement'}</span>
                    </button>
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

          {/* TAB 5: PLATFORM AUDIT TRAIL */}
          {currentTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <History className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Platform Activity & Audit Trail</h3>
                    <p className="text-xs text-slate-500">Immutable ledger of platform events, plan assignments & tenant updates</p>
                  </div>
                </div>

                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingAudit ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading platform audit logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No platform events logged yet. Actions like plan changes, settings updates, and tenant additions appear here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <div key={log.id} className="py-3.5 flex items-start justify-between text-xs hover:bg-slate-50/50 px-2 rounded-lg transition">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                          </span>
                          {log.company_name && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              {log.company_name}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Triggered by {log.user_email || 'SuperAdmin'} {log.details ? `• ${log.details}` : ''}
                        </div>
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {log.created_at}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </>
      )}

      {/* MODAL: ADD BUSINESS ADMIN (Supports New Tenant OR Existing Business) */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  {creationMode === 'existing_tenant' ? (
                    <UserPlus className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {creationMode === 'existing_tenant' ? 'Add Business Administrator' : 'Provision New Organization & Admin'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {creationMode === 'existing_tenant'
                      ? 'Add a new administrator account with full governance to an existing company'
                      : 'Deploy a new tenant organization workspace and provision its primary admin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAutoFillDemoTenant}
                  title="Auto-fill with sample non-conflicting data"
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg flex items-center space-x-1 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Quick Demo Data</span>
                </button>
                <button onClick={() => setIsAddTenantOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setCreationMode('new_tenant');
                  setModalError('');
                }}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  creationMode === 'new_tenant' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. New Organization</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationMode('existing_tenant');
                  setModalError('');
                  if (!selectedBusinessId && tenants.length > 0) {
                    setSelectedBusinessId(String(tenants[0].id));
                  }
                }}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  creationMode === 'existing_tenant' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Add Business Admin</span>
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
              
              {/* If Existing Tenant */}
              {creationMode === 'existing_tenant' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Business Organization *
                  </label>
                  <select
                    value={selectedBusinessId || (tenants[0] ? String(tenants[0].id) : '')}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer focus:bg-white"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.company_name} (ID #{t.id}) — {t.plan_name || 'Free Plan'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    The new administrator will receive access to manage invoices, taxes, and settings for this company.
                  </p>
                </div>
              )}

              {/* If New Tenant */}
              {creationMode === 'new_tenant' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">GST State (Place of Supply)</label>
                      <select
                        value={newStateCode}
                        onChange={(e) => setNewStateCode(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white cursor-pointer"
                      >
                        {GST_STATES.map(s => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Phone (Optional)</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assign SaaS Plan</label>
                      <select
                        value={newPlanId}
                        onChange={(e) => setNewPlanId(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer focus:bg-white"
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.plan_name} (₹{p.price_monthly}/mo • {p.max_invoices_per_month === -1 ? 'Unlimited' : `${p.max_invoices_per_month} Invoices`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Common Admin User Info */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Administrator Account Credentials
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateUniqueEmail}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Unique Email</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@acme.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                    <input
                      type="text"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {creationMode === 'new_tenant' ? 'Duration (Days)' : 'Access Role'}
                    </label>
                    {creationMode === 'new_tenant' ? (
                      <input
                        type="number"
                        value={newExtendDays}
                        onChange={(e) => setNewExtendDays(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                      />
                    ) : (
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer focus:bg-white"
                      >
                        <option value="BUSINESS_ADMIN">Business Admin (Full Access)</option>
                        <option value="ACCOUNTANT">Accountant (Taxes & Reports)</option>
                        <option value="STAFF">Staff (Invoicer)</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTenantOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTenant}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  {isSubmittingTenant ? (
                    <span>Processing...</span>
                  ) : creationMode === 'new_tenant' ? (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Provision Organization & Admin</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Business Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUBSCRIPTION PLAN */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
                </h3>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {planModalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{planModalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Plus"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Invoices / Month (-1 for Unlimited)</label>
                <input
                  type="number"
                  required
                  value={maxInvoices}
                  onChange={(e) => setMaxInvoices(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* Feature Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-medium">
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDynamicQr}
                    onChange={(e) => setHasDynamicQr(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Zero-Cost Dynamic NPCI UPI QR Settlement</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasGstReports}
                    onChange={(e) => setHasGstReports(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Statutory GST Returns (GSTR-1, B2B Tax Reports)</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMultiUser}
                    onChange={(e) => setHasMultiUser(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Multi-User Organization Staff (Role Permissions)</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlan}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSubmittingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM REMOVE SUBSCRIPTION PLAN */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Remove Subscription Plan</h3>
                  <p className="text-[11px] text-slate-500">Plan #{planToDelete.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-slate-900">'{planToDelete.plan_name}'</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <span className="font-bold">⚠️ Safe Reassignment:</span>
                <p>Any active tenant organizations assigned to this plan will be automatically reassigned to the default <strong>Free Plan</strong>.</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeletingPlan}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                disabled={isDeletingPlan}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingPlan ? 'Removing...' : 'Yes, Remove Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TEMPORARY PASSWORD RESET CONFIRMATION */}
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Password Reset Complete</h3>
                  <p className="text-[11px] text-slate-500">{tempPasswordModal.companyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTempPasswordModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                The administrator password for <strong className="text-slate-900">{tempPasswordModal.email}</strong> has been reset. Share these credentials with the tenant administrator:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-xs">
                <div className="text-[11px] text-slate-500">Login Email:</div>
                <div className="font-bold text-slate-900 select-all">{tempPasswordModal.email}</div>
                <div className="text-[11px] text-slate-500 pt-1">Temporary Password:</div>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-indigo-600 select-all">{tempPasswordModal.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordModal.tempPassword);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer font-sans font-bold"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTempPasswordModal(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
