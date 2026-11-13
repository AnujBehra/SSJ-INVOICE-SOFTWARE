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

export default function Sidebar({ activeView, setActiveView, isSuperAdmin, isSuperAdminMode }) {
  
  // SuperAdmin Platform Navigation (Strictly platform-level governance, no operational invoice or expense clutter)
  if (isSuperAdmin) {
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

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-bold text-amber-300">SuperAdmin Console</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Platform-only scope. To manage business billing, access a tenant workspace.
          </div>
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
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Business Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
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

      {/* Tenant QR & Direct Settlement Dock */}
      <div className="px-3 pb-3">
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
