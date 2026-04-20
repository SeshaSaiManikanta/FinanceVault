// VaultFinance — Email Service
// © 2025 VaultFinance. All Rights Reserved.

import { Resend } from 'resend';
import { logger } from '../utils/logger';

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!resend) {
      logger.warn('Resend API key not configured. Email not sent:', options.to);
      return false;
    }

    const response = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'noreply@vaultfinance.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (response.error) {
      logger.error('Email send failed:', response.error);
      return false;
    }

    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error('Email service error:', error);
    return false;
  }
}

// Password Reset Email Template
export function generatePasswordResetEmail(name: string, resetLink: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🔐 Password Reset Request</h1>
      </div>
      
      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
        
        <p>We received a request to reset your VaultFinance password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #D97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-bottom: 0;">
          Or copy this link: <br/> <code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">${resetLink}</code>
        </p>
        
        <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
          ⏰ This link expires in 1 hour. If you didn't request this, please ignore this email or <a href="mailto:support@vaultfinance.com">contact support</a>.
        </p>
      </div>
      
      <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">© 2025 VaultFinance. All rights reserved.</p>
      </div>
    </div>
  `;
}

// PIN Reset Email Template
export function generatePINResetEmail(name: string, resetLink: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🔑 Security PIN Reset</h1>
      </div>
      
      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
        
        <p>We received a request to reset your VaultFinance Security PIN. Click the button below to set a new 4-digit PIN:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Security PIN
          </a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
          ⏰ This link expires in 1 hour. Your Security PIN is used to reveal sensitive data like Aadhaar and PAN numbers.
        </p>
      </div>
      
      <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">© 2025 VaultFinance. All rights reserved.</p>
      </div>
    </div>
  `;
}

// Welcome Email Template
export function generateWelcomeEmail(name: string, email: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">✨ Welcome to VaultFinance</h1>
      </div>
      
      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
        
        <p>Welcome to VaultFinance! Your account has been successfully created.</p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #10B981; margin: 20px 0;">
          <p style="margin: 0;"><strong>📧 Email:</strong> ${email}</p>
        </div>
        
        <h3 style="margin-top: 20px;">Getting Started:</h3>
        <ul style="line-height: 1.8;">
          <li>Complete your KYC verification for full access</li>
          <li>Set up a 4-digit Security PIN for data protection</li>
          <li>Add your first customer to get started</li>
        </ul>
        
        <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
          Need help? <a href="https://vaultfinance.com/support" style="color: #10B981;">Contact support</a>
        </p>
      </div>
      
      <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">© 2025 VaultFinance. All rights reserved.</p>
      </div>
    </div>
  `;
}
