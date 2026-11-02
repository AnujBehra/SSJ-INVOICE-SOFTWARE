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
  QrCode
} from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, isSuperAdmin, isSuperAdminMode }) {
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
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'plans', label: 'Subscriptions', icon: Crown }
  ];

  return (
    <aside className="w-64 bg-slate-900/95 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 select-none min-h-[calc(100vh-4rem)]">
      <div className="py-4 px-3 space-y-1">
        
        {/* Navigation Section Title */}
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id && !isSuperAdminMode;
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

        {/* SuperAdmin Console button */}
        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
              Platform Administration
            </div>
            <button
              onClick={() => setActiveView('superadmin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeView === 'superadmin' || isSuperAdminMode
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:bg-slate-800 text-amber-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>SuperAdmin Platform</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                ROOT
              </span>
            </button>
          </div>
        )}

      </div>

      {/* Zero-Cost Dynamic UPI Compact Feature Dock */}
      <div className="px-3 pb-2">
        <div 
          onClick={() => setActiveView('settings')}
          className="cursor-pointer group p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/40 transition flex flex-col space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200 group-hover:text-white">Zero-Cost Dynamic UPI</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              ₹0 Fee
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Generates NPCI standard payment QR codes dynamically directly into invoices at ₹0 gateway fee.
          </p>
        </div>
      </div>

      {/* Clean Minimal Workspace Status Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Workspace</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">v3.4.0</span>
        </div>
      </div>

    </aside>
  );
}
