import React, { useState, useEffect } from 'react';
import { Mail, Send, ExternalLink, Copy, Check, X, AlertCircle, Sparkles, FileText, Truck, Calculator } from 'lucide-react';
import { api } from '../services/api';

export default function SendEmailModal({
  isOpen,
  onClose,
  document: doc,
  documentType = 'INVOICE',
  business = {},
  customer = null,
  onSentSuccess
}) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !doc) return;

    setStatusMessage(null);
    setCopied(false);

    const compName = business?.company_name || 'SSJ Tech Solutions Pvt Ltd';
    const custName = doc.customer_name || customer?.customer_name || 'Valued Client';
    const emailToUse = doc.customer_email || customer?.email || doc.email || '';
    setToEmail(emailToUse);

    if (documentType === 'INVOICE') {
      const docNum = doc.invoice_number || 'INV';
      const grandTotal = Number(doc.grand_total || 0).toFixed(2);
      const balanceDue = (Number(doc.grand_total || 0) - Number(doc.paid_amount || 0)).toFixed(2);
      const viewUrl = `${window.location.origin}${api.getInvoicePdfUrl(doc.id)}`;

      setSubject(`Tax Invoice #${docNum} from ${compName}`);
      setBody(
`Dear ${custName},

Please find attached tax invoice #${docNum} issued on ${doc.invoice_date || 'today'}.

Summary of Invoice:
• Invoice Number: #${docNum}
• Due Date: ${doc.due_date || 'Upon Receipt'}
• Total Amount: ₹${grandTotal}
• Outstanding Balance: ₹${balanceDue}
${business?.upi_vpa ? `• Instant UPI Payment VPA: ${business.upi_vpa}\n` : ''}
You can view, print, or download your official GST tax invoice and scan the Dynamic NPCI UPI QR code here:
${viewUrl}

Thank you for your business.

Warm regards,
${compName}`
      );
    } else if (documentType === 'CHALLAN') {
      const docNum = doc.challan_number || 'DC';
      const viewUrl = `${window.location.origin}${api.getDeliveryChallanPrintUrl(doc.id)}`;
      
      let itemsList = '';
      try {
        const items = typeof doc.items_json === 'string' ? JSON.parse(doc.items_json) : (doc.items || []);
        if (Array.isArray(items) && items.length > 0) {
          itemsList = items.map(it => `  - ${it.item_name || it.description} (${it.quantity} ${it.unit || 'Pcs'})`).join('\n');
        }
      } catch (e) {}

      setSubject(`Delivery Challan #${docNum} from ${compName}`);
      setBody(
`Dear ${custName},

This is an official dispatch confirmation under GST Rule 55 regarding Delivery Challan #${docNum}.

Consignment Details:
• Delivery Challan Number: #${docNum}
• Dispatch Date: ${doc.challan_date || 'today'}
• Transport Mode: ${doc.transport_mode || 'Road Transport'}
${doc.vehicle_number ? `• Vehicle / Consignment No: ${doc.vehicle_number}\n` : ''}
Dispatched Goods:
${itemsList || '  - Standard Consignment Goods as per Order'}

You can view and verify the official A4 delivery challan printout here:
${viewUrl}

Please confirm receipt upon delivery.

Warm regards,
${compName}`
      );
    } else if (documentType === 'ESTIMATE') {
      const docNum = doc.estimate_number || 'EST';
      const grandTotal = Number(doc.grand_total || 0).toFixed(2);

      setSubject(`Estimate & Quotation #${docNum} from ${compName}`);
      setBody(
`Dear ${custName},

Thank you for your interest in our products and services. We are pleased to present quotation #${docNum}.

Quotation Overview:
• Estimate Number: #${docNum}
• Date: ${doc.estimate_date || 'today'}
• Valid Until: ${doc.expiry_date || '15 days from issue'}
• Estimated Total: ₹${grandTotal}

Please review the quote and let us know if you approve or require any modifications. Upon your confirmation, this quotation can be converted into a tax invoice.

Warm regards,
${compName}`
      );
    }
  }, [isOpen, doc, documentType, business, customer]);

  if (!isOpen || !doc) return null;

  // 1. Direct Server Cloud Dispatch
  const handleServerSend = async (e) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    try {
      setIsSending(true);
      setStatusMessage(null);

      let res;
      if (documentType === 'INVOICE') {
        res = await api.sendInvoiceEmail(doc.id, { to: toEmail.trim(), subject, body });
      } else if (documentType === 'CHALLAN') {
        res = await api.sendDeliveryChallanEmail(doc.id, { to: toEmail.trim(), subject, body });
      } else if (documentType === 'ESTIMATE') {
        res = await api.sendEstimateEmail(doc.id, { to: toEmail.trim(), subject, body });
      }

      setStatusMessage({
        type: 'success',
        text: res?.message || `Email successfully dispatched to ${toEmail.trim()}!`
      });
      if (onSentSuccess) onSentSuccess();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Dispatch failed: ' + (err.message || 'Server connection error')
      });
    } finally {
      setIsSending(false);
    }
  };

  // 2. Native Mail Client (mailto:)
  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // 3. Gmail Web Compose
  const handleOpenGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  // 4. Copy to Clipboard
  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const docIcon = documentType === 'INVOICE' 
    ? <FileText className="w-5 h-5 text-indigo-600" />
    : documentType === 'CHALLAN'
    ? <Truck className="w-5 h-5 text-indigo-600" />
    : <Calculator className="w-5 h-5 text-indigo-600" />;

  const docTypeName = documentType === 'INVOICE' 
    ? 'Tax Invoice' 
    : documentType === 'CHALLAN' 
    ? 'Delivery Challan' 
    : 'Estimate Quotation';

  const docNum = doc.invoice_number || doc.challan_number || doc.estimate_number || '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              {docIcon}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Send {docTypeName} via Email
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                  #{docNum}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Dispatch official GST document directly to client or third-party email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleServerSend} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Recipient Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="client@company.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject Line</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">Email Message Body</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-[11px] leading-relaxed"
            ></textarea>
          </div>

          {/* Alternative Email Dispatch Options */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleOpenMailClient}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                title="Open in your default Mail app (Apple Mail, Outlook, Thunderbird)"
              >
                <ExternalLink className="w-3 h-3 text-slate-500" />
                <span>Mail App</span>
              </button>
              <button
                type="button"
                onClick={handleOpenGmail}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                title="Compose directly in Gmail in a new browser tab"
              >
                <ExternalLink className="w-3 h-3 text-red-500" />
                <span>Gmail Web</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending...' : 'Send Email'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
