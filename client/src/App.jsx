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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [publicModalInvoiceId, setPublicModalInvoiceId] = useState(null);

  // Core Data States
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch tenant datasets
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

      setInvoices(invs || []);
      setCustomers(custs || []);
      setItemsCatalog(items || []);
      setEstimates(ests || []);
      setCreditNotes(cns || []);
      setDeliveryChallans(dcs || []);
      setExpenses(exps || []);
      if (bizRes?.business) {
        setBusiness(bizRes.business);
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
    setUser(null);
    setActiveView('dashboard');
    setIsSuperAdminMode(false);
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
            setIsSuperAdminMode(true);
            setActiveView('superadmin');
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        business={business}
        onLogout={handleLogout}
        onOpenNewInvoice={() => {
          setActiveView('invoices');
          setIsNewInvoiceOpen(true);
        }}
        isSuperAdminMode={isSuperAdminMode}
        setIsSuperAdminMode={(val) => {
          setIsSuperAdminMode(val);
          if (val) setActiveView('superadmin');
          else setActiveView('dashboard');
        }}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            setActiveView(view);
            if (view === 'superadmin') setIsSuperAdminMode(true);
            else setIsSuperAdminMode(false);
          }}
          isSuperAdmin={user.role === 'SUPER_ADMIN'}
          isSuperAdminMode={isSuperAdminMode}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {isSuperAdminMode || activeView === 'superadmin' ? (
              <SuperAdminView />
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
