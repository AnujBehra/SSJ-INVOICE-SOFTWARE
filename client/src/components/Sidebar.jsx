import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  FileCheck2, 
  RotateCcw, 
  Truck, 
  Users2, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings, 
  Crown,
  ShieldAlert,
  Building2,
  CreditCard,
  History
} from 'lucide-react';

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  isSuperAdmin, 
  isSuperAdminMode,
  onSwitchToSuperAdmin,
  onSwitchToTenantWorkspace
}) {
  
  // SuperAdmin Platform Navigation (Strictly platform-level governance)
  if (isSuperAdmin && isSuperAdminMode) {
    const superAdminNav = [
      { id: 'superadmin-overview', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'superadmin-tenants', label: 'Tenants & Admins', icon: Building2 },
      { id: 'superadmin-plans', label: 'Subscription Plans', icon: Crown },
      { id: 'superadmin-settings', label: 'Payment Gateways & Settings', icon: Settings },
      { id: 'superadmin-audit', label: 'Platform Audit Trail', icon: History }
    ];

    return (
      <aside className="w-64 bg-slate-900/95 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 select-none min-h-[calc(100vh-4rem)]">
        <div className="py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-500/90 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Platform Administration</span>
          </div>

          {superAdminNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || (activeView === 'superadmin' && item.id === 'superadmin-overview');
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-bold text-amber-300">SuperAdmin Console</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Manage global SaaS subscriptions, tenant organizations, and system audit logs.
          </p>
          <button
            onClick={() => {
              if (onSwitchToTenantWorkspace) onSwitchToTenantWorkspace();
              else setActiveView('dashboard');
            }}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Open Tenant Workspace</span>
          </button>
        </div>
      </aside>
    );
  }

  // Tenant Business Navigation (Standard business billing & operations)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'estimates', label: 'Estimates & Quotes', icon: FileCheck2 },
    { id: 'credit-notes', label: 'Credit Notes', icon: RotateCcw },
    { id: 'delivery-challans', label: 'Delivery Challans', icon: Truck },
    { id: 'customers', label: 'Customers & Ledger', icon: Users2 },
    { id: 'items', label: 'Items & Catalog', icon: Package },
    { id: 'expenses', label: 'Expenses & Bills', icon: Receipt },
    { id: 'reports', label: 'GST Reports & Taxes', icon: BarChart3 },
    { id: 'settings', label: 'Settings & QR Code', icon: Settings },
    { id: 'plans', label: 'Subscriptions', icon: Crown }
  ];

  return (
    <aside className="w-64 bg-slate-900/95 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 select-none min-h-[calc(100vh-4rem)]">
      <div className="py-4 px-3 space-y-1">
        
        {/* Navigation Section Title */}
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Business Operations</span>
          {isSuperAdmin && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-1 rounded">
              TENANT VIEW
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

      </div>

      {/* Footer Area */}
      <div className="px-3 pb-3 space-y-2">
        {/* If SuperAdmin is in Tenant Workspace, offer 1-click Return to SuperAdmin Console */}
        {isSuperAdmin && (
          <button
            onClick={() => {
              if (onSwitchToSuperAdmin) onSwitchToSuperAdmin();
              else setActiveView('superadmin-overview');
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-xs cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
            <span>Return to SuperAdmin</span>
          </button>
        )}

        {/* Tenant QR & Direct Settlement Dock */}
        <div 
          onClick={() => setActiveView('settings')}
          className="cursor-pointer group p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/40 transition flex flex-col space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white">QR & Direct Payments</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">0% MDR</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Configure dynamic NPCI UPI VPA & settlement bank account in Settings.
          </p>
        </div>
      </div>
    </aside>
  );
}
