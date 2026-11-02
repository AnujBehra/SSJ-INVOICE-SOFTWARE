import React, { useState } from 'react';
import { Truck, Plus, X } from 'lucide-react';
import { api } from '../services/api';

export default function DeliveryChallansView({ challans = [], customers = [], onRefresh }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [itemDesc, setItemDesc] = useState('Server Nodes & Networking Cables');
  const [qty, setQty] = useState('2');
  const [notes, setNotes] = useState('Delivery dispatched via BlueDart logistics');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createDeliveryChallan({
        customer_id: Number(customerId),
        items: [{ item_name: itemDesc, quantity: Number(qty) }],
        notes
      });
      setIsAddModalOpen(false);
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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Delivery Challans</h1>
          <p className="text-xs text-slate-500 mt-0.5">Goods transport delivery notes conforming to GST Rule 55</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Challan #</th>
              <th className="px-6 py-3.5">Customer & Consignee</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Dispatched Items</th>
              <th className="px-6 py-3.5">Logistics Note</th>
              <th className="px-6 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {challans.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">No delivery challans issued yet.</td>
              </tr>
            ) : (
              challans.map((dc) => {
                let itemsList = [];
                try { itemsList = JSON.parse(dc.items_json); } catch(e){}
                return (
                  <tr key={dc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{dc.challan_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{dc.customer_name}</td>
                    <td className="px-6 py-4 text-slate-600">{dc.challan_date}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {itemsList.map((it, i) => (
                        <div key={i}>{it.quantity}x {it.item_name}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{dc.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {dc.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Issue Delivery Challan</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Consignee *</label>
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
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Description</label>
                  <input
                    type="text"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transport / E-Way Bill Note</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Issue Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
