import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  QrCode, 
  Landmark, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Palette,
  Users,
  History,
  Plus,
  Trash2,
  Mail,
  Phone,
  FileText,
  UserPlus,
  Lock,
  Globe,
  Sparkles,
  AlertCircle,
  Database,
  Download,
  Copy,
  Check,
  Hash,
  Send,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

const GST_STATES = [
  { code: '01', name: 'Jammu & Kashmir (01)' },
  { code: '02', name: 'Himachal Pradesh (02)' },
  { code: '03', name: 'Punjab (03)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '08', name: 'Rajasthan (08)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '10', name: 'Bihar (10)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '21', name: 'Odisha (21)' },
  { code: '23', name: 'Madhya Pradesh (23)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '27', name: 'Maharashtra (27)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '32', name: 'Kerala (32)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '37', name: 'Andhra Pradesh (37)' }
];

const THEME_COLORS = [
  { name: 'Indigo Modern', hex: '#4f46e5' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Deep Violet', hex: '#7c3aed' },
  { name: 'Rose Red', hex: '#e11d48' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Slate Executive', hex: '#334155' }
];

export default function SettingsView({ business, onRefresh }) {
  const [activeTab, setActiveTab] = useState('profile');

  // Profile State
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Payment & UPI
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [testAmount, setTestAmount] = useState('500');

  // Invoice Branding & Preferences
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceSuffix, setInvoiceSuffix] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1001);
  const [roundOffTotals, setRoundOffTotals] = useState(true);
  const [estimatePrefix, setEstimatePrefix] = useState('EST-');
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [signatoryTitle, setSignatoryTitle] = useState('Authorized Signatory');
  const [termsConditions, setTermsConditions] = useState('Payment due within 15 days of invoice issue.');
  const [customerNotes, setCustomerNotes] = useState('Thank you for your business. Please scan the dynamic UPI QR code to make immediate payment.');

  // Customer Self-Service Portal
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [portalBannerText, setPortalBannerText] = useState('');
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  // Email & Communication Templates
  const [activeTemplateTab, setActiveTemplateTab] = useState('invoice');
  const [emailInvoiceSubject, setEmailInvoiceSubject] = useState('Tax Invoice {{invoice_number}} from {{company_name}}');
  const [emailInvoiceBody, setEmailInvoiceBody] = useState('Dear {{customer_name}},\n\nPlease find attached tax invoice {{invoice_number}} for ₹{{grand_total}} due on {{due_date}}.\n\nYou can also pay directly via UPI by scanning the QR code or visiting your customer portal link.\n\nWarm regards,\n{{company_name}}');
  const [emailReceiptSubject, setEmailReceiptSubject] = useState('Payment Receipt for Invoice {{invoice_number}}');
  const [emailReceiptBody, setEmailReceiptBody] = useState('Dear {{customer_name}},\n\nWe have successfully received your payment of ₹{{payment_amount}} against invoice {{invoice_number}}.\n\nThank you for choosing {{company_name}}!');
  const [emailReminderSubject, setEmailReminderSubject] = useState('Friendly Reminder: Invoice {{invoice_number}} Overdue');
  const [emailReminderBody, setEmailReminderBody] = useState('Dear {{customer_name}},\n\nThis is a friendly reminder that payment for invoice {{invoice_number}} of ₹{{grand_total}} was due on {{due_date}}.\n\nPlease complete payment at your earliest convenience.\n\nRegards,\n{{company_name}}');

  // Backup & Export Center
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupExportSuccess, setBackupExportSuccess] = useState(false);

  // Team & Multi-User State
  const [teamMembers, setTeamMembers] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('password123');
  const [newMemberRole, setNewMemberRole] = useState('BUSINESS_ADMIN');
  const [inviteError, setInviteError] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Activity / Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setCompanyName(business.company_name || '');
      setGstin(business.gstin || '');
      setPanNumber(business.pan_number || '');
      setPhone(business.phone || '');
      setWebsite(business.website || '');
      setStateCode(business.state_code || '27');
      setAddressLine1(business.address_line1 || '');
      setCity(business.city || '');
      setPincode(business.pincode || '');
      setLogoUrl(business.logo_url || '');

      setBankName(business.bank_name || '');
      setBankAccountNo(business.bank_account_no || '');
      setBankIfsc(business.bank_ifsc || '');
      setUpiVpa(business.upi_vpa || '');
      setRazorpayKey(business.tenant_razorpay_key || '');
      setStripeKey(business.tenant_stripe_key || '');

      setInvoicePrefix(business.invoice_prefix || 'INV-');
      setInvoiceSuffix(business.invoice_suffix || '');
      setNextInvoiceNumber(business.next_invoice_number || 1001);
      setRoundOffTotals(business.round_off_totals !== undefined ? Boolean(business.round_off_totals) : true);
      setEstimatePrefix(business.estimate_prefix || 'EST-');
      setBrandColor(business.brand_color || '#4f46e5');
      setSignatoryTitle(business.signatory_title || 'Authorized Signatory');
      setTermsConditions(business.terms_conditions || 'Payment due within 15 days of invoice issue.');
      setCustomerNotes(business.customer_notes || 'Thank you for your business. Please scan the dynamic UPI QR code to make immediate payment.');

      setPortalEnabled(business.portal_enabled !== undefined ? Boolean(business.portal_enabled) : true);
      setPortalBannerText(business.portal_banner_text || '');
      if (business.email_invoice_subject) setEmailInvoiceSubject(business.email_invoice_subject);
      if (business.email_invoice_body) setEmailInvoiceBody(business.email_invoice_body);
      if (business.email_receipt_subject) setEmailReceiptSubject(business.email_receipt_subject);
      if (business.email_receipt_body) setEmailReceiptBody(business.email_receipt_body);
      if (business.email_reminder_subject) setEmailReminderSubject(business.email_reminder_subject);
      if (business.email_reminder_body) setEmailReminderBody(business.email_reminder_body);
    }
  }, [business]);

  // Load team members on tab switch
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeam();
    } else if (activeTab === 'activity') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchTeam = async () => {
    try {
      const data = await api.getBusinessUsers();
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Failed to load team:', err);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await api.getBusinessAuditLogs();
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    try {
      await api.updateBusinessSettings({
        company_name: companyName,
        gstin,
        pan_number: panNumber,
        phone,
        website,
        state_code: stateCode,
        address_line1: addressLine1,
        city,
        pincode,
        logo_url: logoUrl,
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_ifsc: bankIfsc,
        upi_vpa: upiVpa,
        tenant_razorpay_key: razorpayKey,
        tenant_stripe_key: stripeKey,
        invoice_prefix: invoicePrefix,
        invoice_suffix: invoiceSuffix,
        next_invoice_number: Number(nextInvoiceNumber) || 1001,
        round_off_totals: roundOffTotals ? 1 : 0,
        estimate_prefix: estimatePrefix,
        brand_color: brandColor,
        signatory_title: signatoryTitle,
        terms_conditions: termsConditions,
        customer_notes: customerNotes,
        portal_enabled: portalEnabled ? 1 : 0,
        portal_banner_text: portalBannerText,
        email_invoice_subject: emailInvoiceSubject,
        email_invoice_body: emailInvoiceBody,
        email_receipt_subject: emailReceiptSubject,
        email_receipt_body: emailReceiptBody,
        email_reminder_subject: emailReminderSubject,
        email_reminder_body: emailReminderBody
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      onRefresh();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setIsExportingBackup(true);
      const data = await api.exportOrganizationData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(companyName || 'ssj_organization').toLowerCase().replace(/\s+/g, '_')}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupExportSuccess(true);
      setTimeout(() => setBackupExportSuccess(false), 4000);
    } catch (err) {
      alert('Backup export failed: ' + err.message);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const insertTag = (tag) => {
    if (activeTemplateTab === 'invoice') {
      setEmailInvoiceBody(prev => prev + ' ' + tag);
    } else if (activeTemplateTab === 'receipt') {
      setEmailReceiptBody(prev => prev + ' ' + tag);
    } else {
      setEmailReminderBody(prev => prev + ' ' + tag);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setInviteError('');
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setInviteError('Full name and email address are required.');
      return;
    }
    try {
      setIsSubmittingMember(true);
      await api.addBusinessUser({
        full_name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        password: newMemberPassword || 'password123',
        role: newMemberRole || 'BUSINESS_ADMIN'
      });
      setIsInviteModalOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPassword('password123');
      setInviteError('');
      fetchTeam();
    } catch (err) {
      setInviteError(err.message || 'Failed to add member');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await api.updateBusinessUser(userId, { role: newRole });
      fetchTeam();
    } catch (err) {
      alert('Role update failed: ' + err.message);
    }
  };

  const handleDeleteMember = async (userId, memberName) => {
    if (!confirm(`Are you sure you want to remove '${memberName}' from this organization?`)) return;
    try {
      await api.deleteBusinessUser(userId);
      fetchTeam();
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  // Test UPI string
  const cleanName = encodeURIComponent(companyName.trim() || 'Merchant');
  const cleanNote = encodeURIComponent('Test Payment');
  const testUpiUri = upiVpa ? `upi://pay?pa=${upiVpa}&pn=${cleanName}&am=${Number(testAmount || 1).toFixed(2)}&cu=INR&tn=${cleanNote}` : '';
  const testQrUrl = testUpiUri ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(testUpiUri)}` : null;

  return (
    <div className="space-y-6 max-w-6xl">
      
      {/* Header & Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Organization Administration</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                SSJ INVOICE Standard
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage organization profile, NPCI Dynamic UPI QR settlement, document branding, team permissions & audit logs
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 text-xs font-semibold">
          {[
            { id: 'profile', label: 'Organization Profile & GST', icon: Building2 },
            { id: 'payments', label: 'Payment Modes & UPI QR', icon: QrCode },
            { id: 'branding', label: 'Invoice Branding & Preferences', icon: Palette },
            { id: 'portal', label: 'Customer Portal', icon: Globe },
            { id: 'templates', label: 'Email Templates', icon: Mail },
            { id: 'backup', label: 'Data Backup & Export', icon: Database },
            { id: 'team', label: `Users & Roles (${teamMembers.length || 1})`, icon: Users },
            { id: 'activity', label: 'Activity & Audit Trail', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Organization settings and preferences updated successfully!</span>
        </div>
      )}

      {/* TAB 1: Organization Profile & GST */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Legal Business Identity & Tax Registration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Legal Entity Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. SSJ Tech Solutions Pvt Ltd"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business GSTIN (15 Digits)</label>
              <input
                type="text"
                maxLength="15"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCS1429B1Z2"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                maxLength="10"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="AABCS1429B"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST State Code (Origin POS) *</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              >
                {GST_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pune"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Postal Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="411057"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registered Business Address</label>
            <textarea
              rows="2"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Suite / Plot / Street, Landmark, Industrial Area"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company Logo URL / Asset</label>
            <div className="flex items-center space-x-3">
              <img 
                src={logoUrl || '/ssj-icon.png'} 
                alt="Logo Preview" 
                className="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xs" 
                onError={(e) => { e.target.src = '/ssj-icon.png'; }}
              />
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/logo.png or https://yourcompany.com/logo.png"
                className="flex-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setLogoUrl('/logo.png')}
                className="px-2.5 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                Use SSJ Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Payment Modes & UPI QR */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Zero-Cost NPCI Dynamic UPI QR Settlement</h2>
                  <p className="text-[11px] text-slate-500">Instant direct-to-bank settlement without payment gateway fees</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                0% TRANSACTION FEE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Merchant UPI VPA Address *</label>
                  <input
                    type="text"
                    required
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value.toLowerCase())}
                    placeholder="e.g. ssjtech@hdfcbank or merchant@upi"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Customers scanning invoice QR via PhonePe, GPay, Paytm, or BHIM pay directly to this UPI ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interactive Test QR Amount (₹)</label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
              </div>

              {/* Live QR Tester Preview */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center space-x-4">
                {testQrUrl ? (
                  <>
                    <img
                      src={testQrUrl}
                      alt="Live UPI QR"
                      className="w-28 h-28 bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs"
                    />
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-indigo-950">Live Dynamic UPI Preview</div>
                      <p className="text-[11px] text-slate-600">
                        Scan with PhonePe, Google Pay or BHIM to verify payment string.
                      </p>
                      <div className="font-mono font-bold text-indigo-700 text-xs">
                        ₹{Number(testAmount || 0).toFixed(2)} • {upiVpa}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 w-full text-xs text-slate-400">
                    Enter your UPI VPA to preview live dynamic QR code.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Coordinates & Optional Online Gateways */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Landmark className="w-5 h-5 text-slate-700" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">NEFT / RTGS / IMPS Bank Transfer Coordinates</h2>
                <p className="text-[11px] text-slate-500">Printed automatically at the footer of official PDF invoices</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="HDFC Bank Ltd"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="50200012345678"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="HDFC0000123"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-2">Optional Customer Portal Card Gateways</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tenant Razorpay Key ID</label>
                  <input
                    type="text"
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                    placeholder="rzp_live_..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tenant Stripe Publishable Key</label>
                  <input
                    type="text"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    placeholder="pk_live_..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Invoice Branding & Customizer (SSJ INVOICE Standard) */}
      {activeTab === 'branding' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Palette className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Document Customizer & Brand Styling</h2>
              <p className="text-[11px] text-slate-500">Configure auto-numbering prefixes, brand colors, terms & notes</p>
            </div>
          </div>

          {/* Theme Color Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Brand Accent Theme Color</label>
            <div className="flex flex-wrap items-center gap-3">
              {THEME_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBrandColor(c.hex)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    brandColor === c.hex
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }}></span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Auto-Number Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Example: {invoicePrefix}2026-0001</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estimate Prefix</label>
              <input
                type="text"
                value={estimatePrefix}
                onChange={(e) => setEstimatePrefix(e.target.value)}
                placeholder="EST-"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Example: {estimatePrefix}2026-0001</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory Title</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="Authorized Signatory"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Terms & Conditions</label>
            <textarea
              rows="3"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Terms and conditions specified on invoices..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Customer Notes</label>
            <textarea
              rows="2"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Thank you for your business..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            ></textarea>
          </div>

          {/* Sequential Numbering & Auto-Rounding Preferences */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
              Sequential Numbering & Calculation Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Suffix (Optional)</label>
                <input
                  type="text"
                  value={invoiceSuffix}
                  onChange={(e) => setInvoiceSuffix(e.target.value)}
                  placeholder="e.g. /26-27 or -SSJ"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Appended to invoice numbers (e.g. {invoicePrefix}1001{invoiceSuffix})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next Invoice Sequence Counter</label>
                <input
                  type="number"
                  min="1"
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(e.target.value)}
                  placeholder="1001"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Starting counter for next auto-generated tax invoice</p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-700 mb-2">Grand Total Rounding</label>
                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundOffTotals}
                    onChange={(e) => setRoundOffTotals(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Auto-round totals to nearest Rupee (₹)</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Standard commercial rounding (e.g. ₹1,416.40 → ₹1,416.00)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Customer Self-Service Portal Settings */}
      {activeTab === 'portal' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Globe className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Customer Self-Service Portal</h2>
                <p className="text-[11px] text-slate-500">Enable clients to review invoices, make UPI payments, and view real-time statement ledgers</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                portalEnabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {portalEnabled ? '● Portal Active' : '○ Portal Paused'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold text-slate-900">Portal Public Availability</h3>
              <p className="text-[11px] text-slate-500">When enabled, customers can view their invoices via secure public links with zero login required.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={portalEnabled}
                onChange={(e) => setPortalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Portal Welcome Announcement Banner</label>
            <input
              type="text"
              value={portalBannerText}
              onChange={(e) => setPortalBannerText(e.target.value)}
              placeholder="e.g. Welcome! Please verify your GSTIN and pay seamlessly using any UPI App."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">Displayed prominently at the top of client-facing payment and invoice screens.</p>
          </div>

          {/* Portal Link Box */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Default Client Portal Entry Link</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal`;
                  navigator.clipboard.writeText(portalUrl);
                  setCopiedPortalLink(true);
                  setTimeout(() => setCopiedPortalLink(false), 2000);
                }}
                className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition cursor-pointer"
              >
                {copiedPortalLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 text-xs font-mono text-slate-700 select-all overflow-x-auto">
              {typeof window !== 'undefined' ? `${window.location.origin}/portal` : 'https://ssjinvoice.com/portal'}
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                <QrCode className="w-4 h-4" />
                <span>Zero-Fee Dynamic UPI</span>
              </div>
              <p className="text-[11px] text-slate-500">Clients scan dynamic NPCI QR codes directly from desktop or tap UPI deep-links on mobile.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>Statutory GST PDF</span>
              </div>
              <p className="text-[11px] text-slate-500">Print-ready tax invoices compliant with Rule 46 of Indian GST with your digital signature.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                <History className="w-4 h-4" />
                <span>Real-Time Statement</span>
              </div>
              <p className="text-[11px] text-slate-500">Customers can view their itemized transactions, credit notes, and balance due history.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Email & Communication Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Mail className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Email & Notification Templates</h2>
                <p className="text-[11px] text-slate-500">Configure default subject lines and messaging dispatched to clients for invoices, receipts, and reminders</p>
              </div>
            </div>
          </div>

          {/* Template Sub-Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            {[
              { id: 'invoice', label: 'Invoice Dispatch' },
              { id: 'receipt', label: 'Payment Receipt' },
              { id: 'reminder', label: 'Payment Reminder' }
            ].map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveTemplateTab(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTemplateTab === sub.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Merge Tags / Placeholders */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Available Dynamic Placeholders</label>
              <span className="text-[10px] text-slate-400">Click any placeholder to append to template body</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['{{customer_name}}', '{{invoice_number}}', '{{grand_total}}', '{{due_date}}', '{{company_name}}', '{{payment_amount}}'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold transition cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Active Template Editor */}
          {activeTemplateTab === 'invoice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={emailInvoiceSubject}
                  onChange={(e) => setEmailInvoiceSubject(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Message Body</label>
                <textarea
                  rows="6"
                  value={emailInvoiceBody}
                  onChange={(e) => setEmailInvoiceBody(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                ></textarea>
              </div>
            </div>
          )}

          {activeTemplateTab === 'receipt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={emailReceiptSubject}
                  onChange={(e) => setEmailReceiptSubject(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Message Body</label>
                <textarea
                  rows="6"
                  value={emailReceiptBody}
                  onChange={(e) => setEmailReceiptBody(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                ></textarea>
              </div>
            </div>
          )}

          {activeTemplateTab === 'reminder' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={emailReminderSubject}
                  onChange={(e) => setEmailReminderSubject(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Message Body</label>
                <textarea
                  rows="6"
                  value={emailReminderBody}
                  onChange={(e) => setEmailReminderBody(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                ></textarea>
              </div>
            </div>
          )}

          {/* Live Simulator Preview */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Live Merged Simulator Preview
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs space-y-2 shadow-2xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                Subject: {
                  (activeTemplateTab === 'invoice' ? emailInvoiceSubject : activeTemplateTab === 'receipt' ? emailReceiptSubject : emailReminderSubject)
                    .replace('{{customer_name}}', 'Vikram Deshmukh')
                    .replace('{{invoice_number}}', `${invoicePrefix}1001${invoiceSuffix}`)
                    .replace('{{grand_total}}', '1,416.00')
                    .replace('{{due_date}}', '15-Dec-2026')
                    .replace('{{company_name}}', companyName || 'SSJ Tech Solutions Pvt Ltd')
                    .replace('{{payment_amount}}', '1,416.00')
                }
              </div>
              <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-[11px]">
                {
                  (activeTemplateTab === 'invoice' ? emailInvoiceBody : activeTemplateTab === 'receipt' ? emailReceiptBody : emailReminderBody)
                    .replace(/{{customer_name}}/g, 'Vikram Deshmukh')
                    .replace(/{{invoice_number}}/g, `${invoicePrefix}1001${invoiceSuffix}`)
                    .replace(/{{grand_total}}/g, '1,416.00')
                    .replace(/{{due_date}}/g, '15-Dec-2026')
                    .replace(/{{company_name}}/g, companyName || 'SSJ Tech Solutions Pvt Ltd')
                    .replace(/{{payment_amount}}/g, '1,416.00')
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Data Backup & Instant Export Center (SSJ Standard) */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Database className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Data Backup & Instant Export Center</h2>
                <p className="text-[11px] text-slate-500">Safeguard your business records with 1-click comprehensive JSON and CSV database backups</p>
              </div>
            </div>
          </div>

          {backupExportSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Full organization backup package downloaded successfully!</span>
            </div>
          )}

          {/* Master 1-Click JSON Backup */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Full Organization JSON Snapshot</h3>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  Includes complete relational data: business profile, team users, customers, catalog items, tax invoices, payments, estimates & credit notes.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isExportingBackup}
                onClick={handleDownloadBackup}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingBackup ? 'Packaging Backup...' : 'Download Complete Backup (.json)'}</span>
              </button>
              <span className="text-[10px] text-indigo-300">
                Encrypted snapshot formatted for offline archiving or one-click disaster recovery
              </span>
            </div>
          </div>

          {/* Sectioned CSV Quick Exports */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
              Sectional Tabular Exports (Spreadsheet / CSV)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Invoices & Payments</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Tax invoice ledgers, GST breakdown, payment receipts, and balance due records.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Invoices</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Customer Ledger</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Customer directory, state codes, GSTIN numbers, contact details, and balances.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Customers</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Items & Catalog</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Product list, HSN/SAC codes, standard selling rates, and default GST tax tiers.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Items</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700">Statutory Compliance Note:</strong> Backup payloads are generated in real-time strictly from your tenant database partition. Under Section 36 of the Indian CGST Act, accounting records and invoice data must be retained for at least 72 months (6 years).
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Users & Roles (Multi-User Team Management) */}
      {activeTab === 'team' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Organization Staff & Access Control</h2>
                <p className="text-[11px] text-slate-500">Manage business administrators, accountants, and staff invoicers</p>
              </div>
            </div>

            <button
              onClick={() => {
                setInviteError('');
                setIsInviteModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Business Admin / Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No additional staff members found. Click "Add Staff Member" to invite your team.
                    </td>
                  </tr>
                ) : (
                  teamMembers.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {m.full_name ? m.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <span>{m.full_name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {m.email}
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                          className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="BUSINESS_ADMIN">Business Admin</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="STAFF">Staff / Invoicer</option>
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {m.created_at ? m.created_at.split(' ')[0] : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteMember(m.id, m.full_name)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove team member"
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
        </div>
      )}

      {/* TAB 5: Activity & Audit Trail */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <History className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Organization Audit Trail</h2>
                <p className="text-[11px] text-slate-500">Immutable ledger of administrative actions and updates</p>
              </div>
            </div>

            <button
              onClick={fetchLogs}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No audit logs recorded for this organization yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      By {log.user_email || 'System'} {log.details ? `• ${log.details}` : ''}
                    </div>
                  </div>
                  <div className="text-slate-400 text-[11px] whitespace-nowrap font-mono">
                    {log.created_at}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add Staff Member */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Add Business Admin / Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Grant administrative or staff access to this organization workspace</p>

            {inviteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 font-semibold">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Priya Nair"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="priya@company.com"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Access Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="BUSINESS_ADMIN">Business Admin (Full Access)</option>
                    <option value="ACCOUNTANT">Accountant (Taxes & Reports)</option>
                    <option value="STAFF">Staff (Invoicer)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSubmittingMember ? 'Adding...' : 'Add Business Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
