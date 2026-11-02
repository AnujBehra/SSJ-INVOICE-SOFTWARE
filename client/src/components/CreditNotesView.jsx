import React, { useState } from 'react';
import { RotateCcw, Plus, X, Search } from 'lucide-react';
import { api } from '../services/api';

export default function CreditNotesView({ creditNotes = [], customers = [], onRefresh }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Goods Return / Price Adjustment');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createCreditNote({
        customer_id: Number(customerId),
        amount: Number(amount),
        reason,
        credit_note_date: noteDate
      });
      setIsAddModalOpen(false);
      setAmount('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Credit Notes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer credit adjustments, discounts, and return adjustments</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Credit Note</span>
        </button>
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {creditNotes.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">No credit notes recorded.</td>
              </tr>
            ) : (
              creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{cn.credit_note_number}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{cn.customer_name}</td>
                  <td className="px-6 py-4 text-slate-600">{cn.credit_note_date}</td>
                  <td className="px-6 py-4 text-slate-600">{cn.reason}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">₹{Number(cn.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {cn.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Issue Credit Note</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Credit Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Issue Credit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
