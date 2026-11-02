import React, { useState } from 'react';
import { 
  Plus, 
  FileCheck2, 
  ArrowRightCircle, 
  CheckCircle2, 
  X, 
  Trash2, 
  Search, 
  Info,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function EstimatesView({ 
  estimates = [], 
  customers = [], 
  itemsCatalog = [], 
  business, 
  onRefresh, 
  onViewInvoice 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [convertingId, setConvertingId] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([
    { item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs', unit_price: 1000, tax_rate: 18 }
  ]);
  const [notes, setNotes] = useState('Quotation valid for 30 days from issuance date.');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredEstimates = estimates.filter(est => 
    est.estimate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCustomer = customers.find(c => String(c.id) === String(customerId));
  const isIntra = selectedCustomer && String(business?.state_code || '').padStart(2, '0') === String(selectedCustomer.state_code || '').padStart(2, '0');

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

  // Convert Estimate to Invoice (1-Click)
  const handleConvert = async (est) => {
    try {
      setConvertingId(est.id);
      const res = await api.convertEstimate(est.id);
      alert(res.message);
      onRefresh();
      if (res.invoiceId) {
        onViewInvoice(res.invoiceId);
      }
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await api.createEstimate({
        customer_id: Number(customerId),
        estimate_date: estimateDate,
        expiry_date: expiryDate,
        items: lineItems,
        notes
      });
      setIsCreateModalOpen(false);
      setCustomerId('');
      setLineItems([{ item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs', unit_price: 1000, tax_rate: 18 }]);
      onRefresh();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Estimates & Quotations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepare customer quotations with 1-click instant conversion into formal tax invoices
          </p>
        </div>
        <button
          onClick={() => { setErrorMsg(''); setIsCreateModalOpen(true); }}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotation #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Estimates Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Quotation #</th>
              <th className="px-6 py-3.5">Customer</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Valid Till</th>
              <th className="px-6 py-3.5 text-right">Taxable</th>
              <th className="px-6 py-3.5 text-right">Grand Total</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-right">1-Click Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredEstimates.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12 text-slate-400">
                  No estimates found. Click "New Quotation" to create one.
                </td>
              </tr>
            ) : (
              filteredEstimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-bold text-indigo-600">
                    {est.estimate_number}
                  </td>
                  <td className="px-6 py-4 text-slate-900">
                    <div>{est.customer_name}</div>
                    {est.customer_company && (
                      <div className="text-[11px] text-slate-500">{est.customer_company}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {est.estimate_date}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {est.expiry_date}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                    ₹{Number(est.subtotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(est.grand_total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      est.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800' :
                      est.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {est.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {est.status === 'CONVERTED' ? (
                      <button
                        onClick={() => onViewInvoice(est.converted_invoice_id)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConvert(est)}
                        disabled={convertingId === est.id}
                        className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-xs transition disabled:opacity-50"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        <span>{convertingId === est.id ? 'Converting...' : 'Convert to Invoice'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE ESTIMATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Create New Quotation / Estimate</h2>
                  <p className="text-xs text-slate-500">Provide pricing estimate to customer with 1-click invoice conversion</p>
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

            <form onSubmit={handleCreateEstimate} className="space-y-6 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.customer_name} ({c.company_name || 'Retail'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Date *</label>
                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-900 uppercase">Estimated Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-2 py-2 text-center w-24">Catalog</th>
                        <th className="px-2 py-2 text-center w-20">HSN</th>
                        <th className="px-2 py-2 text-right w-16">Qty</th>
                        <th className="px-2 py-2 text-right w-24">Rate (₹)</th>
                        <th className="px-2 py-2 text-center w-20">GST %</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              required
                              placeholder="Service or product description..."
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <select
                              onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                            >
                              <option value="">Picker</option>
                              {itemsCatalog.map(it => (
                                <option key={it.id} value={it.id}>{it.item_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.hsn_sac_code}
                              onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Notes</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
