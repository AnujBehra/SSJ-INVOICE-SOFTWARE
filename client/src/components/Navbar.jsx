import React from 'react';
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  ExternalLink, 
  Zap,
  Crown,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export default function Navbar({ 
  user, 
  business,
  onLogout, 
  onOpenNewInvoice, 
  isSuperAdminMode, 
  setIsSuperAdminMode, 
  activeView, 
  setActiveView,
  onReturnToSuperAdmin
}) {
  const plan = business?.plan || user?.plan || user?.business?.plan;
  const companyName = business?.company_name || user?.companyName || user?.business?.company_name;
  const stateCode = business?.state_code || user?.business?.state_code;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const isImpersonating = Boolean(user?.isImpersonated);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      {/* Impersonation Banner if SuperAdmin is viewing a tenant */}
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-950" />
            <span>Viewing Tenant Workspace as: <strong>{companyName || 'Business Admin'}</strong></span>
          </div>
          <button
            onClick={onReturnToSuperAdmin}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 px-3 py-1 rounded-md text-[11px] font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to SuperAdmin Console</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView(isSuper ? 'superadmin-overview' : 'dashboard')}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md font-extrabold text-sm tracking-wider ${
              isSuper ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-amber-500/20' : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-500/20'
            }`}>
              SSJ
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                SSJ Invoice
              </span>
              <span className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border ${
                isSuper 
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {isSuper ? 'SUPERADMIN' : 'PRO'}
              </span>
            </div>
          </div>

          {/* Center Info: Tenant & Plan Quota (Hidden for SuperAdmin) */}
          {!isSuper && (
            <div className="hidden md:flex items-center space-x-4">
              {companyName && (
                <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-medium text-slate-100">{companyName}</span>
                  {stateCode && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">POS: State {stateCode}</span>
                    </>
                  )}
                </div>
              )}

              {plan && (
                <div 
                  onClick={() => setActiveView('plans')} 
                  className="cursor-pointer group flex items-center space-x-2 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 hover:from-indigo-900/60 hover:to-purple-900/60 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-xs transition"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                  <span className="font-semibold text-indigo-200">{plan.plan_name}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {plan.max_invoices_per_month === -1 ? 'Unlimited' : `${plan.max_invoices_per_month} Inv/Mo`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Action: New Invoice - ONLY for Tenant Admin, NEVER for SuperAdmin */}
            {!isSuper && (
              <button
                onClick={onOpenNewInvoice}
                className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold ${
                isSuper ? 'bg-amber-950/80 border-amber-600/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-indigo-400'
              }`}>
                {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-slate-200 font-medium">{user?.fullName || 'User'}</div>
                <div className={`text-[10px] font-bold uppercase ${isSuper ? 'text-amber-400' : 'text-slate-500'}`}>
                  {user?.role || 'Staff'}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
