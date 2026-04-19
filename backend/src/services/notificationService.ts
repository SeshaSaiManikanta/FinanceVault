// VaultFinance — Notification Service
// Connects to Resend (email), MSG91 (SMS), Twilio WhatsApp
// © 2025 VaultFinance. All Rights Reserved.

import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────
export interface NotificationPayload {
  userId: string;
  type: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  title: string;
  message: string;
  recipient?: string;       // customer name for history
  recipientContact?: string; // email address or phone number
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// ─── Send notification ────────────────────────────────────────
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // Always save to DB for in-app display
  const notif = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type as any,
      channel: payload.channel as any,
      title: payload.title,
      message: payload.message,
      recipient: payload.recipient,
      relatedEntityType: payload.relatedEntityType,
      relatedEntityId: payload.relatedEntityId,
      status: 'PENDING',
    },
  });

  // Dispatch to external channel
  try {
    let delivered = false;

    switch (payload.channel) {
      case 'EMAIL':
        delivered = await sendEmail(payload.recipientContact || '', payload.title, payload.message);
        break;
      case 'SMS':
        delivered = await sendSMS(payload.recipientContact || '', payload.message);
        break;
      case 'WHATSAPP':
        delivered = await sendWhatsApp(payload.recipientContact || '', payload.message);
        break;
      case 'IN_APP':
        delivered = true; // Already saved
        break;
    }

    await prisma.notification.update({
      where: { id: notif.id },
      data: { status: delivered ? 'DELIVERED' : 'FAILED', sentAt: new Date() },
    });
  } catch (err) {
    logger.error('Notification delivery failed:', err);
    await prisma.notification.update({
      where: { id: notif.id },
      data: { status: 'FAILED' },
    });
  }
}

// ─── EMI Due reminder ──────────────────────────────────────────
export async function sendEMIDueReminder(
  userId: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  loanNumber: string,
  emiAmount: number,
  dueDate: Date,
  alertPrefs: any,
): Promise<void> {
  const formattedAmount = `₹${Math.round(emiAmount).toLocaleString('en-IN')}`;
  const formattedDate = dueDate.toLocaleDateString('en-IN');
  const message = `Dear ${customerName}, your EMI of ${formattedAmount} for loan ${loanNumber} is due on ${formattedDate}. Please pay on time to avoid penalty. — VaultFinance`;

  if (alertPrefs?.emiDue?.sms && customerPhone) {
    await sendNotification({
      userId, type: 'EMI_DUE', channel: 'SMS',
      title: `EMI Due — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerPhone,
    });
  }

  if (alertPrefs?.emiDue?.email && customerEmail) {
    await sendNotification({
      userId, type: 'EMI_DUE', channel: 'EMAIL',
      title: `EMI Due Reminder — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerEmail,
    });
  }
}

// ─── Overdue alert ─────────────────────────────────────────────
export async function sendOverdueAlert(
  userId: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  loanNumber: string,
  overdueAmount: number,
  daysLate: number,
  alertPrefs: any,
): Promise<void> {
  const formattedAmount = `₹${Math.round(overdueAmount).toLocaleString('en-IN')}`;
  const message = `URGENT: Dear ${customerName}, your EMI for loan ${loanNumber} is ${daysLate} days overdue. Overdue amount: ${formattedAmount}. Please pay immediately to avoid legal action. Call: ${process.env.SUPPORT_PHONE || 'support'} — VaultFinance`;

  if (alertPrefs?.overdue?.sms && customerPhone) {
    await sendNotification({
      userId, type: 'EMI_OVERDUE', channel: 'SMS',
      title: `Overdue Alert — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerPhone,
    });
  }

  if (alertPrefs?.overdue?.whatsapp && customerPhone) {
    await sendNotification({
      userId, type: 'EMI_OVERDUE', channel: 'WHATSAPP',
      title: `Overdue Alert — ${loanNumber}`,
      message: `🚨 *${customerName}*, your EMI for *${loanNumber}* is *${daysLate} days overdue*.\n\nAmount: *${formattedAmount}*\n\nPlease pay immediately. — VaultFinance`,
      recipient: customerName, recipientContact: customerPhone,
    });
  }
}

// ─── Payment received ──────────────────────────────────────────
export async function sendPaymentConfirmation(
  userId: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  loanNumber: string,
  amount: number,
  installmentNo: number,
  alertPrefs: any,
): Promise<void> {
  const formattedAmount = `₹${Math.round(amount).toLocaleString('en-IN')}`;
  const message = `Dear ${customerName}, we have received your EMI payment of ${formattedAmount} (Installment ${installmentNo}) for loan ${loanNumber}. Thank you! — VaultFinance`;

  if (alertPrefs?.payment?.sms && customerPhone) {
    await sendNotification({
      userId, type: 'PAYMENT_RECEIVED', channel: 'SMS',
      title: `Payment Confirmed — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerPhone,
    });
  }

  if (alertPrefs?.payment?.email && customerEmail) {
    await sendNotification({
      userId, type: 'PAYMENT_RECEIVED', channel: 'EMAIL',
      title: `Payment Confirmed — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerEmail,
    });
  }
}

// ─── KYC notification ──────────────────────────────────────────
export async function sendKYCNotification(
  userId: string,
  customerName: string,
  customerPhone: string,
  status: 'VERIFIED' | 'REJECTED',
  alertPrefs: any,
): Promise<void> {
  const message = status === 'VERIFIED'
    ? `Dear ${customerName}, your KYC has been verified for VaultFinance. You can now apply for loans. Welcome!`
    : `Dear ${customerName}, your KYC has been rejected. Please contact your finance manager for assistance. — VaultFinance`;

  if (alertPrefs?.kyc?.sms && customerPhone) {
    await sendNotification({
      userId, type: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED', channel: 'SMS',
      title: `KYC ${status === 'VERIFIED' ? 'Approved' : 'Rejected'}`,
      message, recipient: customerName, recipientContact: customerPhone,
    });
  }
}

// ─── Loan approved notification ────────────────────────────────
export async function sendLoanApprovalNotification(
  userId: string,
  customerName: string,
  customerEmail: string,
  loanNumber: string,
  loanType: string,
  amount: number,
  emiAmount: number,
  firstDueDate: Date,
  alertPrefs: any,
): Promise<void> {
  const message = `Congratulations ${customerName}! Your ${loanType} of ₹${Math.round(amount).toLocaleString('en-IN')} (Loan: ${loanNumber}) has been approved. Monthly EMI: ₹${Math.round(emiAmount).toLocaleString('en-IN')}. First due date: ${firstDueDate.toLocaleDateString('en-IN')}. — VaultFinance`;

  if (customerEmail) {
    await sendNotification({
      userId, type: 'LOAN_APPROVED', channel: 'EMAIL',
      title: `🎉 Loan Approved — ${loanNumber}`,
      message, recipient: customerName, recipientContact: customerEmail,
    });
  }
}

// ─── External channel implementations ─────────────────────────

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !to) {
    logger.warn('Email not configured or no recipient — skipping');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${process.env.EMAIL_FROM_NAME || 'VaultFinance'} <${process.env.EMAIL_FROM || 'noreply@vaultfinance.app'}>`,
        to: [to],
        subject,
        text,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1813; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <h2 style="color: #FAC775; margin: 0; font-size: 18px;">VaultFinance</h2>
            </div>
            <h3 style="color: #1a1813;">${subject}</h3>
            <p style="color: #444; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} VaultFinance. All Rights Reserved.<br>
              This is an automated message. Do not reply.
            </p>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    logger.error('Resend email error:', err);
    return false;
  }
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!process.env.MSG91_API_KEY || !to) {
    logger.warn('MSG91 not configured or no phone — skipping SMS');
    return false;
  }

  try {
    // MSG91 API (India)
    const res = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_API_KEY,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID || '',
        short_url: '0',
        recipients: [{
          mobiles: `91${to.replace(/^\+91/, '').replace(/\D/g, '')}`,
          var1: message.slice(0, 160),
        }],
      }),
    });
    return res.ok;
  } catch (err) {
    logger.error('MSG91 SMS error:', err);
    return false;
  }
}

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !to) {
    logger.warn('Twilio not configured or no phone — skipping WhatsApp');
    return false;
  }

  try {
    const phone = `+91${to.replace(/^\+91/, '').replace(/\D/g, '')}`;
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

    const body = new URLSearchParams({
      From: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
      To: `whatsapp:${phone}`,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
    return res.ok;
  } catch (err) {
    logger.error('Twilio WhatsApp error:', err);
    return false;
  }
}
