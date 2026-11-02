import React, { useState } from 'react';
import { Receipt, Plus, Trash2, X } from 'lucide-react';
import { api } from '../services/api';

export default function ExpensesView({ expenses = [], onRefresh }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [category, setCategory] = useState('Cloud Hosting & Infrastructure');
  const [vendorName, setVendorName] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalTaxInput = expenses.reduce((sum, e) => sum + Number(e.tax_amount || 0), 0);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createExpense({
        category,
        vendor_name: vendorName,
        expense_date: expenseDate,
        amount: Number(amount),
        tax_amount: Number(taxAmount || 0),
        payment_mode: paymentMode,
        notes
      });
      setIsAddModalOpen(false);
      setVendorName('');
      setAmount('');
      setTaxAmount('');
      setNotes('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (confirm('Delete this expense entry?')) {
      try {
        await api.deleteExpense(id);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Expenses & Input Tax Credit (ITC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track business operating bills and claim GST Input Tax Credit against GSTR-3B liability
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Expenses Recorded</div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ₹{totalExpenses.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 uppercase">Eligible Input Tax Credit (ITC)</div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
            ₹{totalTaxInput.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Offset against monthly GST outward tax liability</div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Category</th>
              <th className="px-6 py-3.5">Vendor</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5 text-center">Payment Mode</th>
              <th className="px-6 py-3.5 text-right">Tax (ITC)</th>
              <th className="px-6 py-3.5 text-right">Amount (₹)</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-slate-400">
                  No expenses recorded.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {exp.category}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {exp.vendor_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {exp.expense_date}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                      {exp.payment_mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                    ₹{Number(exp.tax_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(exp.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
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

      {/* ADD EXPENSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Record Business Operating Expense</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Cloud Hosting & Infrastructure">Cloud Hosting & Infrastructure</option>
                  <option value="Office Rent & Utilities">Office Rent & Utilities</option>
                  <option value="Software & Subscriptions">Software & Subscriptions</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Hardware & Office Supplies">Hardware & Office Supplies</option>
                  <option value="Professional & Legal Fees">Professional & Legal Fees</option>
                  <option value="Travel & Logistics">Travel & Logistics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Hostinger VPS"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Bill Amount (₹) *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax (Eligible ITC)</label>
                  <input
                    type="number"
                    step="any"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="e.g. 1530"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT_CARD">Corporate Card</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
