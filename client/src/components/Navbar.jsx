import React from 'react';
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  ExternalLink, 
  Zap,
  Crown
} from 'lucide-react';

export default function Navbar({ 
  user, 
  business,
  onLogout, 
  onOpenNewInvoice, 
  isSuperAdminMode, 
  setIsSuperAdminMode, 
  activeView, 
  setActiveView 
}) {
  const plan = business?.plan || user?.plan || user?.business?.plan;
  const companyName = business?.company_name || user?.companyName || user?.business?.company_name;
  const stateCode = business?.state_code || user?.business?.state_code;
  const isSuper = user?.role === 'SUPER_ADMIN';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-extrabold text-sm tracking-wider">
              SSJ
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                SSJ Invoice
              </span>
              <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                PRO
              </span>
            </div>
          </div>

          {/* Center Info: Tenant & Plan Quota */}
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
                <span className="text-slate-300">
                  {plan.max_invoices_per_month === -1 
                    ? 'Unlimited Invoices' 
                    : `${plan.currentMonthUsage || 0}/${plan.max_invoices_per_month} Invoices Used`}
                </span>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Action: New Invoice */}
            <button
              onClick={onOpenNewInvoice}
              className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Invoice</span>
            </button>

            {/* SuperAdmin View Toggle if SuperAdmin */}
            {isSuper && (
              <button
                onClick={() => setIsSuperAdminMode(!isSuperAdminMode)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 transition ${
                  isSuperAdminMode 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSuperAdminMode ? 'Exit SuperAdmin' : 'SuperAdmin Console'}</span>
              </button>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-slate-200 font-medium">{user?.fullName || 'User'}</div>
                <div className="text-[10px] text-slate-500 uppercase">{user?.role || 'Staff'}</div>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
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
