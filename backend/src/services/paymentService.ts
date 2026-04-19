// VaultFinance — Razorpay Payment Service
// Handles subscription payments via Razorpay
// © 2025 VaultFinance. All Rights Reserved.
//
// Setup:
//   npm install razorpay
//   Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env

import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from './auditService';
import { logger } from '../utils/logger';

const PLANS = {
  MONTHLY: { amount: 2000, currency: 'INR', description: 'VaultFinance Monthly Plan' },  // ₹20 in paise
  YEARLY:  { amount: 15000, currency: 'INR', description: 'VaultFinance Yearly Plan' },  // ₹150 in paise
};

/**
 * Create a Razorpay order for subscription.
 * Frontend will open Razorpay checkout with this order_id.
 */
export async function createSubscriptionOrder(req: Request, res: Response): Promise<void> {
  const { plan } = req.body as { plan: 'MONTHLY' | 'YEARLY' };
  const userId = req.user!.userId;

  if (!PLANS[plan]) throw new AppError('Invalid plan', 400);

  const { amount, currency, description } = PLANS[plan];

  // In production, use Razorpay SDK:
  // const Razorpay = require('razorpay');
  // const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  // const order = await rzp.orders.create({ amount, currency, receipt: `sub_${userId}_${Date.now()}`, notes: { userId, plan } });

  // Stub response for now:
  const order = {
    id: `order_${crypto.randomBytes(10).toString('hex')}`,
    amount,
    currency,
    receipt: `sub_${userId}_${Date.now()}`,
  };

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      description,
      prefill: { name: req.user!.dbUser?.name, email: req.user!.email },
    },
  });
}

/**
 * Verify Razorpay payment signature and activate subscription.
 */
export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
  const userId = req.user!.userId;

  // Verify HMAC signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new AppError('Invalid payment signature', 400, 'PAYMENT_INVALID');
  }

  // Activate subscription
  const daysToAdd = plan === 'MONTHLY' ? 30 : 365;
  const subscriptionEndsAt = new Date(Date.now() + daysToAdd * 86400000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan.toUpperCase(),
      subscribed: true,
      subscribedAt: new Date(),
      subscriptionEndsAt,
    } as any,
  });

  await createAuditLog(userId, 'SUBSCRIPTION_CHANGED', undefined, undefined,
    `Subscribed to ${plan} plan via Razorpay. Payment: ${razorpay_payment_id}`, 'LOW', req);

  logger.info(`Subscription activated: user=${userId} plan=${plan} payment=${razorpay_payment_id}`);

  res.json({
    success: true,
    message: `Subscription activated! Valid until ${subscriptionEndsAt.toLocaleDateString('en-IN')}`,
    data: { plan: plan.toUpperCase(), subscriptionEndsAt },
  });
}
