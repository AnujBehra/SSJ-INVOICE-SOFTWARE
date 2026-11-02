-- =====================================================================
-- SSJ InvoicePro - Production MySQL 8.0 Schema DDL
-- Hostinger VPS / Nginx Deployment
-- Relational MySQL 8.0 schema enforcing strict foreign key constraints
-- and multi-tenant isolation
-- =====================================================================

CREATE DATABASE IF NOT EXISTS ssj_invoicepro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ssj_invoicepro;

-- 1. SaaS Platform Subscription Plans
CREATE TABLE IF NOT EXISTS saas_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  max_invoices_per_month INT DEFAULT -1, -- -1 = Unlimited
  has_dynamic_qr BOOLEAN DEFAULT TRUE,
  has_gst_reports BOOLEAN DEFAULT TRUE,
  has_multi_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Businesses / Tenants Table
CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(15),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  state_code VARCHAR(2) NOT NULL COMMENT 'GST State Code e.g. 27 for Maharashtra',
  address_line1 TEXT,
  city VARCHAR(100),
  pincode VARCHAR(10),
  logo_url TEXT,
  -- Bank & UPI Accounts for Direct Customer Collections
  bank_name VARCHAR(100),
  bank_account_no VARCHAR(50),
  bank_ifsc VARCHAR(20),
  upi_vpa VARCHAR(100) COMMENT 'Tenant UPI ID e.g. business@upi',
  tenant_razorpay_key VARCHAR(255),
  tenant_razorpay_secret VARCHAR(255),
  -- SaaS Subscription Status
  saas_plan_id INT,
  subscription_expires_at TIMESTAMP NULL,
  status ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saas_plan_id) REFERENCES saas_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. System Users & Staff (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN', 'BUSINESS_ADMIN', 'ACCOUNTANT', 'STAFF') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Customer / Client Directory
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  gstin VARCHAR(15),
  email VARCHAR(255),
  phone VARCHAR(20),
  state_code VARCHAR(2) NOT NULL,
  billing_address TEXT,
  shipping_address TEXT,
  opening_balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Items & Services Master Catalog
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  unit VARCHAR(20) DEFAULT 'Pcs',
  hsn_sac_code VARCHAR(10),
  sales_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00, -- e.g. 5.00, 12.00, 18.00, 28.00
  stock_quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Invoice Header Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  customer_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  cgst_amount DECIMAL(12,2) DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) DEFAULT 0.00,
  igst_amount DECIMAL(12,2) DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0.00,
  upi_qr_string TEXT,
  status ENUM('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED') DEFAULT 'DRAFT',
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  item_id INT NULL,
  item_name VARCHAR(255) NOT NULL,
  hsn_sac_code VARCHAR(10),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'Pcs',
  unit_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  cgst_amount DECIMAL(12,2) DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) DEFAULT 0.00,
  igst_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Estimates Header
CREATE TABLE IF NOT EXISTS estimates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  customer_id INT NOT NULL,
  estimate_number VARCHAR(50) NOT NULL,
  estimate_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  cgst_amount DECIMAL(12,2) DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) DEFAULT 0.00,
  igst_amount DECIMAL(12,2) DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL,
  status ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED') DEFAULT 'DRAFT',
  converted_invoice_id INT NULL,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Payments Ledger
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode ENUM('UPI', 'BANK_TRANSFER', 'CASH', 'RAZORPAY', 'CHEQUE') DEFAULT 'UPI',
  reference_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(255),
  expense_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_mode VARCHAR(50) DEFAULT 'BANK_TRANSFER',
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
