# ⚡ SSJ Invoice — Enterprise Multi-Tenant SaaS Billing & Invoicing Engine

**Benchmark Standard:** Autonomous Multi-Tenant GST Invoicing, Zero-Cost NPCI UPI Rails & Statutory ERP SaaS.

---

## 🚀 Key Modules & Capabilities

1. **Multi-Tenant SaaS Subscriptions**:
   - SuperAdmin platform portal with tiered subscription plans (**Free Trial**, **Starter**, **Professional**, **Enterprise**).
   - Automated billing locks upon expiration, invoice quota enforcement, and live Monthly Recurring Revenue (MRR) metrics.
2. **Zero-Cost Dynamic NPCI UPI QR Engine**:
   - Generates dynamic NPCI-compliant payment QR codes directly inside PDF/print invoices using tenant's VPA (`merchant@upi`) and invoice amount at **₹0 gateway fees**.
   - Direct funds settlement to tenant's bank account with mobile UPI deep linking (`upi://pay?...`).
3. **Invoices, Estimates & Credit Notes**:
   - Full billing lifecycle: 1-Click Convert Estimates (Quotes) into Invoices, credit notes, and delivery challans (GST Rule 55).
   - Partial payment recording with real-time balance tracking and dynamic UPI QR regeneration.
4. **Automated GST & HSN/SAC Engine**:
   - Automated tax splitting: **Intra-state (CGST 50% + SGST 50%)** vs **Inter-state (IGST 100%)** based on Place of Supply (POS) and item HSN tax slabs (0%, 5%, 12%, 18%, 28%).
5. **Client Directory & Self-Service Portal**:
   - Multi-currency customer records, GSTIN validation, and full running ledger statements.
   - Public Client Portal where customers view invoices, download vector PDFs, and scan UPI QR to pay directly.
6. **Expenses, Bills & Statutory GST Reports**:
   - Ready-to-file **GSTR-1** JSON export for direct upload to GST Portal (Table 4 B2B, Table 5 B2CL, Table 7 B2CS, Table 12 HSN Summary).
   - **GSTR-3B** tax liability & eligible Input Tax Credit (ITC) offset matrix.
   - Sales Register & Invoice Aging reports (Current, 1-30 days, 31-60 days, 60+ days).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | React 19 (Vite) + Tailwind CSS + Lucide Icons (Executive Enterprise SPA) |
| **Backend API** | Node.js (Express.js), JWT Auth, Role-based Access Control, Row-Level Isolation |
| **Database** | SQLite 3 (WAL mode) for instant zero-dependency execution + Production MySQL 8.0 DDL (`server/database/schema.mysql.sql`) |
| **Payment QR Engine** | `qrcode` + NPCI URI Builder (`upi://pay?pa=...`) |
| **Vector PDF Generation** | High-fidelity printable vector HTML/CSS A4 Tax Invoice engine + 3" Thermal POS Receipts |
| **Background Cron** | `node-cron` & Vercel Crons for automated daily subscription expiration audits & billing locks |

---

## 🔑 Demo Access Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Tenant Admin** | `anuj@valerianlabs.com` / `demo@zenithcloud.com` | `Password123!` / `demo123` | Full Billing, Invoicing, Customers, Reports |
| **SuperAdmin** | `superadmin@invoicepro.com` | `admin123` | Platform Revenue (MRR), Tenant Locks, Subscription Tiers |

---

## 🏃 Quick Start Guide

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Seed Database
```bash
cd server
npm run seed
```

### 3. Build & Run Application
```bash
# Production Build & Start
npm run build
npm start
```
The server will be available at `http://localhost:5001`.

---

## ☁️ Deployment

### Vercel Deployment
```bash
vercel --prod
```

### Hostinger / Ubuntu VPS Deployment Sequence

```bash
# 1. Update VPS & Install Node.js, Nginx, PM2
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server
sudo npm install -g pm2

# 2. Setup MySQL Production Database (if using MySQL)
mysql -u root -p < /var/www/ssj-invoice/server/database/schema.mysql.sql

# 3. Build Client & Start SSJ Invoice App with PM2
cd /var/www/ssj-invoice/client && npm install && npm run build
cd /var/www/ssj-invoice/server && npm install
pm2 start src/server.js --name "ssj-invoice-api"
pm2 startup
pm2 save

# 4. Configure Nginx Reverse Proxy & Let's Encrypt SSL
sudo certbot --nginx -d billing.yourdomain.com
```
