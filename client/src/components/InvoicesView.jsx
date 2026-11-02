import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  Receipt,
  MessageCircle,
  CreditCard, 
  QrCode, 
  Trash2, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  Building,
  Info,
  X,
  UserPlus,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

const GST_STATE_LIST = [
  { code: '27', name: 'Maharashtra (27)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '32', name: 'Kerala (32)' },
  { code: '08', name: 'Rajasthan (08)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '23', name: 'Madhya Pradesh (23)' },
  { code: '10', name: 'Bihar (10)' },
  { code: '21', name: 'Odisha (21)' },
  { code: '03', name: 'Punjab (03)' },
  { code: '37', name: 'Andhra Pradesh (37)' }
];

export default function InvoicesView({ 
  invoices = [], 
  customers = [], 
  itemsCatalog = [], 
  business, 
  onRefresh, 
  onViewPdf,
  onOpenPublicLink,
  isCreateModalOpen,
  setIsCreateModalOpen
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Record Payment Modal State
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // New Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([
    { item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs', unit_price: 1000, tax_rate: 18 }
  ]);
  const [notes, setNotes] = useState('Thank you for your business. Please scan the dynamic UPI QR code to make immediate payment.');
  const [terms, setTerms] = useState('Payment due within 15 days of invoice issue.');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Quick Customer Create State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustState, setNewCustState] = useState(business?.state_code || '27');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [isSavingCust, setIsSavingCust] = useState(false);

  // Quick Catalog Item Create State
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [activeItemIndexForCatalog, setActiveItemIndexForCatalog] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemTaxRate, setNewItemTaxRate] = useState(18);
  const [newItemHsn, setNewItemHsn] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Pcs');
  const [isSavingItem, setIsSavingItem] = useState(false);

  const handleQuickCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setIsSavingCust(true);
    try {
      const created = await api.createCustomer({
        customer_name: newCustName.trim(),
        company_name: newCustCompany.trim() || null,
        state_code: newCustState.trim() || business?.state_code || '27',
        phone: newCustPhone.trim() || null,
        gstin: newCustGstin.trim().toUpperCase() || null
      });
      if (onRefresh) await onRefresh();
      setCustomerId(String(created.id));
      setIsQuickCustomerOpen(false);
      setNewCustName('');
      setNewCustCompany('');
      setNewCustPhone('');
      setNewCustGstin('');
    } catch (err) {
      alert('Failed to create customer: ' + err.message);
    } finally {
      setIsSavingCust(false);
    }
  };

  const handleQuickCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    setIsSavingItem(true);
    try {
      const created = await api.createItem({
        item_name: newItemName.trim(),
        sales_price: Number(newItemPrice),
        tax_rate: Number(newItemTaxRate || 18),
        hsn_sac_code: newItemHsn.trim() || null,
        unit: newItemUnit || 'Pcs'
      });
      if (onRefresh) await onRefresh();
      if (activeItemIndexForCatalog !== null && lineItems[activeItemIndexForCatalog]) {
        const updated = [...lineItems];
        updated[activeItemIndexForCatalog] = {
          item_id: created.id,
          item_name: created.item_name,
          hsn_sac_code: created.hsn_sac_code || '',
          quantity: updated[activeItemIndexForCatalog].quantity || 1,
          unit: created.unit || 'Pcs',
          unit_price: created.sales_price,
          tax_rate: created.tax_rate || 18
        };
        setLineItems(updated);
      }
      setIsQuickItemOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemHsn('');
    } catch (err) {
      alert('Failed to save item to catalog: ' + err.message);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_company && inv.customer_company.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selected customer POS & GST analysis
  const selectedCustomer = customers.find(c => String(c.id) === String(customerId));
  const isIntra = selectedCustomer && String(business?.state_code || '').padStart(2, '0') === String(selectedCustomer.state_code || '').padStart(2, '0');

  // Add Item to Creator
  const handleAddItem = () => {
    setLineItems([...lineItems, { item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs', unit_price: 0, tax_rate: 18 }]);
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const handleSelectCatalogItem = (index, itemId) => {
    const catItem = itemsCatalog.find(it => String(it.id) === String(itemId));
    if (catItem) {
      const updated = [...lineItems];
      updated[index] = {
        item_id: catItem.id,
        item_name: catItem.item_name,
        hsn_sac_code: catItem.hsn_sac_code || '',
        quantity: 1,
        unit: catItem.unit || 'Pcs',
        unit_price: catItem.sales_price,
        tax_rate: catItem.tax_rate || 18
      };
      setLineItems(updated);
    }
  };

  // Live total calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    lineItems.forEach(item => {
      const taxable = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const rate = Number(item.tax_rate || 0);
      subtotal += taxable;

      if (isIntra) {
        cgst += (taxable * (rate / 2)) / 100;
        sgst += (taxable * (rate / 2)) / 100;
      } else {
        igst += (taxable * rate) / 100;
      }
    });

    const grandTotal = subtotal + cgst + sgst + igst;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  };

  const totals = calculateTotals();

  // Create Invoice Submission
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (lineItems.some(it => !it.item_name.trim() || Number(it.unit_price) <= 0)) {
      setErrorMsg('All line items must have a valid item description and positive price.');
      return;
    }

    try {
      setIsSubmittingInvoice(true);
      setErrorMsg('');
      await api.createInvoice({
        customer_id: Number(customerId),
        invoice_date: invoiceDate,
        due_date: dueDate,
        items: lineItems,
        notes,
        terms
      });
      setIsCreateModalOpen(false);
      // Reset form
      setCustomerId('');
      setLineItems([{ item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs', unit_price: 1000, tax_rate: 18 }]);
      onRefresh();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Record Payment Submission
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;

    try {
      setIsSubmittingPayment(true);
      await api.recordPayment(selectedInvoiceForPayment.id, {
        amount: Number(paymentAmount),
        payment_mode: paymentMode,
        reference_no: paymentRef,
        notes: paymentNotes
      });
      setSelectedInvoiceForPayment(null);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      onRefresh();
    } catch (err) {
      alert('Payment recording failed: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await api.deleteInvoice(id);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Invoices Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, and collect payments with zero-cost NPCI Dynamic UPI QR codes
          </p>
        </div>
        <button
          onClick={() => { setErrorMsg(''); setIsCreateModalOpen(true); }}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Tax Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {['ALL', 'SENT', 'PARTIAL', 'PAID', 'DRAFT'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Customer & POS</th>
                <th className="px-6 py-3.5">Invoice Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5 text-right">Taxable</th>
                <th className="px-6 py-3.5 text-right">Grand Total</th>
                <th className="px-6 py-3.5 text-right">Balance Due</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    No invoices found. Click "New Tax Invoice" to create one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const balanceDue = Number(inv.grand_total) - Number(inv.paid_amount);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        <div className="font-semibold">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <span>{inv.customer_company || 'Retail'}</span>
                          <span>•</span>
                          <span className="font-mono">POS: {inv.customer_state_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {inv.invoice_date}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {inv.due_date}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        ₹{Number(inv.subtotal).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.grand_total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                        ₹{balanceDue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                          inv.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onViewPdf(inv.id)}
                          title="View Vector A4 Tax Invoice / Print"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => window.open(api.getThermalReceiptUrl(inv.id), '_blank')}
                          title="Print 3-inch (80mm) Thermal POS Receipt"
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Receipt className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => {
                            const text = encodeURIComponent(
                              `Dear ${inv.customer_name},\nYour tax invoice #${inv.invoice_number} for ₹${Number(inv.grand_total).toFixed(2)} from ${business?.company_name || 'SSJ Tech Solutions'} is available.\n\nPlease view your bill & scan the Dynamic UPI QR to settle payment:\n${window.location.origin}/api/v1/invoices/${inv.id}/pdf\n\nThank you!`
                            );
                            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                          }}
                          title="Share Invoice via WhatsApp"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <MessageCircle className="w-4 h-4 inline" />
                        </button>
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedInvoiceForPayment(inv);
                              setPaymentAmount(balanceDue.toFixed(2));
                            }}
                            title="Record Payment"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <CreditCard className="w-4 h-4 inline" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPublicLink(inv.id)}
                          title="Open Client Portal View"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <ExternalLink className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          title="Delete Invoice"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Create Indian GST Tax Invoice</h2>
                  <p className="text-xs text-slate-500">Automated Place of Supply (POS) splitting & Dynamic NPCI UPI QR generation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-6 mt-6">
              
              {/* Customer & Dates Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Customer / Client *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ New Customer</span>
                    </button>
                  </div>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsQuickCustomerOpen(true);
                      } else {
                        setCustomerId(e.target.value);
                      }
                    }}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} {c.company_name ? `(${c.company_name})` : ''} - State: {c.state_code}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">
                      + Add New Customer...
                    </option>
                  </select>
                  {customers.length === 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      <span>No customers found.</span>
                      <button
                        type="button"
                        onClick={() => setIsQuickCustomerOpen(true)}
                        className="font-bold underline text-amber-900"
                      >
                        + Create Customer
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Automatic POS & Tax Notice Banner */}
              {selectedCustomer && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                  isIntra 
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900' 
                    : 'bg-purple-50/80 border-purple-200 text-purple-900'
                }`}>
                  <div>
                    <span className="font-bold">Place of Supply (POS): </span>
                    State Code {selectedCustomer.state_code} • Business State: {business?.state_code}
                  </div>
                  <div className="font-extrabold uppercase text-[11px] px-2.5 py-1 rounded bg-white shadow-2xs">
                    {isIntra ? 'Intra-State: CGST (50%) + SGST (50%)' : 'Inter-State: IGST (100%)'}
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Itemized Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Item Description</th>
                        <th className="px-2 py-2.5 text-center w-24">Catalog</th>
                        <th className="px-2 py-2.5 text-center w-20">HSN/SAC</th>
                        <th className="px-2 py-2.5 text-right w-16">Qty</th>
                        <th className="px-2 py-2.5 text-right w-24">Rate (₹)</th>
                        <th className="px-2 py-2.5 text-center w-20">GST %</th>
                        <th className="px-3 py-2.5 text-right w-24">Amount</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Service or product description..."
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              required
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <select
                              value={item.item_id || ''}
                              onChange={(e) => {
                                if (e.target.value === '__add_new__') {
                                  setActiveItemIndexForCatalog(idx);
                                  setNewItemName(item.item_name || '');
                                  setNewItemPrice(item.unit_price ? String(item.unit_price) : '');
                                  setNewItemHsn(item.hsn_sac_code || '');
                                  setNewItemTaxRate(item.tax_rate || 18);
                                  setIsQuickItemOpen(true);
                                } else {
                                  handleSelectCatalogItem(idx, e.target.value);
                                }
                              }}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                            >
                              <option value="">Picker...</option>
                              {itemsCatalog.map(it => (
                                <option key={it.id} value={it.id}>{it.item_name} (₹{it.sales_price})</option>
                              ))}
                              <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">
                                + Save to Catalog...
                              </option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="HSN"
                              value={item.hsn_sac_code}
                              onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              required
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              required
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.tax_rate}
                              onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            ₹{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Totals & Dynamic UPI Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                
                {/* Dynamic UPI Preview */}
                <div className="flex items-start space-x-3.5 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <QrCode className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-xs flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>Zero-Cost Dynamic UPI</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          ₹0 FEE
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                        AUTO-GENERATED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Generates NPCI standard payment QR codes dynamically directly into invoices at ₹0 gateway fee.
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-600">
                        VPA: <strong className="font-mono text-slate-800">{business?.upi_vpa || 'Configure in Settings'}</strong>
                      </span>
                      <span className="text-indigo-600 font-bold font-mono">
                        Payable: ₹{totals.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Totals Table */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {isIntra ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central GST (CGST):</span>
                        <span className="font-mono font-semibold">₹{totals.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State GST (SGST):</span>
                        <span className="font-mono font-semibold">₹{totals.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono font-semibold">₹{totals.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Notes</label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea
                    rows="2"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  ></textarea>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingInvoice ? 'Generating Tax Invoice...' : 'Generate & Issue Invoice'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Record Customer Payment</h3>
                <p className="text-xs text-slate-500">Invoice #{selectedInvoiceForPayment.invoice_number}</p>
              </div>
              <button 
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="UPI">UPI (Dynamic QR Scan)</option>
                  <option value="RAZORPAY">Razorpay (Cards, UPI, NetBanking)</option>
                  <option value="STRIPE">Stripe (International Cards)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS/RTGS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / UTR / Note</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-UTR-998822..."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {isSubmittingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Add New Customer</h3>
                  <p className="text-[11px] text-slate-500">Save to directory & auto-select for this invoice</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Trade Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Kumar Infotech Pvt Ltd"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST State Code *</label>
                  <select
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {GST_STATE_LIST.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9820012345"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCU9603R1ZM"
                  maxLength={15}
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCust}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSavingCust ? 'Saving Customer...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CATALOG ITEM MODAL */}
      {isQuickItemOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Add Item to Catalog</h3>
                  <p className="text-[11px] text-slate-500">Save product/service for 1-click reusable billing</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsQuickItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateItem} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item / Service Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Maintenance AMC"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Sales Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 5000"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={newItemTaxRate}
                    onChange={(e) => setNewItemTaxRate(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 998313"
                    value={newItemHsn}
                    onChange={(e) => setNewItemHsn(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Hours">Hours</option>
                    <option value="Month">Month</option>
                    <option value="Year">Year</option>
                    <option value="Service">Service</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickItemOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSavingItem ? 'Saving to Catalog...' : 'Save & Insert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
