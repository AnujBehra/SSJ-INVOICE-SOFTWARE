const API_BASE = '/api/v1';

function getHeaders(custom = {}) {
  const token = localStorage.getItem('ledgerpulse_token') || localStorage.getItem('ssj_token');
  const headers = {
    'Content-Type': 'application/json',
    ...custom
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers)
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API Request Failed');
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.text();
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  // SaaS & SuperAdmin
  getPlans: () => request('/saas/plans'),
  checkoutPlan: (payload) => request('/saas/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  getSuperAdminMetrics: () => request('/saas/superadmin/metrics'),
  getSuperAdminTenants: () => request('/saas/superadmin/tenants'),
  updateTenantStatus: (id, payload) => request(`/saas/superadmin/tenants/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Business Settings
  getBusinessSettings: () => request('/business/settings'),
  updateBusinessSettings: (payload) => request('/business/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (payload) => request('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (id, payload) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Items Catalog
  getItems: () => request('/items'),
  createItem: (payload) => request('/items', { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (id, payload) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: () => request('/invoices'),
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (payload) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  recordPayment: (id, payload) => request(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  getInvoicePdfUrl: (id) => `${API_BASE}/invoices/${id}/pdf`,
  getThermalReceiptUrl: (id) => `${API_BASE}/invoices/${id}/thermal`,
  getPublicInvoice: (id) => request(`/invoices/public/${id}`),

  // Estimates / Quotes
  getEstimates: () => request('/estimates'),
  getEstimate: (id) => request(`/estimates/${id}`),
  createEstimate: (payload) => request('/estimates', { method: 'POST', body: JSON.stringify(payload) }),
  convertEstimate: (id) => request(`/estimates/${id}/convert`, { method: 'POST' }),

  // Credit Notes
  getCreditNotes: () => request('/credit-notes'),
  createCreditNote: (payload) => request('/credit-notes', { method: 'POST', body: JSON.stringify(payload) }),

  // Delivery Challans
  getDeliveryChallans: () => request('/delivery-challans'),
  createDeliveryChallan: (payload) => request('/delivery-challans', { method: 'POST', body: JSON.stringify(payload) }),

  // Expenses
  getExpenses: () => request('/expenses'),
  createExpense: (payload) => request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Reports
  getGstr1: (month, year) => request(`/reports/gstr1?month=${month}&year=${year}`),
  getGstr3b: (month, year) => request(`/reports/gstr3b?month=${month}&year=${year}`),
  getAgingReport: () => request('/reports/aging'),
  getSalesRegister: () => request('/reports/sales-register'),

  // Online Payment Gateways (Razorpay & Stripe)
  createRazorpayOrder: (invoiceId, amount) => request('/payments/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, amount })
  }),
  verifyRazorpayPayment: (payload) => request('/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  createStripeSession: (invoiceId, amount, customerEmail) => request('/payments/stripe/create-session', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, amount, customerEmail })
  }),
  confirmStripePayment: (payload) => request('/payments/stripe/confirm', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
