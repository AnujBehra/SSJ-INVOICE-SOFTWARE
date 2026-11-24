import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Building2, Users, Trash2, X, Plus, Edit2 } from 'lucide-react';
import { api } from '../services/api';

export default function SaaSPlansView({ currentPlan, business, onRefresh }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [localActivePlanId, setLocalActivePlanId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Add / Edit Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    price_monthly: 499,
    price_yearly: 4990,
    max_invoices_per_month: -1,
    has_dynamic_qr: true,
    has_gst_reports: true,
    has_multi_user: false
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const activePlanId = localActivePlanId || currentPlan?.id || business?.saas_plan_id || business?.plan?.id || 1;

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const data = await api.getPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCheckout = async (planId) => {
    try {
      setUpgradingPlanId(planId);
      setNotification(null);
      const res = await api.checkoutPlan({
        plan_id: planId,
        billing_cycle: billingCycle
      });
      setLocalActivePlanId(planId);
      setNotification({
        type: 'success',
        message: res.message || 'Subscription plan successfully updated!'
      });
      if (onRefresh) {
        await onRefresh();
      }
      await fetchPlans();
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Checkout error: ' + err.message
      });
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      plan_name: '',
      price_monthly: 499,
      price_yearly: 4990,
      max_invoices_per_month: -1,
      has_dynamic_qr: true,
      has_gst_reports: true,
      has_multi_user: false
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_name: plan.plan_name,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_invoices_per_month: plan.max_invoices_per_month,
      has_dynamic_qr: Boolean(plan.has_dynamic_qr),
      has_gst_reports: Boolean(plan.has_gst_reports),
      has_multi_user: Boolean(plan.has_multi_user)
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.plan_name || !planForm.plan_name.trim()) return;
    setIsSavingPlan(true);
    try {
      const payload = {
        plan_name: planForm.plan_name.trim(),
        price_monthly: isNaN(Number(planForm.price_monthly)) ? 0 : Math.max(0, Number(planForm.price_monthly)),
        price_yearly: isNaN(Number(planForm.price_yearly)) ? 0 : Math.max(0, Number(planForm.price_yearly)),
        max_invoices_per_month: isNaN(Number(planForm.max_invoices_per_month)) ? -1 : Number(planForm.max_invoices_per_month),
        has_dynamic_qr: Boolean(planForm.has_dynamic_qr),
        has_gst_reports: Boolean(planForm.has_gst_reports),
        has_multi_user: Boolean(planForm.has_multi_user)
      };

      if (editingPlan) {
        await api.updatePlan(editingPlan.id, payload);
        setNotification({
          type: 'success',
          message: `Plan '${payload.plan_name}' updated successfully!`
        });
      } else {
        await api.createPlan(payload);
        setNotification({
          type: 'success',
          message: `New plan '${payload.plan_name}' created successfully!`
        });
      }
      setIsPlanModalOpen(false);
      await fetchPlans();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to save plan: ' + err.message
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    const targetId = planToDelete.id;
    const targetName = planToDelete.plan_name;
    try {
      setIsDeletingPlan(true);
      await api.deletePlan(targetId);
      setPlans(prev => prev.filter(p => p.id !== targetId));
      setNotification({
        type: 'success',
        message: `Plan '${targetName}' removed successfully.`
      });
      setPlanToDelete(null);
      if (onRefresh) await onRefresh();
      fetchPlans();
    } catch (err) {
      // If plan is already not found on server, remove it from UI state immediately
      setPlans(prev => prev.filter(p => p.id !== targetId));
      setPlanToDelete(null);
      fetchPlans();
      if (err.message && err.message.toLowerCase().includes('not found')) {
        setNotification({
          type: 'success',
          message: `Plan '${targetName}' was already removed from database.`
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to remove plan: ' + err.message
        });
      }
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // Deduplicate plans to ensure no duplicate cards
  const displayPlans = (plans || []).filter((p, idx, self) => 
    p && p.id && self.findIndex(x => x.id === p.id) === idx
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <Crown className="w-3.5 h-3.5" />
          <span>SaaS Platform Licensing Plans</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Transparent, Predictable Subscription Pricing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Scale your billing operations with autonomous dynamic UPI QR generation, multi-user permissions, and statutory GST reports.
        </p>

        {/* Action Controls: Billing Cycle Toggle & Add Plan */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-bold border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Save 17%
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPlan}
            className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Global Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center space-x-2 animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {loadingPlans ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading subscription tiers...</div>
      ) : (
        /* Plans Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
          {displayPlans.map((p) => {
            const isCurrent = Number(p.id) === Number(activePlanId);
            const isMonthly = billingCycle === 'monthly';
            const price = isMonthly ? p.price_monthly : p.price_yearly;
            const effectiveMonthly = !isMonthly && p.price_yearly > 0 ? Math.round(p.price_yearly / 12) : null;
            const isPopular = p.id === 2 || p.plan_name.toLowerCase().includes('pro');
            const isEnterprise = p.id === 3 || p.plan_name.toLowerCase().includes('enterprise');

            return (
              <div 
                key={p.id}
                className={`relative bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all duration-200 ${
                  isCurrent 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                    : isPopular
                      ? 'border-indigo-600 shadow-lg scale-100 md:scale-105 z-10'
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Popular / Enterprise Badges */}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Most Popular</span>
                  </div>
                )}
                {isEnterprise && !isCurrent && !isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-400 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Best Value</span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                    <Check className="w-3 h-3 text-white" />
                    <span>Your Current Plan</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-slate-900">{p.plan_name}</h3>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono text-slate-400">#{p.id}</span>
                      {p.id !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlan(p)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="mt-4">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">
                        ₹{Number(price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        /{isMonthly ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {!isMonthly && effectiveMonthly !== null && (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        ≈ ₹{effectiveMonthly.toLocaleString('en-IN')}/mo (billed annually)
                      </p>
                    )}
                  </div>

                  {/* Quota Badge */}
                  <div className="mt-3.5 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>Monthly Quota:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {p.max_invoices_per_month === -1 ? 'Unlimited Invoices' : `${p.max_invoices_per_month} Inv/Mo`}
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{p.max_invoices_per_month === -1 ? 'Unlimited GST Invoices' : `Max ${p.max_invoices_per_month} Invoices / month`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className={`w-4 h-4 flex-shrink-0 ${p.has_dynamic_qr ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className={p.has_dynamic_qr ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        Dynamic NPCI UPI QR (₹0 Gateway Fee)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className={`w-4 h-4 flex-shrink-0 ${p.has_gst_reports ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className={p.has_gst_reports ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        GSTR-1 (JSON) & GSTR-3B Tax Reports
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className={`w-4 h-4 flex-shrink-0 ${p.has_multi_user ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className={p.has_multi_user ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        Multi-User Staff & Role Permissions
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 space-y-2">
                  {isCurrent ? (
                    <button 
                      disabled
                      className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-center cursor-default flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Current Active Plan</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout(p.id)}
                      disabled={upgradingPlanId === p.id}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                        isPopular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      <span>{upgradingPlanId === p.id ? 'Activating...' : `Select ${p.plan_name}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Remove Feature in Subscription: Allow removing custom added plans (IDs > 3) */}
                  {p.id > 3 && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setPlanToDelete(p)}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-bold hover:underline inline-flex items-center space-x-1 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Added Plan</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Enterprise SLA Trust Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">100% Tax Compliant & Zero Vendor Lock-in</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Statutory GST Rule 55 & NPCI UPI payment compliance verified for Indian business operations.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-300 font-medium">
          Instant Activation • Cancel Anytime
        </div>
      </div>

      {/* ADD / EDIT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Plan"
                  value={planForm.plan_name}
                  onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.price_monthly}
                    onChange={(e) => setPlanForm({ ...planForm, price_monthly: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.price_yearly}
                    onChange={(e) => setPlanForm({ ...planForm, price_yearly: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Invoice Quota (-1 for Unlimited)</label>
                <input
                  type="number"
                  value={planForm.max_invoices_per_month}
                  onChange={(e) => setPlanForm({ ...planForm, max_invoices_per_month: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.has_dynamic_qr}
                    onChange={(e) => setPlanForm({ ...planForm, has_dynamic_qr: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Dynamic NPCI UPI QR Generation</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.has_gst_reports}
                    onChange={(e) => setPlanForm({ ...planForm, has_gst_reports: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">GSTR-1 & GSTR-3B Statutory Tax Reports</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.has_multi_user}
                    onChange={(e) => setPlanForm({ ...planForm, has_multi_user: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Multi-User Staff & Permissions</span>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  disabled={isSavingPlan}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <span>{isSavingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM REMOVE PLAN MODAL */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
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

    </div>
  );
}