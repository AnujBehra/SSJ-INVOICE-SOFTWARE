import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  X, 
  Printer, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  Calendar,
  Building2,
  Navigation,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function DeliveryChallansView({ 
  challans = [], 
  customers = [], 
  itemsCatalog = [],
  business, 
  onRefresh,
  onChallanCreated,
  onChallanDeleted,
  onConvertToInvoice
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transportMode, setTransportMode] = useState('Road Transport');
  const [vehicleNumber, setVehicleNumber] = useState('MH-12-AB-2026 (BlueDart)');
  const [status, setStatus] = useState('DELIVERED');
  const [notes, setNotes] = useState('Goods dispatched in sound merchantable condition for client verification.');
  
  // Multi-item lines
  const [lineItems, setLineItems] = useState([
    { item_name: 'Server Nodes & Networking Cables', hsn_sac_code: '847130', quantity: 2, unit: 'Pcs' }
  ]);

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      { item_name: '', hsn_sac_code: '', quantity: 1, unit: 'Pcs' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const handleSelectCatalogItem = (index, catalogId) => {
    const it = itemsCatalog.find(x => String(x.id) === String(catalogId));
    if (!it) return;
    const updated = [...lineItems];
    updated[index].item_name = it.item_name;
    updated[index].hsn_sac_code = it.hsn_sac_code || '';
    updated[index].unit = it.unit || 'Pcs';
    setLineItems(updated);
  };

  const handleOpenModal = () => {
    setErrorMessage('');
    if (customers.length > 0 && !customerId) {
      setCustomerId(String(customers[0].id));
    }
    const year = new Date().getFullYear();
    const nextSeq = (challans.length || 0) + 1;
    setChallanNumber(`DC-${year}-${String(nextSeq).padStart(4, '0')}`);
    setChallanDate(new Date().toISOString().split('T')[0]);
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const selectedCust = customers.find(c => String(c.id) === String(customerId));
    const effectiveCustName = selectedCust?.customer_name || manualCustomerName.trim() || 'Consignee Client';

    const validItems = lineItems.filter(it => it.item_name && it.item_name.trim());
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one item description with quantity.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        customer_name: effectiveCustName,
        company_name: selectedCust?.company_name || null,
        state_code: selectedCust?.state_code || business?.state_code || '27',
        gstin: selectedCust?.gstin || null,
        shipping_address: selectedCust?.shipping_address || selectedCust?.billing_address || null,
        challan_number: challanNumber.trim(),
        challan_date: challanDate,
        transport_mode: transportMode,
        vehicle_number: vehicleNumber,
        status,
        items: validItems,
        notes
      };

      const created = await api.createDeliveryChallan(payload);
      
      if (onChallanCreated) {
        onChallanCreated(created);
      }
      setIsAddModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to issue delivery challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChallan = async (id, dcNumber) => {
    if (!confirm(`Are you sure you want to remove Delivery Challan #${dcNumber}?`)) return;
    try {
      await api.deleteDeliveryChallan(id);
      if (onChallanDeleted) {
        onChallanDeleted(id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrintChallan = (id) => {
    const url = api.getDeliveryChallanPrintUrl(id);
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

  // KPI Metrics
  const totalChallans = challans.length;
  const deliveredCount = challans.filter(c => c.status === 'DELIVERED').length;
  const inTransitCount = challans.filter(c => c.status === 'IN_TRANSIT' || c.status === 'DISPATCHED').length;

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Truck className="w-3.5 h-3.5" />
            <span>GST Rule 55 Logistics Engine</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Delivery Challans & Dispatch Notes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue transportation advisories, track cargo consignments, and carry goods without tax invoice.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Consignments</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalChallans}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dispatched / In Transit</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{inTransitCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Delivered</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{deliveredCount}</div>
          </div>
        </div>
      </div>

      {/* Delivery Challans Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Challan #</th>
                <th className="px-6 py-3.5">Consignee & Destination</th>
                <th className="px-6 py-3.5">Dispatch Date</th>
                <th className="px-6 py-3.5">Dispatched Items</th>
                <th className="px-6 py-3.5">Logistics & Vehicle</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {challans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">
                    <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No delivery challans issued yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "New Delivery Challan" to generate a Rule 55 transport advice.</p>
                  </td>
                </tr>
              ) : (
                challans.map((dc) => {
                  let itemsList = [];
                  try { 
                    itemsList = typeof dc.items_json === 'string' ? JSON.parse(dc.items_json) : (dc.items_json || []); 
                  } catch(e){}

                  const totalQuantity = itemsList.reduce((sum, it) => sum + Number(it.quantity || 1), 0);

                  return (
                    <tr key={dc.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        <button
                          type="button"
                          onClick={() => handlePrintChallan(dc.id)}
                          className="hover:underline cursor-pointer font-bold text-indigo-600 flex items-center space-x-1"
                          title="Click to Print A4 Delivery Challan"
                        >
                          <span>{dc.challan_number}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        <div className="font-semibold text-slate-900">{dc.customer_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {dc.customer_company ? dc.customer_company : 'Retail Consignee'}
                          {dc.customer_state_code && <span className="ml-1 font-mono">• POS: {dc.customer_state_code}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono">
                        {dc.challan_date}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="font-bold text-slate-900 mb-0.5">
                          {itemsList.length} item{itemsList.length > 1 ? 's' : ''} ({totalQuantity} units)
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {itemsList.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium text-slate-800">{dc.transport_mode || 'Road Transport'}</div>
                        <div className="text-[11px] font-mono text-slate-400">{dc.vehicle_number || dc.notes || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          dc.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          dc.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {dc.status || 'DELIVERED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrintChallan(dc.id)}
                          title="Print / Download A4 Delivery Challan"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChallan(dc.id, dc.challan_number)}
                          title="Delete Challan"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

      {/* ISSUE DELIVERY CHALLAN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Issue GST Rule 55 Delivery Challan</h3>
                  <p className="text-[11px] text-slate-500">Transportation of goods without tax invoice (Job-work / Consignment advice)</p>
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
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              
              {/* Consignee & Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Consignee / Customer *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  >
                    <option value="">-- Direct Consignee (Enter Name Below) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} {c.company_name ? `(${c.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {!customerId && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Consignee Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Logistics / Rajesh Sharma"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Challan Number *</label>
                  <input
                    type="text"
                    required
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Date *</label>
                  <input
                    type="date"
                    required
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transport Mode</label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                  >
                    <option value="Road Transport">Road Transport</option>
                    <option value="Express Courier (BlueDart / DTDC)">Express Courier (BlueDart / DTDC)</option>
                    <option value="Rail Cargo">Rail Cargo</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="Self Handover / Delivery Pickup">Self Handover / Delivery Pickup</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle / Consignment / E-Way No.</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-AB-2026 or BD-987654321"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-bold"
                  >
                    <option value="DELIVERED">Delivered</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DISPATCHED">Dispatched</option>
                    <option value="RETURNED">Returned</option>
                  </select>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-900 text-xs">Itemized Dispatched Goods</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Item Description *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Networking Routers / Industrial Valves"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">HSN/SAC</label>
                          <input
                            type="text"
                            placeholder="8471"
                            value={item.hsn_sac_code}
                            onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Qty *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center"
                          />
                        </div>

                        <div className="col-span-1 text-right pt-3">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {itemsCatalog.length > 0 && (
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                          <span>Or select catalog item:</span>
                          <select
                            onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                            className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5"
                          >
                            <option value="">-- Choose from Catalog --</option>
                            {itemsCatalog.map(it => (
                              <option key={it.id} value={it.id}>{it.item_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Dispatch Instructions / Notes</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Consignment transported for inspection / Job work return"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Issuing...' : 'Issue Delivery Challan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
