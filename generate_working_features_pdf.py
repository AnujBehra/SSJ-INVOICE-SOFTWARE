import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
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

        if self._pageNumber > 1:
            self.drawString(54, 800, "SSJ INVOICE™ — Functional Audit & Working Feature Catalog")
            self.drawRightString(541, 800, "Live Production Verification Manual")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 792, 541, 792)

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 541, 45)

        self.drawString(54, 32, "Confidential — SSJ Invoice Complete Working Features Guide")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(541, 32, page_str)
        self.restoreState()


def build_pdf(filename="SSJ_INVOICE_WORKING_FEATURES_CATALOG.pdf"):
    doc = SimpleDocTemplate(
        filename,
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
        fontSize=22,
        leading=26,
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
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
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

    # Title & Metadata
    story.append(Paragraph("SSJ INVOICE™", title_style))
    story.append(Paragraph("Complete Functional Audit & Working Feature Catalog (16 Core Modules)", subtitle_style))

    meta_data = [
        [
            Paragraph("<b>Version:</b> 3.4.0 (Enterprise)", callout_style),
            Paragraph("<b>Deployment:</b> Vercel Production Ready", callout_style),
            Paragraph("<b>Verified Status:</b> 100% Operational", callout_style)
        ],
        [
            Paragraph("<b>Live URL:</b> <font color='#2563EB'><u>https://ssj-invoice.vercel.app</u></font>", callout_style),
            Paragraph("<b>Engine:</b> Node 26 + native node:sqlite", callout_style),
            Paragraph("<b>Compliance:</b> GST Rule 55 & NPCI UPI Rails", callout_style)
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

    # Feature List
    features = [
        ("1. Multi-Tenant Authentication & Role-Based Access Control (RBAC)",
         "Secure stateless login/registration with 4 distinct permission tiers (SUPER_ADMIN, BUSINESS_ADMIN, ACCOUNTANT, STAFF).",
         "Passwords salted via bcryptjs (10 rounds). Tokens use HMAC-SHA256 JWTs carrying tenant claims. Every query enforces WHERE business_id = ?, mathematically preventing cross-tenant data leaks.",
         "Tenant Login: demo@ssjtech.com / demo123. SuperAdmin: superadmin@invoicepro.com / admin123."),
        
        ("2. Executive Real-Time Financial Dashboard",
         "Live business intelligence command center displaying key financial metrics and turnover data.",
         "Aggregates total sales revenue, verified payments collected, pending receivables, and active invoice counts across all business operations in real time.",
         "Navigate to Dashboard; figures update immediately as transactions occur."),

        ("3. Smart GST Tax Invoicing Engine",
         "End-to-end commercial billing with automated Place of Supply (POS) tax determination.",
         "Compares supplier state with customer state: Intra-state splits into 50% CGST + 50% SGST (e.g. 18% = 9% + 9%); Inter-state applies 100% IGST. Manages status transitions from DRAFT to SENT, PARTIAL, and PAID.",
         "Open Invoices -> Create Invoice. Pick a client from Maharashtra vs Delhi to see the tax engine switch between CGST/SGST and IGST."),

        ("4. Zero-Cost Dynamic NPCI UPI QR Rails",
         "Direct bank-to-bank customer settlements with ₹0 payment gateway transaction fees (0% MDR).",
         "Generates vector QR codes compliant with NPCI UPI deep-linking: upi://pay?pa={vpa}&pn={payee}&am={amount}&cu=INR&tn={invoice}. Dynamically recalculates to the exact balance remaining on partial payments.",
         "Click Print/Preview on any invoice; scan the bottom-left QR code with Google Pay, PhonePe, Paytm, or BHIM."),

        ("5. Estimates / Quotations with 1-Click Conversion",
         "Pre-billing sales proposals convertible into official tax invoices in a single click.",
         "Saves quotations with expiry dates. Clicking 'Convert to Invoice' executes an atomic database transaction that transfers all items, taxes, and customer details into a new invoice without duplicate data entry.",
         "Go to Estimates -> click 'Convert to Invoice' on an accepted quote; redirects to Invoices with the new tax invoice."),

        ("6. Delivery Challans (Statutory GST Rule 55)",
         "Statutory goods transport slips accompanying goods dispatched for reasons other than immediate sale.",
         "Formats official transit manifests capturing Transporter ID, Vehicle Registration Numbers, and itemized quantities for job work, exhibitions, or trials, preventing vehicle confiscation during transport.",
         "Open Delivery Challans in the sidebar to create and print transit dispatch slips."),

        ("7. Credit Notes & Ledger Reconciliation",
         "Formal accounting adjustment documents issued against previous invoices.",
         "Links directly to original invoice numbers, automatically debits customer accounts receivable, and updates the client's running ledger statement.",
         "Open Credit Notes -> Issue Credit Note, select an invoice, enter return amount, and view ledger balance reduction."),

        ("8. Client Directory & Real-Time Financial Ledger",
         "Master client address book with automated running debit/credit statements.",
         "Tracks customer GSTINs, billing addresses, and state codes. Ledger dynamically computes: Opening Balance + Invoices Issued - Payments Received - Credit Notes = Net Balance Due.",
         "Go to Customers -> click 'Ledger' next to any client to inspect full transaction history and running balance."),

        ("9. Products & Services Master Catalog",
         "Centralized catalog repository for inventory and billable services.",
         "Stores Item Name, Unit (Pcs, Box, Kg, Mtr, Nos), HSN/SAC codes, Selling Prices, Default GST Tax Rates (0%, 5%, 12%, 18%, 28%), and Stock Levels. Auto-completes on invoices.",
         "Navigate to Items & Services to add or edit catalog items."),

        ("10. Multi-Mode Payment Recording",
         "Record incoming customer payments across multiple transaction channels.",
         "Supports UPI, Bank Transfer (NEFT/RTGS/IMPS), Cash, Cheque, and Card. Auto-updates invoice status to PAID or PARTIAL and recalculates outstanding balances.",
         "On any unpaid invoice, click Record Payment, enter payment amount, and see status update immediately."),

        ("11. Operating Expense Management & Input Tax Credit (ITC)",
         "Track operational expenditures (office rent, cloud servers, hardware) and compute tax write-offs.",
         "Records vendor GSTINs and tax paid on purchases. These input taxes are fed into GSTR-3B to offset Output Tax Liability, lowering net tax payable to the government.",
         "Open Expenses -> log an operational expense with GST to track Input Tax Credit deductions."),

        ("12. Statutory GST Tax Reports & Govt JSON Export",
         "Automated tax filing registers for GSTR-1 and GSTR-3B compliance.",
         "GSTR-1 JSON Generator creates the exact schema required by gst.gov.in covering Table 4 (B2B), Table 7 (B2C), Table 9B (Credit Notes), and Table 12 (HSN Summary). GSTR-3B provides net tax payable matrices.",
         "Navigate to GST Reports -> click 'Download GSTR-1 JSON' to export the official file for tax accountants."),

        ("13. Public Client Billing & Payment Portal",
         "Shareable, mobile-responsive billing links for clients (/public/invoice/:id).",
         "Clients open the link via WhatsApp or SMS without needing an account to review items, download invoice PDFs, or scan/tap the Dynamic UPI QR code directly on their smartphones.",
         "Click 'Copy Public Link' on any invoice and open in an incognito window or mobile browser."),

        ("14. SaaS Platform SuperAdmin Console (/superadmin)",
         "Platform-wide governance and monetization engine for the platform operator.",
         "Tracks platform Monthly Recurring Revenue (MRR), lists all tenant businesses with Suspend/Activate controls, and features a 1-click Plan Assignment Dropdown (Free, Pro, Enterprise) plus +30d / +1 Year validity extensions.",
         "Log in with superadmin@invoicepro.com / admin123 to open the SuperAdmin console."),

        ("15. SaaS Subscription Tiering & Quota Enforcement",
         "Tiered monetization with automated quota controls: Free (10 inv/mo), Pro (₹499/mo unlimited + dynamic QR), and Enterprise (₹4,999/yr multi-user).",
         "Backend middleware checks invoice limits before creation. Nightly cron job audits expiration dates and locks expired accounts gracefully.",
         "Click the Crown / Plan Badge in the top navigation bar to view and upgrade plans."),

        ("16. Professional A4 & Thermal Print Engine",
         "High-resolution, tax-compliant invoice printing for standard and retail setups.",
         "Uses CSS @media print rules to strip headers, navigation bars, and buttons during printing, outputting clean A4 sheets or 80mm thermal POS receipts with logo, bank details, terms, and dynamic UPI QR.",
         "Open any invoice and click 'Print Invoice' (or press CMD+P / CTRL+P).")
    ]

    for title, what, how, test in features:
        story.append(Paragraph(f"<b>{title}</b>", h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=4))
        story.append(Paragraph(f"• <b>What It Does:</b> {what}", body_style))
        story.append(Paragraph(f"• <b>How It Works:</b> {how}", body_style))
        story.append(Paragraph(f"• <b>How to Test Live:</b> <font color='#1E40AF'><u>{test}</u></font>", body_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # Verification Table
    story.append(Paragraph("Live Production Verification & Test Accounts", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=6))

    cred_data = [
        [Paragraph("Account Role", table_header_style), Paragraph("Login Email", table_header_style), Paragraph("Password", table_header_style), Paragraph("Target Environment & Capabilities", table_header_style)],
        [
            Paragraph("<b>Demo Business Admin</b>", table_cell_bold),
            Paragraph("<code>demo@ssjtech.com</code>", table_cell_style),
            Paragraph("<code>demo123</code>", table_cell_style),
            Paragraph("Business workspace: Invoicing, UPI QR, client ledgers, quotes, challans, settings.", table_cell_style)
        ],
        [
            Paragraph("<b>Super Administrator</b>", table_cell_bold),
            Paragraph("<code>superadmin@invoicepro.com</code>", table_cell_style),
            Paragraph("<code>admin123</code>", table_cell_style),
            Paragraph("Platform console: Global MRR metrics, tenant accounts, 1-click plan dropdown.", table_cell_style)
        ]
    ]
    cred_table = Table(cred_data, colWidths=[110, 140, 80, 157])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(cred_table)

    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "<b>Live Production URL:</b> <font color='#2563EB'><u>https://ssj-invoice.vercel.app</u></font><br/>"
        "<b>GitHub Repository:</b> <font color='#2563EB'><u>https://github.com/AnujBehra/SSJ-INVOICE-SOFTWARE.git</u></font><br/>"
        "<b>Deployment Platform:</b> Vercel Fluid Serverless Platform (Node 26.x + native node:sqlite)",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✓ Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_file = "SSJ_INVOICE_WORKING_FEATURES_CATALOG.pdf"
    if len(sys.argv) > 1:
        out_file = sys.argv[1]
    build_pdf(out_file)
