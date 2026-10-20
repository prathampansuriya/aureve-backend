import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const isConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  if (!isConfigured) {
    logger.warn('[EMAIL SERVICE] SMTP credentials are not fully configured. Outgoing transactional emails will be logged only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    pool: true,
    maxConnections: 5,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  return transporter;
};

/**
 * Common luxury email wrapper template
 */
const renderLuxuryEmailTemplate = ({ title, preheader, contentHtml }) => {
  const logoHtml = env.EMAIL_LOGO_URL && env.EMAIL_LOGO_URL.startsWith('https://')
    ? `
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="${env.EMAIL_LOGO_URL}" alt="AUREVÉ Haute Joaillerie" style="height: 48px; max-width: 180px; object-fit: contain; border: 0; display: inline-block;" />
      </div>
      <h1 class="brand-title" style="margin: 0; font-size: 22px;">AUREVÉ</h1>
    `
    : `<h1 class="brand-title">AUREVÉ</h1>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FDFBF7; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1412; }
    .wrapper { max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border: 1px solid #E8E2D6; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 20px rgba(26, 20, 18, 0.05); }
    .header { padding: 36px 20px 24px; text-align: center; border-bottom: 1px solid #F4EFE6; }
    .brand-title { font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 0.15em; color: #1A1412; margin: 0; text-transform: uppercase; }
    .brand-tagline { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 15px; color: #9E7B47; margin-top: 6px; }
    .content { padding: 40px 32px; font-size: 15px; line-height: 1.7; color: #2A2421; }
    .otp-box { margin: 30px 0; padding: 20px; background-color: #FDFBF7; border: 1px dashed #D4AF37; text-align: center; border-radius: 4px; }
    .otp-code { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #1A1412; margin: 0; }
    .button { display: inline-block; padding: 14px 32px; background-color: #D4AF37; color: #1A1412 !important; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 2px; margin: 24px 0; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #706861; background-color: #FDFBF7; border-top: 1px solid #F4EFE6; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#FDFBF7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="wrapper">
    <div class="header">
      ${logoHtml}
      <p class="brand-tagline">Jewels of Legacy. Crafted for Eternity.</p>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} AUREVÉ Haute Joaillerie. All rights reserved.</p>
      <p style="margin: 0;">This is a confidential communication intended exclusively for the registered recipient.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Dispatches a verification OTP email.
 */
export const sendVerificationOtpEmail = async ({ to, name, otp, expiresMinutes = 10 }) => {
  const mailClient = getTransporter();

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">Welcome to the House of AUREVÉ</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>Thank you for initiating your journey with AUREVÉ. To authenticate your account and ensure the utmost privacy of your bespoke jewellery selections, please use the verification code below:</p>
    
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <p style="margin: 8px 0 0; font-size: 12px; color: #706861;">Valid for ${expiresMinutes} minutes</p>
    </div>

    <p style="font-size: 13px; color: #706861;">If you did not request this verification, please disregard this email. Never disclose this code to anyone, including AUREVÉ concierge specialists.</p>
  `;

  const html = renderLuxuryEmailTemplate({
    title: 'AUREVÉ Account Verification Code',
    preheader: `Your AUREVÉ verification code is ${otp}. Valid for ${expiresMinutes} minutes.`,
    contentHtml
  });

  if (!mailClient) {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Purpose: OTP Verification | OTP: ${otp}`);
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const info = await mailClient.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: `AUREVÉ Verification Code: ${otp}`,
      html
    });
    logger.info(`[EMAIL SENT] Verification OTP dispatched to ${to} (MessageId: ${info.messageId})`);
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL FAILED] Failed to send verification OTP to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

/**
 * Dispatches a password reset email.
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl, expiresMinutes = 60 }) => {
  const mailClient = getTransporter();

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">Password Reset Request</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>We received an official request to reset the password for your AUREVÉ account. To establish a new security credential, please click the link below:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button" target="_blank">Reset Password</a>
    </div>

    <p style="font-size: 13px; color: #706861;">This security link will expire in ${expiresMinutes} minutes. If you did not solicit this reset, your account credentials remain secure, and no further action is required.</p>
    <p style="font-size: 11px; color: #9E7B47; word-break: break-all;">Direct Link: ${resetUrl}</p>
  `;

  const html = renderLuxuryEmailTemplate({
    title: 'Reset Your AUREVÉ Password',
    preheader: 'A request has been made to reset your AUREVÉ account password.',
    contentHtml
  });

  if (!mailClient) {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Purpose: Password Reset | URL: ${resetUrl}`);
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const info = await mailClient.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: 'Reset Your AUREVÉ Account Password',
      html
    });
    logger.info(`[EMAIL SENT] Password reset dispatched to ${to} (MessageId: ${info.messageId})`);
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL FAILED] Failed to send password reset email to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

/**
 * Dispatches a security session notification.
 */
export const sendSecurityAlertEmail = async ({ to, name, alertType, ipAddress, userAgent }) => {
  const mailClient = getTransporter();

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #8B1E1E; margin-top: 0;">Security Alert: ${alertType}</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>We detected an important security action on your AUREVÉ account:</p>
    
    <div style="background-color: #FDFBF7; padding: 16px; border: 1px solid #E8E2D6; border-radius: 4px; font-size: 13px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Action:</strong> ${alertType}</p>
      <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ipAddress || 'Unavailable'}</p>
      <p style="margin: 4px 0;"><strong>Client Environment:</strong> ${userAgent || 'Unknown browser'}</p>
      <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
    </div>

    <p style="font-size: 13px; color: #706861;">If you authorized this activity, you may safely ignore this message. If you do not recognize this event, please immediately contact our concierge at <a href="mailto:concierge@aureve.com" style="color: #D4AF37;">concierge@aureve.com</a> to lock your account.</p>
  `;

  const html = renderLuxuryEmailTemplate({
    title: `AUREVÉ Security Notification: ${alertType}`,
    preheader: `Security alert regarding your AUREVÉ account: ${alertType}`,
    contentHtml
  });

  if (!mailClient) {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Purpose: Security Alert (${alertType})`);
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const info = await mailClient.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: `Security Alert: ${alertType} on your AUREVÉ Account`,
      html
    });
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL FAILED] Failed to send security alert to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

/**
 * Dispatches generic luxury transactional email.
 */
export const sendTransactionalEmail = async ({ to, subject, title, preheader, contentHtml }) => {
  const mailClient = getTransporter();
  const html = renderLuxuryEmailTemplate({
    title: title || subject,
    preheader: preheader || subject,
    contentHtml
  });

  if (!mailClient) {
    logger.info(`[MOCK EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const info = await mailClient.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html
    });
    logger.info(`[EMAIL SENT] Transactional email sent to ${to} (MessageId: ${info.messageId})`);
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL FAILED] Failed to send transactional email to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

/**
 * Dispatches VIP appointment confirmation email.
 */
export const sendAppointmentConfirmationEmail = async ({ to, name, appointment, storeLocation }) => {
  const isVirtual = appointment.appointmentType === 'VIRTUAL_CONSULTATION';
  const locationText = isVirtual
    ? `Virtual VIP Suite (Video Consultation)`
    : `${storeLocation?.name || 'AUREVÉ Haute Showroom'}, ${storeLocation?.addressLine || ''}, ${storeLocation?.city || ''}`;
  const meetingDetail = isVirtual && appointment.meetingLink
    ? `<p style="margin: 6px 0;"><strong>Private Consultation Link:</strong> <a href="${appointment.meetingLink}" style="color: #9E7B47; text-decoration: underline;">Join Video Consultation</a></p>`
    : '';

  const dateFormatted = new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">VIP Consultation Confirmed</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>It is our pleasure to confirm your private jewellery consultation with our master concierge.</p>

    <div style="background-color: #FDFBF7; padding: 20px; border: 1px solid #D4AF37; border-radius: 4px; font-size: 14px; margin: 24px 0;">
      <p style="margin: 6px 0;"><strong>Consultation Format:</strong> ${isVirtual ? 'Virtual Haute Joaillerie Consultation' : 'In-Store Private Salon Experience'}</p>
      <p style="margin: 6px 0;"><strong>Date:</strong> ${dateFormatted}</p>
      <p style="margin: 6px 0;"><strong>Time Slot:</strong> ${appointment.timeSlot} (IST / UTC+5:30)</p>
      <p style="margin: 6px 0;"><strong>Location:</strong> ${locationText}</p>
      ${meetingDetail}
      ${appointment.notes ? `<p style="margin: 6px 0;"><strong>Client Notes:</strong> ${appointment.notes}</p>` : ''}
    </div>

    <p style="font-size: 13px; color: #706861;">Should you require any adjustments or wish to reschedule, please visit your account dashboard or contact your dedicated concierge at <a href="mailto:concierge@aureve.com" style="color: #9E7B47;">concierge@aureve.com</a>.</p>
  `;

  return sendTransactionalEmail({
    to,
    subject: `AUREVÉ Consultation Confirmed — ${appointment.timeSlot}, ${dateFormatted}`,
    title: 'AUREVÉ VIP Consultation Confirmation',
    preheader: `Your private appointment is confirmed for ${dateFormatted} at ${appointment.timeSlot}.`,
    contentHtml
  });
};

/**
 * Dispatches VIP appointment status update email (Cancelled / Rescheduled / Completed).
 */
export const sendAppointmentStatusEmail = async ({ to, name, appointment, status, reason = '' }) => {
  const dateFormatted = new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">Appointment Update: ${status}</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>The status of your scheduled consultation has been updated to <strong>${status}</strong>.</p>

    <div style="background-color: #FDFBF7; padding: 18px; border: 1px solid #E8E2D6; border-radius: 4px; font-size: 13px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Date:</strong> ${dateFormatted}</p>
      <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${appointment.timeSlot} (IST)</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> ${status}</p>
      ${reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>

    <p style="font-size: 13px; color: #706861;">If you have any questions or would like to book a new consultation, our concierge team is at your disposal.</p>
  `;

  return sendTransactionalEmail({
    to,
    subject: `AUREVÉ Appointment Status Update: ${status}`,
    title: `Consultation ${status}`,
    preheader: `Your AUREVÉ consultation has been marked as ${status}.`,
    contentHtml
  });
};

/**
 * Dispatches Order Confirmation Email with itemized receipt.
 */
export const sendOrderConfirmationEmail = async ({ to, name, order }) => {
  const itemsList = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #F4EFE6;">${item.productNameSnapshot || 'Jewellery Masterpiece'}<br><small style="color: #706861;">SKU: ${item.skuSnapshot}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #F4EFE6; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #F4EFE6; text-align: right;">₹${((item.priceSnapshotPaise * item.quantity) / 100).toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  const grandTotal = ((order.pricing?.grandTotalPaise || 0) / 100).toLocaleString('en-IN');

  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">Order Confirmed: ${order.orderNumber}</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>Thank you for acquiring handcrafted treasures from the House of AUREVÉ. Your bespoke order has been confirmed and placed in high-security preparation.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px;">
      <thead>
        <tr style="background-color: #FDFBF7; text-align: left; color: #706861;">
          <th style="padding: 10px; border-bottom: 2px solid #E8E2D6;">Masterpiece</th>
          <th style="padding: 10px; border-bottom: 2px solid #E8E2D6; text-align: center;">Qty</th>
          <th style="padding: 10px; border-bottom: 2px solid #E8E2D6; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px 10px; font-weight: bold; text-align: right;">Grand Total:</td>
          <td style="padding: 12px 10px; font-weight: bold; text-align: right; color: #9E7B47; font-size: 16px;">₹${grandTotal}</td>
        </tr>
      </tfoot>
    </table>

    <div style="background-color: #FDFBF7; padding: 16px; border: 1px solid #E8E2D6; border-radius: 4px; font-size: 13px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p style="margin: 4px 0;"><strong>Shipping Destination:</strong> ${order.shippingAddressSnapshot?.addressLine || ''}, ${order.shippingAddressSnapshot?.city || ''}, ${order.shippingAddressSnapshot?.state || ''} - ${order.shippingAddressSnapshot?.postalCode || ''}</p>
    </div>

    <p style="font-size: 13px; color: #706861;">Every piece is verified for BIS Hallmarking authenticity and accompanied by an insured transit certificate.</p>
  `;

  return sendTransactionalEmail({
    to,
    subject: `AUREVÉ Order Confirmation: ${order.orderNumber}`,
    title: 'AUREVÉ Order Confirmation',
    preheader: `Thank you for your order ${order.orderNumber}. Grand Total: ₹${grandTotal}.`,
    contentHtml
  });
};

/**
 * Dispatches Order Lifecycle Status update email.
 */
export const sendOrderStatusEmail = async ({ to, name, order, newStatus, trackingNumber = '', trackingUrl = '' }) => {
  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #1A1412; margin-top: 0;">Order Status Update: ${newStatus}</h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>The status of your AUREVÉ acquisition (Order <strong>${order.orderNumber}</strong>) has progressed to <strong>${newStatus}</strong>.</p>

    <div style="background-color: #FDFBF7; padding: 16px; border: 1px solid #E8E2D6; border-radius: 4px; font-size: 13px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 4px 0;"><strong>Current Status:</strong> ${newStatus}</p>
      ${trackingNumber ? `<p style="margin: 4px 0;"><strong>Insured Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      ${trackingUrl ? `<p style="margin: 4px 0;"><strong>Live Tracking:</strong> <a href="${trackingUrl}" style="color: #9E7B47; text-decoration: underline;">Track Shipment</a></p>` : ''}
    </div>

    <p style="font-size: 13px; color: #706861;">For real-time delivery status or special delivery instructions, contact our white-glove courier desk at <a href="mailto:concierge@aureve.com" style="color: #9E7B47;">concierge@aureve.com</a>.</p>
  `;

  return sendTransactionalEmail({
    to,
    subject: `AUREVÉ Order ${order.orderNumber}: ${newStatus}`,
    title: `Order Status: ${newStatus}`,
    preheader: `Your order ${order.orderNumber} is now ${newStatus}.`,
    contentHtml
  });
};

/**
 * Dispatches Review Moderation Outcome Email.
 */
export const sendReviewModerationEmail = async ({ to, name, productTitle, status, moderatorNotes = '' }) => {
  const isApproved = status === 'APPROVED';
  const contentHtml = `
    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: ${isApproved ? '#2E6930' : '#8B1E1E'}; margin-top: 0;">
      Review ${isApproved ? 'Approved & Published' : 'Moderation Notice'}
    </h2>
    <p>Dear ${name || 'Valued Client'},</p>
    <p>Thank you for contributing your testimonial for <strong>${productTitle || 'our jewellery'}</strong>.</p>

    <div style="background-color: #FDFBF7; padding: 16px; border: 1px solid #E8E2D6; border-radius: 4px; font-size: 13px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Moderation Status:</strong> ${status}</p>
      ${moderatorNotes ? `<p style="margin: 4px 0;"><strong>Curator Notes:</strong> ${moderatorNotes}</p>` : ''}
    </div>

    <p style="font-size: 13px; color: #706861;">${
      isApproved
        ? 'Your verified review is now live on the public collection catalogue and assisting fellow patrons in their selections.'
        : 'If you have questions regarding our community review guidelines, our concierge team is happy to assist.'
    }</p>
  `;

  return sendTransactionalEmail({
    to,
    subject: `AUREVÉ Review Update: ${status}`,
    title: `Review ${status}`,
    preheader: `Your product review has been marked as ${status}.`,
    contentHtml
  });
};

