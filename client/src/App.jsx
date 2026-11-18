import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import InvoicesView from './components/InvoicesView';
import EstimatesView from './components/EstimatesView';
import CreditNotesView from './components/CreditNotesView';
import DeliveryChallansView from './components/DeliveryChallansView';
import CustomersView from './components/CustomersView';
import ItemsView from './components/ItemsView';
import ExpensesView from './components/ExpensesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import SaaSPlansView from './components/SaaSPlansView';
import SuperAdminView from './components/SuperAdminView';
import PublicInvoiceModal from './components/PublicInvoiceView';
import LoginModal from './components/LoginModal';
import { api } from './services/api';
import { storage } from './services/storage';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState(() => localStorage.getItem('ssj_active_view') || 'dashboard');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(() => localStorage.getItem('ssj_superadmin_mode') === 'true');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [publicModalInvoiceId, setPublicModalInvoiceId] = useState(null);

  // Persistent Core Data States (Immediate recovery upon page refresh/reload)
  const [invoices, setInvoices] = useState(() => storage.get('invoices', []));
  const [customers, setCustomers] = useState(() => storage.get('customers', []));
  const [itemsCatalog, setItemsCatalog] = useState(() => storage.get('items', []));
  const [estimates, setEstimates] = useState(() => storage.get('estimates', []));
  const [creditNotes, setCreditNotes] = useState(() => storage.get('creditNotes', []));
  const [deliveryChallans, setDeliveryChallans] = useState(() => storage.get('deliveryChallans', []));
  const [expenses, setExpenses] = useState(() => storage.get('expenses', []));
  const [business, setBusiness] = useState(() => storage.get('business', null));
  const [loading, setLoading] = useState(true);

  const handleUpdateActiveView = (view) => {
    setActiveView(view);
    localStorage.setItem('ssj_active_view', view);
  };

  const handleUpdateSuperAdminMode = (val) => {
    setIsSuperAdminMode(val);
    localStorage.setItem('ssj_superadmin_mode', String(val));
  };

  // Check auth session
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ssj_token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          if (res.user.business) {
            setBusiness(res.user.business);
            storage.set('business', res.user.business);
          }
          if (res.user.role === 'SUPER_ADMIN' && !res.user.isImpersonated) {
            handleUpdateSuperAdminMode(true);
            if (!localStorage.getItem('ssj_active_view')) {
              handleUpdateActiveView('superadmin-overview');
            }
          }
        } catch (err) {
          console.error('Session expired:', err);
          localStorage.removeItem('ssj_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Fetch tenant datasets and merge with persistent offline-first cache
  const fetchTenantData = async () => {
    const token = localStorage.getItem('ssj_token');
    if (!token) return;
    try {
      const [invs, custs, items, ests, cns, dcs, exps, bizRes, meRes] = await Promise.all([
        api.getInvoices().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getItems().catch(() => []),
        api.getEstimates().catch(() => []),
        api.getCreditNotes().catch(() => []),
        api.getDeliveryChallans().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getBusinessSettings().catch(() => null),
        api.getMe().catch(() => null)
      ]);

      const mergedCustomers = storage.merge('customers', custs || []);
      const mergedInvoices = storage.merge('invoices', invs || []);
      const mergedItems = storage.merge('items', items || []);
      const mergedEstimates = storage.merge('estimates', ests || []);
      const mergedCreditNotes = storage.merge('creditNotes', cns || []);
      const mergedDeliveryChallans = storage.merge('deliveryChallans', dcs || []);
      const mergedExpenses = storage.merge('expenses', exps || []);

      setCustomers(mergedCustomers);
      setInvoices(mergedInvoices);
      setItemsCatalog(mergedItems);
      setEstimates(mergedEstimates);
      setCreditNotes(mergedCreditNotes);
      setDeliveryChallans(mergedDeliveryChallans);
      setExpenses(mergedExpenses);

      // Background bidirectional sync: push any local-only records to server container if missing
      const localOnlyCustomers = mergedCustomers.filter(c => !custs.some(sc => String(sc.id) === String(c.id)));
      if (localOnlyCustomers.length > 0) {
        api.syncCustomers(localOnlyCustomers).catch(() => {});
      }
      const localOnlyInvoices = mergedInvoices.filter(i => !invs.some(si => String(si.id) === String(i.id)));
      if (localOnlyInvoices.length > 0) {
        api.syncInvoices(localOnlyInvoices).catch(() => {});
      }

      if (bizRes?.business) {
        setBusiness(bizRes.business);
        storage.set('business', bizRes.business);
      }
      if (meRes?.user) {
        setUser(prev => {
          if (!prev) return meRes.user;
          // Guard against infinite re-render loops: only return new reference if significant attributes changed
          if (
            prev.role !== meRes.user.role ||
            prev.plan?.id !== meRes.user.plan?.id ||
            prev.businessId !== meRes.user.businessId
          ) {
            return { ...prev, ...meRes.user };
          }
          return prev;
        });
        if (meRes.user.business && !bizRes?.business) {
          setBusiness(meRes.user.business);
        }
      }
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    }
  };

  // Only trigger on initial login or when the authenticated user ID changes
  useEffect(() => {
    if (user?.id) {
      fetchTenantData();
    }
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem('ssj_token');
    localStorage.removeItem('ssj_superadmin_backup_token');
    setUser(null);
    handleUpdateActiveView('dashboard');
    handleUpdateSuperAdminMode(false);
  };

  const handleImpersonate = async (tenantId) => {
    try {
      const currentToken = localStorage.getItem('ssj_token');
      const res = await api.impersonateTenant(tenantId);
      localStorage.setItem('ssj_superadmin_backup_token', currentToken);
      localStorage.setItem('ssj_token', res.token);
      setUser({ ...res.user, isImpersonated: true });
      setBusiness(res.business);
      handleUpdateSuperAdminMode(false);
      handleUpdateActiveView('dashboard');
      await fetchTenantData();
    } catch (err) {
      alert('Impersonation failed: ' + err.message);
    }
  };

  const handleReturnToSuperAdmin = async () => {
    try {
      const backupToken = localStorage.getItem('ssj_superadmin_backup_token');
      if (backupToken) {
        localStorage.setItem('ssj_token', backupToken);
        localStorage.removeItem('ssj_superadmin_backup_token');
      }
      const res = await api.getMe();
      setUser(res.user);
      setBusiness(res.user.business || null);
      handleUpdateSuperAdminMode(true);
      handleUpdateActiveView('superadmin-overview');
    } catch (err) {
      alert('Failed to return to SuperAdmin: ' + err.message);
    }
  };

  const handleViewPdf = (invoiceId) => {
    window.open(api.getInvoicePdfUrl(invoiceId), '_blank');
  };

  const handleOpenPublicPortal = (invoiceId) => {
    setPublicModalInvoiceId(invoiceId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading SSJ Invoice Engine...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginModal 
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          if (loggedInUser.business) {
            setBusiness(loggedInUser.business);
          }
          if (loggedInUser.role === 'SUPER_ADMIN') {
            handleUpdateSuperAdminMode(true);
            handleUpdateActiveView('superadmin-overview');
          } else {
            handleUpdateSuperAdminMode(false);
            handleUpdateActiveView('dashboard');
          }
        }} 
      />
    );
  }

  const isSuperAdminPlatform = user.role === 'SUPER_ADMIN' && !user.isImpersonated;

  const handleCustomerCreated = (newCust) => {
    if (!newCust || newCust.id === undefined || newCust.id === null) return;
    storage.record('customers', newCust);
    setCustomers(prev => {
      const filtered = prev.filter(c => String(c.id) !== String(newCust.id));
      return [newCust, ...filtered];
    });
    api.syncCustomers([newCust]).catch(() => {});
  };

  const handleCustomerDeleted = (id) => {
    if (id === undefined || id === null) return;
    storage.remove('customers', id);
    setCustomers(prev => prev.filter(c => String(c.id) !== String(id)));
  };

  const handleInvoiceCreated = (newInv) => {
    if (!newInv || newInv.id === undefined || newInv.id === null) return;
    storage.record('invoices', newInv);
    setInvoices(prev => {
      const filtered = prev.filter(i => String(i.id) !== String(newInv.id));
      return [newInv, ...filtered];
    });
    api.syncInvoices([newInv]).catch(() => {});
  };

  const handleInvoiceDeleted = (id) => {
    if (id === undefined || id === null) return;
    storage.remove('invoices', id);
    setInvoices(prev => prev.filter(i => String(i.id) !== String(id)));
  };

  const getSuperAdminSubTab = (view) => {
    if (view === 'superadmin-tenants') return 'tenants';
    if (view === 'superadmin-plans') return 'plans';
    if (view === 'superadmin-settings') return 'settings';
    if (view === 'superadmin-audit') return 'audit';
    return 'overview';
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        business={business}
        onLogout={handleLogout}
        onReturnToSuperAdmin={handleReturnToSuperAdmin}
        onOpenNewInvoice={() => {
          handleUpdateActiveView('invoices');
          setIsNewInvoiceOpen(true);
        }}
        isSuperAdminMode={isSuperAdminMode}
        setIsSuperAdminMode={(val) => {
          handleUpdateSuperAdminMode(val);
          if (val) handleUpdateActiveView('superadmin-overview');
          else handleUpdateActiveView('dashboard');
        }}
        activeView={activeView}
        setActiveView={handleUpdateActiveView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            handleUpdateActiveView(view);
            if (view.startsWith('superadmin')) handleUpdateSuperAdminMode(true);
            else handleUpdateSuperAdminMode(false);
          }}
          isSuperAdmin={isSuperAdminPlatform}
          isSuperAdminMode={isSuperAdminMode}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {isSuperAdminPlatform || activeView.startsWith('superadmin') ? (
              <SuperAdminView 
                activeSubTab={getSuperAdminSubTab(activeView)} 
                onImpersonate={handleImpersonate}
              />
            ) : activeView === 'dashboard' ? (
              <DashboardView
                invoices={invoices}
                customers={customers}
                expenses={expenses}
                itemsCatalog={itemsCatalog}
                business={business}
                onNewInvoice={() => {
                  setActiveView('invoices');
                  setIsNewInvoiceOpen(true);
                }}
                onViewInvoice={handleViewPdf}
                onViewReports={() => setActiveView('reports')}
                onOpenPublicLink={handleOpenPublicPortal}
                onNavigate={setActiveView}
              />
            ) : activeView === 'invoices' ? (
              <InvoicesView
                invoices={invoices}
                customers={customers}
                itemsCatalog={itemsCatalog}
                business={business}
                onRefresh={fetchTenantData}
                onViewPdf={handleViewPdf}
                onOpenPublicLink={handleOpenPublicPortal}
                isCreateModalOpen={isNewInvoiceOpen}
                setIsCreateModalOpen={setIsNewInvoiceOpen}
                onCustomerCreated={handleCustomerCreated}
                onCustomerDeleted={handleCustomerDeleted}
                onInvoiceCreated={handleInvoiceCreated}
                onInvoiceDeleted={handleInvoiceDeleted}
              />
            ) : activeView === 'estimates' ? (
              <EstimatesView
                estimates={estimates}
                customers={customers}
                itemsCatalog={itemsCatalog}
                business={business}
                onRefresh={fetchTenantData}
                onViewInvoice={(invId) => {
                  setActiveView('invoices');
                  handleViewPdf(invId);
                }}
              />
            ) : activeView === 'credit-notes' ? (
              <CreditNotesView
                creditNotes={creditNotes}
                customers={customers}
                onRefresh={fetchTenantData}
              />
            ) : activeView === 'delivery-challans' ? (
              <DeliveryChallansView
                challans={deliveryChallans}
                customers={customers}
                onRefresh={fetchTenantData}
              />
            ) : activeView === 'customers' ? (
              <CustomersView
                customers={customers}
                onRefresh={fetchTenantData}
                onCustomerCreated={handleCustomerCreated}
                onCustomerDeleted={handleCustomerDeleted}
              />
            ) : activeView === 'items' ? (
              <ItemsView
                itemsCatalog={itemsCatalog}
                onRefresh={fetchTenantData}
              />
            ) : activeView === 'expenses' ? (
              <ExpensesView
                expenses={expenses}
                onRefresh={fetchTenantData}
              />
            ) : activeView === 'reports' ? (
              <ReportsView business={business} />
            ) : activeView === 'settings' ? (
              <SettingsView
                business={business}
                onRefresh={fetchTenantData}
              />
            ) : activeView === 'plans' ? (
              <SaaSPlansView
                currentPlan={business?.plan || user?.plan || user?.business?.plan}
                business={business}
                onRefresh={fetchTenantData}
              />
            ) : null}
          </div>
        </main>
      </div>

      {/* Public Customer Self-Service Modal */}
      {publicModalInvoiceId && (
        <PublicInvoiceModal
          invoiceId={publicModalInvoiceId}
          onClose={() => setPublicModalInvoiceId(null)}
        />
      )}

    </div>
  );
}
