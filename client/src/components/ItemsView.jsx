import React, { useState } from 'react';
import { Package, Plus, Search, Trash2, X, Tag, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { storage } from '../services/storage';

export default function ItemsView({ 
  itemsCatalog = [], 
  onRefresh,
  onItemCreated,
  onItemDeleted
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = itemsCatalog.filter(it =>
    it && it.item_name && (
      it.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.hsn_sac_code && it.hsn_sac_code.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Please enter an item name or description');
      return;
    }

    const payload = {
      item_name: itemName.trim(),
      unit,
      hsn_sac_code: hsnSacCode ? hsnSacCode.trim() : null,
      sales_price: Number(salesPrice || 0),
      tax_rate: Number(taxRate || 18),
      stock_quantity: Number(stockQuantity || 0)
    };

    try {
      setIsSubmitting(true);
      let created = null;
      try {
        created = await api.createItem(payload);
      } catch (networkErr) {
        // Safe offline-first fallback
        created = {
          ...payload,
          id: Date.now(),
          created_at: new Date().toISOString()
        };
      }

      if (created) {
        storage.record('items', created);
        if (onItemCreated) onItemCreated(created);
      }

      setIsAddModalOpen(false);
      setItemName('');
      setHsnSacCode('');
      setSalesPrice('');
      setStockQuantity('0');

      setNotification({
        type: 'success',
        text: `Item '${payload.item_name}' added to master catalog successfully!`
      });
      setTimeout(() => setNotification(null), 3500);

      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (confirm(`Delete '${name || 'this item'}' from master catalog?`)) {
      try {
        storage.remove('items', id);
        if (onItemDeleted) onItemDeleted(id);
        await api.deleteItem(id).catch(() => {});
        setNotification({
          type: 'success',
          text: `Item removed from catalog.`
        });
        setTimeout(() => setNotification(null), 3000);
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">

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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Items & Services Master Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard product and service catalog with HSN/SAC codes and default GST tax slabs
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Catalog Item</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, HSN code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Item / Service Description</th>
              <th className="px-6 py-3.5 text-center">HSN / SAC</th>
              <th className="px-6 py-3.5 text-center">Unit</th>
              <th className="px-6 py-3.5 text-center">GST Rate</th>
              <th className="px-6 py-3.5 text-right">Standard Rate (₹)</th>
              <th className="px-6 py-3.5 text-right">Stock</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-slate-400">
                  No items found in catalog.
                </td>
              </tr>
            ) : (
              filtered.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {it.item_name}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                    {it.hsn_sac_code || '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {it.unit || 'Pcs'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[11px]">
                      {it.tax_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(it.sales_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {it.stock_quantity || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(it.id, it.item_name)}
                      title="Delete item from catalog"
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

      {/* ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Add Item / Service to Master Catalog</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Description / Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Cloud Security Consultation"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={hsnSacCode}
                    onChange={(e) => setHsnSacCode(e.target.value)}
                    placeholder="998313"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                    <option value="Months">Months</option>
                    <option value="Service">Service</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sales Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Rate *</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28% (Luxury)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Quantity</label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  {isSubmitting ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
