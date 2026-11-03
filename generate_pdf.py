import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to compute dynamic total pages ('Page X of Y')
    with running header and footer rules.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Don't draw running header on cover (Page 1)
        if self._pageNumber > 1:
            self.drawString(54, 800, "SSJ INVOICE™ — Enterprise SaaS Billing & Statutory ERP")
            self.drawRightString(541, 800, "Complete Master Manual & Technical Dossier")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 792, 541, 792)

        # Running Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 541, 45)

        self.drawString(54, 32, "Confidential — SSJ Invoice System Architecture & Presentation Pitch Deck")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(541, 32, page_str)
        self.restoreState()


def build_master_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2563EB'),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ==========================================
    # COVER / HEADER BANNER
    # ==========================================
    story.append(Paragraph("SSJ INVOICE™", title_style))
    story.append(Paragraph("Enterprise Cloud Multi-Tenant SaaS Billing, Invoicing & Statutory ERP", subtitle_style))

    meta_data = [
        [
            Paragraph("<b>Version:</b> 3.4.0 (Enterprise)", callout_style),
            Paragraph("<b>Status:</b> Production Live (Vercel)", callout_style),
            Paragraph("<b>Node Engine:</b> Node 26.x + native node:sqlite", callout_style)
        ],
        [
            Paragraph("<b>Live URL:</b> <font color='#2563EB'><u>https://ssj-invoice.vercel.app</u></font>", callout_style),
            Paragraph("<b>Compliance:</b> GST Rule 55 & NPCI UPI", callout_style),
            Paragraph("<b>Architecture:</b> Jamstack Serverless Microservices", callout_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[162, 162, 163])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # 1. EXECUTIVE SUMMARY & VALUE PROPOSITION
    # ==========================================
    story.append(Paragraph("1. Executive Summary & Core Value Proposition", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))
    
    pitch = (
        "<b>SSJ INVOICE™</b> is an enterprise-grade, multi-tenant Cloud SaaS platform built to automate end-to-end "
        "commercial billing, statutory GST compliance, zero-gateway-cost NPCI UPI digital payments, and real-time "
        "customer financial ledgers for modern businesses and enterprises. "
        "Built on a modern serverless architecture, the software delivers sub-second cold starts and automated CI/CD from GitHub to Vercel."
    )
    story.append(Paragraph(pitch, body_style))

    diff_box = [[
        Paragraph(
            "<b>Key Competitive Differentiator — Zero-MDR Direct Payment Rails:</b><br/>"
            "Traditional ERP billing systems require third-party payment gateways (Razorpay, Stripe) deducting 2% to 3% in "
            "Merchant Discount Rates (MDR). SSJ INVOICE features an autonomous Dynamic NPCI UPI QR code engine. "
            "Invoices automatically generate vector QR codes pre-filled with the exact balance due. Customers scan and pay directly "
            "via Google Pay, PhonePe, Paytm, or BHIM into the merchant's bank account with <b>₹0 gateway fees and immediate bank settlement</b>.",
            callout_style
        )
    ]]
    diff_table = Table(diff_box, colWidths=[487])
    diff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#3B82F6')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(diff_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # 2. COMPLETE TECHNOLOGY STACK
    # ==========================================
    story.append(Paragraph("2. Full Technology Stack & Architectural Decisions", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    tech_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology & Version", table_header_style), Paragraph("Role & Production Benefit", table_header_style)],
        [Paragraph("<b>Frontend SPA</b>", table_cell_bold), Paragraph("React 19.0.0", table_cell_style), Paragraph("Concurrent rendering, hook-driven optimistic state, zero full-page reloads.", table_cell_style)],
        [Paragraph("<b>Build Tooling</b>", table_cell_bold), Paragraph("Vite 6.1.0", table_cell_style), Paragraph("Native ESM bundling, sub-100ms HMR, optimized tree-shaken production bundles.", table_cell_style)],
        [Paragraph("<b>Design System</b>", table_cell_bold), Paragraph("Tailwind CSS v4.0", table_cell_style), Paragraph("Modern CSS tokens, responsive layouts, glassmorphism, enterprise spacing.", table_cell_style)],
        [Paragraph("<b>Backend Runtime</b>", table_cell_bold), Paragraph("Node.js 26.x LTS", table_cell_style), Paragraph("High-throughput asynchronous runtime matching Vercel Serverless.", table_cell_style)],
        [Paragraph("<b>API Engine</b>", table_cell_bold), Paragraph("Express.js 4.21.2", table_cell_style), Paragraph("Modular REST microservices, route-level JWT auth guards, error boundaries.", table_cell_style)],
        [Paragraph("<b>Database Engine</b>", table_cell_bold), Paragraph("Native node:sqlite", table_cell_style), Paragraph("Built into Node standard library. Eliminates C++ node-gyp build steps for instant cold starts.", table_cell_style)],
        [Paragraph("<b>Auth & Security</b>", table_cell_bold), Paragraph("JWT + bcryptjs", table_cell_style), Paragraph("Stateless HMAC-SHA256 bearer tokens with 10 salt rounds for password hashes.", table_cell_style)],
        [Paragraph("<b>UPI QR Generator</b>", table_cell_bold), Paragraph("QRCode 1.5.4", table_cell_style), Paragraph("Dynamic vector and DataURL QR rendering compliant with NPCI UPI 2.0 specs.", table_cell_style)],
        [Paragraph("<b>Cloud Platform</b>", table_cell_bold), Paragraph("Vercel Serverless", table_cell_style), Paragraph("Fluid compute, automated GitHub CI/CD, global CDN edge distribution.", table_cell_style)]
    ]
    tech_table = Table(tech_data, colWidths=[90, 120, 277])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(tech_table)

    story.append(PageBreak())

    # ==========================================
    # 3. STATUTORY TERMINOLOGY & DOMAIN RULES
    # ==========================================
    story.append(Paragraph("3. Statutory Terminology & Indian GST Domain Rules", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    terms_data = [
        [Paragraph("Statutory / Domain Term", table_header_style), Paragraph("Definition & System Implementation", table_header_style)],
        [Paragraph("<b>Multi-Tenancy</b>", table_cell_bold), Paragraph("Logical database partitioning where multiple business accounts share a single software instance while remaining strictly isolated via <code>business_id</code> foreign key constraints.", table_cell_style)],
        [Paragraph("<b>GSTIN (15 Digits)</b>", table_cell_bold), Paragraph("Goods and Services Tax Identification Number (e.g., <code>27AAPCU9603R1ZV</code>). The first 2 characters denote State Code (<code>27</code> = Maharashtra), which drives automatic tax determination.", table_cell_style)],
        [Paragraph("<b>Intra-State Supply</b>", table_cell_bold), Paragraph("Supplier State == Customer State. Automatically splits the tax into 50% <b>CGST</b> (Central GST) and 50% <b>SGST</b> (State GST). e.g., 18% rate = 9% CGST + 9% SGST.", table_cell_style)],
        [Paragraph("<b>Inter-State Supply</b>", table_cell_bold), Paragraph("Supplier State != Customer State. Automatically charged as a single 100% <b>IGST</b> (Integrated GST) line item.", table_cell_style)],
        [Paragraph("<b>HSN & SAC Codes</b>", table_cell_bold), Paragraph("<b>HSN</b> (Harmonized System of Nomenclature) for physical goods; <b>SAC</b> (Services Accounting Code) for service items. Enforced across catalog items and rendered on statutory tax printouts.", table_cell_style)],
        [Paragraph("<b>Dynamic NPCI UPI QR</b>", table_cell_bold), Paragraph("Zero-cost payment protocol generating deep-link strings: <code>upi://pay?pa={vpa}&pn={name}&am={due}&cu=INR&tn={inv}</code>. Allows direct customer payment at 0% MDR transaction fees.", table_cell_style)],
        [Paragraph("<b>Delivery Challan (Rule 55)</b>", table_cell_bold), Paragraph("Statutory transport dispatch document accompanying goods transported for reasons other than immediate sale (job work, supply on approval, inter-branch transfer) in compliance with GST Rule 55.", table_cell_style)],
        [Paragraph("<b>Credit Note</b>", table_cell_bold), Paragraph("Formal credit instrument issued to reduce receivable balances when customers return items, post-sale discounts are granted, or billing corrections occur.", table_cell_style)],
        [Paragraph("<b>Customer Running Ledger</b>", table_cell_bold), Paragraph("Real-time balance computation showing running financial history: <code>Total Invoices - Payments Received - Credit Notes = Net Balance Due</code>.", table_cell_style)],
        [Paragraph("<b>MRR</b>", table_cell_bold), Paragraph("Monthly Recurring Revenue: Key SaaS subscription metric aggregating monthly subscription fees across all active paid tenant accounts on the platform.", table_cell_style)]
    ]
    terms_table = Table(terms_data, colWidths=[150, 337])
    terms_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(terms_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # 4. MULTI-TENANT ROLE HIERARCHY
    # ==========================================
    story.append(Paragraph("4. Multi-Tenant Role Hierarchy & Access Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    roles_data = [
        [Paragraph("Role", table_header_style), Paragraph("System Scope", table_header_style), Paragraph("Database Scope", table_header_style), Paragraph("Core Permissions & Capabilities", table_header_style)],
        [
            Paragraph("<b>SUPER_ADMIN</b>", table_cell_bold),
            Paragraph("Platform-wide", table_cell_style),
            Paragraph("<code>business_id = NULL</code>", table_cell_style),
            Paragraph("Global governance: monitors total MRR, inspects all tenant companies, suspends/activates tenants, assigns SaaS plans directly via 1-click console dropdown.", table_cell_style)
        ],
        [
            Paragraph("<b>BUSINESS_ADMIN</b>", table_cell_bold),
            Paragraph("Single Tenant", table_cell_style),
            Paragraph("Tied to <code>business_id</code>", table_cell_style),
            Paragraph("Company Owner / Director: full control over company profile, GSTIN, bank details, UPI VPA, staff creation, invoice generation, customer ledgers, and SaaS tier upgrades.", table_cell_style)
        ],
        [
            Paragraph("<b>ACCOUNTANT</b>", table_cell_bold),
            Paragraph("Single Tenant", table_cell_style),
            Paragraph("Tied to <code>business_id</code>", table_cell_style),
            Paragraph("Financial compliance: full access to invoices, payments, ledgers, and statutory GST reports (GSTR-1, GSTR-3B). Cannot alter company ownership or bank credentials.", table_cell_style)
        ],
        [
            Paragraph("<b>STAFF</b>", table_cell_bold),
            Paragraph("Single Tenant", table_cell_style),
            Paragraph("Tied to <code>business_id</code>", table_cell_style),
            Paragraph("Frontline sales: prepares estimates/quotes, generates draft invoices, and issues Rule 55 delivery challans. Cannot export statutory tax reports or view master ledgers.", table_cell_style)
        ]
    ]
    roles_table = Table(roles_data, colWidths=[90, 75, 95, 227])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(roles_table)

    story.append(PageBreak())

    # ==========================================
    # 5. HOW PLANS ARE ASSIGNED
    # ==========================================
    story.append(Paragraph("5. Plan Assignment Workflows (SaaS Plans & Client Retainers)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    story.append(Paragraph("<b>Level 1: Assigning SaaS Subscription Plans to Businesses (Tenants)</b>", h2_style))
    story.append(Paragraph(
        "• <b>Automatic Default on Signup:</b> When a new business registers, the system assigns them the <b>Free Plan</b> "
        "(max 10 invoices/mo) with an initial active 30-day trial automatically.<br/>"
        "• <b>Direct Assignment by SuperAdmin (1-Click Dropdown):</b> The SuperAdmin logs into <code>/superadmin</code>, "
        "navigates to the Tenant Organizations Directory, and selects <i>Free Plan</i>, <i>Pro Plan (Monthly)</i>, or <i>Enterprise (Yearly)</i> "
        "directly from the interactive dropdown. The change takes effect immediately without needing payment gateway processing.<br/>"
        "• <b>Self-Service Upgrade by Business Admin:</b> Business owners can click the <b>Crown / Plan Badge</b> in the top navigation bar "
        "to open the SaaS Plans view and upgrade to Pro (₹499/mo) or Enterprise (₹4,999/yr) at any time.",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Level 2: Assigning Recurring Billing Plans / Retainers to End-Clients</b>", h2_style))
    story.append(Paragraph(
        "To bill a client on a recurring schedule (e.g., ₹5,000 Monthly Retainer or Annual Maintenance Contract):<br/>"
        "1. Open <b>Recurring Invoices</b> from the sidebar and click <b>New Recurring Schedule</b>.<br/>"
        "2. Select the client from your Customer Directory.<br/>"
        "3. Choose the frequency (<code>MONTHLY</code>, <code>QUARTERLY</code>, <code>YEARLY</code>) and select the service items.<br/>"
        "4. Set the Next Run Date and toggle <i>Auto-Generate</i>. The backend cron scheduler will automatically generate and dispatch the tax invoice on each billing cycle.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ==========================================
    # 6. ALL OTHER STUFF (ADVANCED CAPABILITIES)
    # ==========================================
    story.append(Paragraph("6. Advanced Capabilities, Engines & Architectural Safeguards", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    adv_features = [
        ("Official Govt Portal GSTR-1 JSON Export", 
         "Under GST Reports, the software generates the exact, schema-compliant GSTR-1 JSON file required by the Government of India's tax portal (gst.gov.in) covering Table 4 (B2B), Table 7 (B2C), Table 9B (Credit Notes), and Table 12 (HSN Summary). Tax accountants can download and upload it into the GST offline tool in seconds."),
        ("Public Client Billing & Payment Portal", 
         "Every invoice generates a shareable web link (/public/invoice/:id). Clients open this mobile-responsive portal without logging in to inspect itemized taxes, download invoice PDFs, or scan the Dynamic UPI QR code directly on their smartphones."),
        ("Dynamic QR Partial Balance Recalculation", 
         "When a client makes a partial payment (e.g. ₹5,000 on a ₹15,000 invoice), the invoice status updates to PARTIAL and the embedded UPI QR code dynamically recalculates its payload to request exactly the remaining ₹10,000 balance, preventing over-payments."),
        ("Input Tax Credit (ITC) & Expense Engine", 
         "Track operating expenses (office rent, cloud servers, hardware) along with vendor GSTINs and tax paid. The system automatically computes Input Tax Credit (ITC) to offset Output Tax Liability in the GSTR-3B tax matrix."),
        ("Statutory Delivery Challans (GST Rule 55)", 
         "Generate legally compliant goods transport dispatch documents for job work, exhibitions, trial supplies, or transit without immediate sale, tracking transporter IDs and vehicle numbers to prevent vehicle impoundment."),
        ("Automated Nightly Cron Auditor (node-cron)", 
         "Runs autonomously every night at 00:00 to audit tenant subscription expiration dates, lock expired accounts gracefully, reset monthly invoice quotas for Free tier accounts, and process scheduled recurring invoices."),
        ("Dual Database Engine: SQLite & Enterprise MySQL Path", 
         "Currently runs on native node:sqlite (DatabaseSync) on Vercel with zero database hosting fees. Includes a pre-written, production-grade MySQL/PostgreSQL schema at server/database/schema.mysql.sql for direct cloud scaling."),
        ("Enterprise Security & Anti-IDOR Boundary", 
         "Enforces parameterized SQL queries (preventing SQL injection) and strictly guards every query with WHERE business_id = ? derived from the cryptographic JWT payload, mathematically preventing cross-tenant data leaks.")
    ]

    for title, desc in adv_features:
        story.append(Paragraph(f"<b>• {title}:</b> {desc}", body_style))

    story.append(PageBreak())

    # ==========================================
    # 7. RELATIONAL DATABASE ARCHITECTURE (14 TABLES)
    # ==========================================
    story.append(Paragraph("7. Relational Database Architecture (14 Relational Tables)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    schema_data = [
        [Paragraph("Table Name", table_header_style), Paragraph("Primary Role & Key Fields", table_header_style), Paragraph("Relationships & Foreign Keys", table_header_style)],
        [Paragraph("<code>saas_plans</code>", table_cell_bold), Paragraph("Plan tiers, monthly/yearly pricing, quota limits, dynamic QR flags.", table_cell_style), Paragraph("Referenced by <code>businesses.saas_plan_id</code>", table_cell_style)],
        [Paragraph("<code>businesses</code>", table_cell_bold), Paragraph("Tenant profile: company name, GSTIN, state code, bank details, UPI VPA.", table_cell_style), Paragraph("Root tenant table; foreign keys cascade across all child data.", table_cell_style)],
        [Paragraph("<code>users</code>", table_cell_bold), Paragraph("User directory: full name, email, password hash, role (SUPER_ADMIN, BUSINESS_ADMIN).", table_cell_style), Paragraph("FK to <code>businesses.id</code> (NULL for SuperAdmins)", table_cell_style)],
        [Paragraph("<code>customers</code>", table_cell_bold), Paragraph("Client master: name, company, GSTIN, state code, billing & shipping address.", table_cell_style), Paragraph("FK to <code>businesses.id</code>", table_cell_style)],
        [Paragraph("<code>items</code>", table_cell_bold), Paragraph("Catalog master: item name, unit, HSN/SAC code, sales price, tax rate, stock quantity.", table_cell_style), Paragraph("FK to <code>businesses.id</code>", table_cell_style)],
        [Paragraph("<code>invoices</code>", table_cell_bold), Paragraph("Invoice headers: invoice number, dates, subtotal, CGST, SGST, IGST, total, status, UPI string.", table_cell_style), Paragraph("FK to <code>businesses.id</code> and <code>customers.id</code>", table_cell_style)],
        [Paragraph("<code>invoice_items</code>", table_cell_bold), Paragraph("Line items: item name, HSN/SAC, qty, price, tax rate, tax amounts, line total.", table_cell_style), Paragraph("FK to <code>invoices.id</code> (CASCADE)", table_cell_style)],
        [Paragraph("<code>estimates</code>", table_cell_bold), Paragraph("Quotes/proposals: estimate number, expiry date, totals, status (DRAFT, CONVERTED).", table_cell_style), Paragraph("FK to <code>businesses.id</code> and <code>customers.id</code>", table_cell_style)],
        [Paragraph("<code>estimate_items</code>", table_cell_bold), Paragraph("Estimate line items with unit pricing and tax distributions.", table_cell_style), Paragraph("FK to <code>estimates.id</code> (CASCADE)", table_cell_style)],
        [Paragraph("<code>credit_notes</code>", table_cell_bold), Paragraph("Credit adjustments: credit note number, amount, reason, status (OPEN, APPLIED).", table_cell_style), Paragraph("FK to <code>businesses.id</code>, <code>customers.id</code>, and <code>invoices.id</code>", table_cell_style)],
        [Paragraph("<code>delivery_challans</code>", table_cell_bold), Paragraph("Statutory transport goods dispatch records adhering to GST Rule 55.", table_cell_style), Paragraph("FK to <code>businesses.id</code> and <code>customers.id</code>", table_cell_style)],
        [Paragraph("<code>payments</code>", table_cell_bold), Paragraph("Payment ledger: date, amount, mode (UPI, BANK, CASH), reference number.", table_cell_style), Paragraph("FK to <code>businesses.id</code> and <code>invoices.id</code>", table_cell_style)],
        [Paragraph("<code>expenses</code>", table_cell_bold), Paragraph("Operating expenditures tracking vendor name, category, tax amount, and payment mode.", table_cell_style), Paragraph("FK to <code>businesses.id</code>", table_cell_style)],
        [Paragraph("<code>recurring_invoices</code>", table_cell_bold), Paragraph("Automated recurring billing schedules: frequency (MONTHLY, YEARLY), next run date.", table_cell_style), Paragraph("FK to <code>businesses.id</code> and <code>customers.id</code>", table_cell_style)]
    ]
    schema_table = Table(schema_data, colWidths=[110, 205, 172])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # 8. 5-MINUTE LIVE DEMO SEQUENCE
    # ==========================================
    story.append(Paragraph("8. 5-Minute Live Presentation Script & Talking Points", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    demo_steps = [
        [Paragraph("#", table_header_style), Paragraph("Presenter Action", table_header_style), Paragraph("Talking Point & Feature Highlight", table_header_style)],
        [Paragraph("<b>1</b>", table_cell_bold), Paragraph("Log in with <code>demo@ssjtech.com</code> / <code>demo123</code>", table_cell_style), Paragraph("Showcase real-time turnover KPI cards, receivables, and responsive navigation.", table_cell_style)],
        [Paragraph("<b>2</b>", table_cell_bold), Paragraph("Open Catalog & Customer Master", table_cell_style), Paragraph("Demonstrate HSN/SAC master with assigned tax rates and client state profiles.", table_cell_style)],
        [Paragraph("<b>3</b>", table_cell_bold), Paragraph("Create a New Invoice", table_cell_style), Paragraph("Select an interstate customer; show the tax engine automatically switching to 100% IGST in real time.", table_cell_style)],
        [Paragraph("<b>4</b>", table_cell_bold), Paragraph("Inspect Dynamic UPI QR", table_cell_style), Paragraph("Showcase vector UPI QR code pre-filled with exact balance for zero-cost payment.", table_cell_style)],
        [Paragraph("<b>5</b>", table_cell_bold), Paragraph("Record a Partial Payment", table_cell_style), Paragraph("Record ₹5,000 payment; show status change to PARTIAL and QR code recalculating.", table_cell_style)],
        [Paragraph("<b>6</b>", table_cell_bold), Paragraph("Inspect Customer Ledger", table_cell_style), Paragraph("Open Customer Ledger statement to show automated debit/credit running balances.", table_cell_style)],
        [Paragraph("<b>7</b>", table_cell_bold), Paragraph("1-Click Quotation Conversion", table_cell_style), Paragraph("Navigate to Estimates, click 'Convert to Invoice' to show zero re-typing workflow.", table_cell_style)],
        [Paragraph("<b>8</b>", table_cell_bold), Paragraph("SuperAdmin Console: <code>superadmin@invoicepro.com</code>", table_cell_style), Paragraph("Showcase global MRR tracking, tenant directory, and 1-click plan assignment dropdown.", table_cell_style)]
    ]
    demo_table = Table(demo_steps, colWidths=[25, 185, 277])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # 9. PRODUCTION DETAILS & CREDENTIALS
    # ==========================================
    story.append(Paragraph("9. Production Deployment Verification & Credentials", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    infra = (
        "<b>Live Production URL:</b> <font color='#2563EB'><u>https://ssj-invoice.vercel.app</u></font><br/>"
        "<b>Interactive Printable Presentation:</b> <font color='#2563EB'><u>https://ssj-invoice.vercel.app/presentation.html</u></font><br/>"
        "<b>GitHub Repository:</b> <font color='#2563EB'><u>https://github.com/AnujBehra/SSJ-INVOICE-SOFTWARE.git</u></font><br/>"
        "<b>Demo Business Admin:</b> <code>demo@ssjtech.com</code> / <code>demo123</code><br/>"
        "<b>Super Administrator:</b> <code>superadmin@invoicepro.com</code> / <code>admin123</code>"
    )
    story.append(Paragraph(infra, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✓ Master Manual PDF successfully built: {output_path}")

if __name__ == "__main__":
    out_file = "SSJ_INVOICE_MASTER_MANUAL.pdf"
    if len(sys.argv) > 1:
        out_file = sys.argv[1]
    build_master_pdf(out_file)
