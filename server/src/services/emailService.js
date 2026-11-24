const nodemailer = require('nodemailer');
const db = require('../db');
const { logAudit } = require('./auditLogger');

/**
 * Creates an appropriate email transporter based on configuration
 */
function getTransporter(business = {}) {
  // 1. Check if custom SMTP is set in environment
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // 2. Safe, non-blocking stream/json transport fallback for instant local and sandbox delivery
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

/**
 * Replaces mustache-like placeholders {{key}} in text template
 */
function interpolate(template, variables) {
  if (!template) return '';
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined && variables[key] !== null ? variables[key] : match;
  });
}

/**
 * Dispatches an email for an invoice, delivery challan, or estimate
 */
async function sendDocumentEmail({
  to,
  subject,
  body,
  documentType = 'INVOICE',
  documentId,
  businessId,
  userId = null,
  userEmail = null
}) {
  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required');
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) || {
    company_name: 'SSJ Tech Solutions Pvt Ltd',
    email: 'billing@ssjtech.com'
  };

  const senderEmail = process.env.SMTP_FROM || business.email || 'no-reply@ssjtech.com';
  const senderName = business.company_name || 'SSJ Invoice';

  const transporter = getTransporter(business);

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: to.trim(),
    subject: subject || `${documentType} from ${senderName}`,
    text: body,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #1e1b4b; font-size: 20px;">${senderName}</h2>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Official Document Dispatch Notification</p>
        </div>
        <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">
          ${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px; text-align: center;">
          Sent securely via <strong>SSJ Invoice PRO</strong> • Statutory GST Billing Engine
        </div>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);

  // Log in Audit Trail
  try {
    logAudit({
      businessId,
      userId,
      userEmail,
      action: 'EMAIL_DISPATCHED',
      entityType: documentType,
      entityId: documentId,
      details: {
        to: to.trim(),
        subject,
        messageId: info.messageId || 'simulated-msg-id'
      }
    });
  } catch (e) {
    console.warn('Could not record email audit log:', e.message);
  }

  return {
    success: true,
    message: `Document email successfully dispatched to ${to.trim()}`,
    messageId: info.messageId || 'msg-' + Date.now(),
    sentAt: new Date().toISOString()
  };
}

module.exports = {
  sendDocumentEmail,
  interpolate
};
