import React, { useState } from 'react';
import { Crown, Check, Zap, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function SaaSPlansView({ currentPlan, business, onRefresh }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [notification, setNotification] = useState(null);

  const activePlanId = currentPlan?.id || business?.saas_plan_id || business?.plan?.id || 1;
  const activePlanName = currentPlan?.plan_name || business?.plan_name || (activePlanId === 2 ? 'Pro Plan' : activePlanId === 3 ? 'Enterprise Plan' : 'Free Plan');
  const usageCount = currentPlan?.currentMonthUsage ?? business?.plan?.currentMonthUsage ?? 0;
  const maxInvoices = currentPlan?.max_invoices_per_month ?? business?.max_invoices_per_month ?? (activePlanId === 1 ? 10 : -1);

  const plans = [
    {
      id: 1,
      name: 'Free Plan',
      tagline: 'Ideal for freelance solopreneurs starting out',
      priceMonthly: 0,
      priceYearly: 0,
      invoicesLimit: 'Max 10 Invoices / Month',
      features: [
        'Max 10 Invoices / month',
        'Single User Access',
        'Standard A4 PDF Invoices',
        'Static UPI QR Code',
        'Customer Directory'
      ],
      highlight: false
    },
    {
      id: 2,
      name: 'Pro Plan',
      tagline: 'For fast-growing SMEs needing unlimited billing',
      priceMonthly: 499,
      priceYearly: 4990,
      invoicesLimit: 'Unlimited Invoices',
      features: [
        'Unlimited Tax Invoices',
        'Dynamic Amount NPCI UPI QR Engine (₹0 Fee)',
        'Razorpay & Payment Gateway Integration',
        '1-Click Convert Estimate to Invoice',
        'Delivery Challans & Credit Notes',
        'Customer Ledger Statements'
      ],
      highlight: true
    },
    {
      id: 3,
      name: 'Enterprise Plan',
      tagline: 'Full Zoho replacement for established businesses',
      priceMonthly: 999,
      priceYearly: 4999,
      invoicesLimit: 'Unlimited Invoices',
      features: [
        'Multi-User Staff & Role Permissions',
        'Ready-to-File GSTR-1 (JSON) & GSTR-3B Reports',
        'Custom Business Branding & Logo Vectoring',
        'Recurring Invoices Auto-Billing Engine',
        'Priority Technical Support & SLA AMC',
        'Full Indian GST Audit Trail'
      ],
      highlight: false
    }
  ];

  const handleCheckout = async (planId) => {
    try {
      setUpgradingPlanId(planId);
      setNotification(null);
      const res = await api.checkoutPlan({
        plan_id: planId,
        billing_cycle: billingCycle
      });
      setNotification({
        type: 'success',
        message: res.message || 'Subscription successfully updated!'
      });
      if (onRefresh) {
        await onRefresh();
      }
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
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <Crown className="w-3.5 h-3.5" />
          <span>SaaS Platform Licensing Plans</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Flexible Subscription Tiers with Hard Quota Enforcement
        </h1>
        <p className="text-xs text-slate-500 max-w-xl mx-auto">
          Choose the plan tailored for your billing volume. Upgrade or renew seamlessly with automated subscription validity locks.
        </p>

        {/* Current Active Plan Pill */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs text-emerald-800 font-semibold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Current Subscription: <strong className="text-emerald-950 font-bold">{activePlanName}</strong></span>
            <span className="text-emerald-300">•</span>
            <span className="text-emerald-700 font-mono text-[11px]">
              {maxInvoices === -1 ? 'Unlimited Invoices Quota' : `${usageCount}/${maxInvoices} Invoices Used`}
            </span>
          </div>
        </div>

        {/* Notification Toast Banner */}
        {notification && (
          <div className={`mt-3 p-3 rounded-xl max-w-md mx-auto text-xs font-semibold flex items-center justify-between shadow-xs ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Billing Cycle Switch */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl mt-4 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-lg transition ${
              billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-lg flex items-center space-x-1 transition ${
              billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Yearly (Save 20%)</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = activePlanId === p.id;
          const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;

          return (
            <div
              key={p.id}
              className={`rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                isCurrent
                  ? 'bg-white border-2 border-emerald-500 text-slate-900 shadow-lg ring-1 ring-emerald-500/20'
                  : p.highlight
                  ? 'bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-900 text-white ring-2 ring-indigo-500 shadow-xl'
                  : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-base font-extrabold ${!isCurrent && p.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                  </h3>
                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs">
                      <Check className="w-3 h-3" />
                      <span>CURRENT PLAN</span>
                    </span>
                  ) : p.highlight ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  ) : null}
                </div>

                <p className={`text-xs mt-1 ${!isCurrent && p.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {p.tagline}
                </p>

                <div className="mt-4 pb-4 border-b border-slate-200/20">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black font-mono">₹{price}</span>
                    <span className={`text-xs font-semibold ${!isCurrent && p.highlight ? 'text-indigo-300' : 'text-slate-500'}`}>
                      / {billingCycle === 'yearly' ? 'Year' : 'Month'}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 font-bold ${isCurrent ? 'text-emerald-600' : p.highlight ? 'text-emerald-400' : 'text-indigo-600'}`}>
                    {p.invoicesLimit}
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${!isCurrent && p.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Features Included:
                  </div>
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs">
                      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCurrent ? 'text-emerald-600' : p.highlight ? 'text-emerald-400' : 'text-indigo-600'}`} />
                      <span className={!isCurrent && p.highlight ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/20">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold cursor-default flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Active Current Subscription</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(p.id)}
                    disabled={upgradingPlanId === p.id}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      p.highlight
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-md'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    <span>
                      {upgradingPlanId === p.id 
                        ? 'Processing...' 
                        : p.id < activePlanId 
                        ? `Downgrade to ${p.name}` 
                        : `Upgrade to ${p.name}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
