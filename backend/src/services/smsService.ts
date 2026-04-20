// VaultFinance — SMS Service (MSG91)
// Handles SMS delivery for OTP, password reset, PIN reset, etc.
// © 2025 VaultFinance. All Rights Reserved.
//
// Setup:
//   Add MSG91_API_KEY and MSG91_SENDER_ID to .env

import axios from 'axios';
import { logger } from '../utils/logger';

const MSG91_BASE_URL = 'https://control.msg91.com/api/sendhttp.php';
const API_KEY = process.env.MSG91_API_KEY;
const SENDER_ID = process.env.MSG91_SENDER_ID || 'VAULT';
const ROUTE = '4'; // Transactional route

interface SendSMSParams {
  mobile: string;
  message: string;
}

/**
 * Send SMS via MSG91 API
 * Returns true if successful, false otherwise
 */
export async function sendSMS(params: SendSMSParams): Promise<boolean> {
  if (!API_KEY || !params.mobile || !params.message) {
    logger.warn('SMS send failed: missing required params', { params });
    return false;
  }

  try {
    // MSG91 expects mobile without +91 prefix
    const mobile = params.mobile.replace(/^\+?91/, '');

    const response = await axios.get(MSG91_BASE_URL, {
      params: {
        authkey: API_KEY,
        mobiles: mobile,
        message: params.message,
        sender: SENDER_ID,
        route: ROUTE,
        response: 'json',
      },
      timeout: 10000,
    });

    // Check MSG91 response: returns { type: 'success', message: '...' }
    if (response.data?.type === 'success') {
      logger.info(`SMS sent successfully to ${mobile}`);
      return true;
    } else {
      logger.error(`SMS send failed: ${response.data?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logger.error('SMS API error:', { error, params });
    return false;
  }
}

/**
 * Send OTP via SMS
 */
export async function sendOTP(mobile: string, otp: string): Promise<boolean> {
  const message = `Your VaultFinance OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  return sendSMS({ mobile, message });
}

/**
 * Send password reset link via SMS
 */
export async function sendPasswordResetSMS(
  mobile: string,
  userName: string,
  resetLink: string,
): Promise<boolean> {
  const message = `Hi ${userName}, Click to reset your password: ${resetLink} (Valid for 1 hour)`;
  return sendSMS({ mobile, message });
}

/**
 * Send PIN reset link via SMS
 */
export async function sendPINResetSMS(
  mobile: string,
  userName: string,
  resetLink: string,
): Promise<boolean> {
  const message = `Hi ${userName}, Click to reset your PIN: ${resetLink} (Valid for 1 hour)`;
  return sendSMS({ mobile, message });
}

/**
 * Send payment confirmation SMS
 */
export async function sendPaymentConfirmationSMS(
  mobile: string,
  amount: string,
  transactionId: string,
): Promise<boolean> {
  const message = `Payment of ₹${amount} confirmed. Transaction ID: ${transactionId}. Thank you!`;
  return sendSMS({ mobile, message });
}

/**
 * Send EMI due reminder SMS
 */
export async function sendEMIDueSMS(mobile: string, loanId: string, amount: string): Promise<boolean> {
  const message = `EMI reminder: ₹${amount} due for Loan #${loanId}. Pay now to avoid penalties.`;
  return sendSMS({ mobile, message });
}
