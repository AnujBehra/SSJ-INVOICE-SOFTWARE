import React, { useState } from 'react';
import { RotateCcw, Plus, X, Search, Printer, Mail, Trash2, Check, AlertCircle, Calendar, Building2, Tag } from 'lucide-react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import SendEmailModal from './SendEmailModal';

export default function CreditNotesView({ 
  creditNotes = [], 
  customers = [], 
  business, 
  onRefresh,
  onCreditNoteCreated,
  onCreditNoteDeleted
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState(null);
  const [creditNoteToEmail, setCreditNoteToEmail] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Goods Return / Price Adjustment');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleOpenModal = () => {
    setErrorMessage('');
    if (customers.length > 0 && !customerId) {
      setCustomerId(String(customers[0].id));
    }
    setAmount('');
    setReason('Goods Return / Price Adjustment');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('Please enter a valid positive credit amount.');
      return;
    }

    const selectedCust = customers.find(c => String(c.id) === String(customerId));
    const effectiveCustName = selectedCust?.customer_name || manualCustomerName.trim() || 'Client';

    const year = new Date().getFullYear();
    const nextSeq = (creditNotes.length || 0) + 1;
    const fallbackCnNumber = `CN-${year}-${String(nextSeq).padStart(4, '0')}`;

    const payload = {
      customer_id: customerId ? Number(customerId) : null,
      customer_name: effectiveCustName,
      company_name: selectedCust?.company_name || null,
      amount: numericAmount,
      reason,
      credit_note_date: noteDate,
      credit_note_number: fallbackCnNumber
    };

    try {
      setIsSubmitting(true);
      let created = null;
      try {
        created = await api.createCreditNote(payload);
      } catch (networkErr) {
        // Safe offline-first fallback
        created = {
          ...payload,
          id: Date.now(),
          status: 'OPEN',
          created_at: new Date().toISOString()
        };
      }

      if (created) {
        storage.record('creditNotes', created);
        if (onCreditNoteCreated) onCreditNoteCreated(created);
      }

      setIsAddModalOpen(false);
      setAmount('');
      setNotification({
        type: 'success',
        text: `Credit Note #${created.credit_note_number || fallbackCnNumber} issued successfully!`
      });
      setTimeout(() => setNotification(null), 3500);

      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to issue credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, cnNumber) => {
    if (!confirm(`Are you sure you want to remove Credit Note #${cnNumber}?`)) return;
    try {
      storage.remove('creditNotes', id);
      if (onCreditNoteDeleted) onCreditNoteDeleted(id);
      await api.deleteCreditNote(id).catch(() => {});
      setNotification({
        type: 'success',
        text: `Credit Note #${cnNumber} removed.`
      });
      setTimeout(() => setNotification(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = (id) => {
    const url = api.getCreditNotePrintUrl(id, true);
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const filtered = creditNotes.filter(cn =>
    cn && (
      (cn.credit_note_number && cn.credit_note_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cn.customer_name && cn.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cn.reason && cn.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Credit Notes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer credit adjustments, discounts, and return adjustments under GST Rule 53</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Credit Note</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Credit Note #, Customer name, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Credit Note #</th>
              <th className="px-6 py-3.5">Customer</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Reason</th>
              <th className="px-6 py-3.5 text-right">Amount (₹)</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RotateCcw className="w-8 h-8 text-slate-300" />
                    <span>No credit notes recorded. Click "New Credit Note" to issue one.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                    {cn.credit_note_number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{cn.customer_name}</div>
                    {cn.invoice_number && (
                      <div className="text-[11px] text-slate-500">Ref: #{cn.invoice_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{cn.credit_note_date}</td>
                  <td className="px-6 py-4 text-slate-600">{cn.reason || 'Price adjustment'}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(cn.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {cn.status || 'OPEN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setCreditNoteToEmail(cn)}
                      title="Send Credit Note via Email"
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    >
                      <Mail className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(cn.id)}
                      title="Print A4 Credit Note (Rule 53)"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cn.id, cn.credit_note_number)}
                      title="Delete Credit Note"
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ISSUE CREDIT NOTE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Issue GST Rule 53 Credit Note</h3>
                  <p className="text-[11px] text-slate-500">Record customer credit for sales returns or adjustments</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="">-- Direct Customer (Enter Name Below) --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!customerId && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer / Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Innovations Corp"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Note Date *</label>
                  <input
                    type="date"
                    required
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Credit Adjustment</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Goods return / Price adjustment / Defect warranty"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Issuing...' : 'Issue Credit Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND EMAIL MODAL */}
      {creditNoteToEmail && (
        <SendEmailModal
          isOpen={!!creditNoteToEmail}
          onClose={() => setCreditNoteToEmail(null)}
          document={creditNoteToEmail}
          documentType="CREDIT_NOTE"
          business={business}
          customer={customers.find(c => String(c.id) === String(creditNoteToEmail.customer_id))}
          onSentSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

    </div>
  );
}
