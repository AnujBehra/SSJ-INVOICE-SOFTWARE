import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Building2, Users } from 'lucide-react';
import { api } from '../services/api';

export default function SaaSPlansView({ currentPlan, business, onRefresh }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [localActivePlanId, setLocalActivePlanId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

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

        {/* Billing Cycle Toggle */}
        <div className="pt-4 flex items-center justify-center">
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
          {plans.map((p) => {
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
                    <span className="text-[10px] font-mono text-slate-400">#{p.id}</span>
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
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Delivery Challans & Credit Notes</span>
                    </div>
                    {isEnterprise && (
                      <>
                        <div className="flex items-center space-x-2 text-indigo-700 font-medium">
                          <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span>Dedicated Priority 24/7 Support</span>
                        </div>
                        <div className="flex items-center space-x-2 text-indigo-700 font-medium">
                          <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span>Custom Invoice Branding & Domain</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
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

    </div>
  );
}
