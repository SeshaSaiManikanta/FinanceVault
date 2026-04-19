// VaultFinance — Scheduled Jobs
// Run daily: EMI reminders, overdue detection, subscription expiry alerts
// In production: use node-cron or a queue like BullMQ
// © 2025 VaultFinance. All Rights Reserved.

import { prisma } from '../utils/prisma';
import {
  sendEMIDueReminder,
  sendOverdueAlert,
  sendLoanApprovalNotification,
} from './notificationService';
import { logger } from '../utils/logger';

/**
 * Send reminders for EMIs due in the next 3 days.
 * Run this daily at 9 AM IST.
 */
export async function runEMIReminderJob(): Promise<void> {
  logger.info('Running EMI reminder job...');

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingEMIs = await prisma.repayment.findMany({
    where: {
      status: 'PENDING',
      dueDate: { gte: new Date(), lte: threeDaysFromNow },
    },
    include: {
      loan: {
        include: {
          customer: { select: { name: true, phone: true, email: true } },
          user: { select: { id: true, alertPrefs: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const repayment of upcomingEMIs) {
    try {
      await sendEMIDueReminder(
        repayment.loan.user.id,
        repayment.loan.customer.name,
        repayment.loan.customer.phone,
        repayment.loan.customer.email || '',
        repayment.loan.loanNumber || repayment.loanId,
        repayment.totalAmount,
        repayment.dueDate,
        repayment.loan.user.alertPrefs,
      );
      sent++;
    } catch (err) {
      logger.error(`Failed EMI reminder for repayment ${repayment.id}:`, err);
    }
  }

  logger.info(`EMI reminder job: sent ${sent}/${upcomingEMIs.length} reminders`);
}

/**
 * Mark overdue EMIs and send alerts.
 * Run this daily at 10 AM IST.
 */
export async function runOverdueDetectionJob(): Promise<void> {
  logger.info('Running overdue detection job...');

  const overdueRepayments = await prisma.repayment.findMany({
    where: {
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    include: {
      loan: {
        include: {
          customer: { select: { name: true, phone: true, email: true } },
          user: { select: { id: true, alertPrefs: true } },
        },
      },
    },
  });

  if (overdueRepayments.length === 0) {
    logger.info('No overdue repayments found');
    return;
  }

  // Bulk mark as overdue
  const ids = overdueRepayments.map(r => r.id);
  const loanIds = [...new Set(overdueRepayments.map(r => r.loanId))];

  await prisma.$transaction([
    prisma.repayment.updateMany({ where: { id: { in: ids } }, data: { status: 'OVERDUE' } }),
    prisma.loan.updateMany({ where: { id: { in: loanIds } }, data: { status: 'OVERDUE' } }),
  ]);

  // Send alerts for first-day overdue only (avoid spam)
  const newlyOverdue = overdueRepayments.filter(r => {
    const daysLate = Math.floor((Date.now() - r.dueDate.getTime()) / 86400000);
    return daysLate <= 1; // Only alert on day 1
  });

  let sent = 0;
  for (const repayment of newlyOverdue) {
    try {
      const daysLate = Math.floor((Date.now() - repayment.dueDate.getTime()) / 86400000);
      await sendOverdueAlert(
        repayment.loan.user.id,
        repayment.loan.customer.name,
        repayment.loan.customer.phone,
        repayment.loan.customer.email || '',
        repayment.loanId,
        repayment.totalAmount,
        daysLate,
        repayment.loan.user.alertPrefs,
      );
      sent++;
    } catch (err) {
      logger.error(`Failed overdue alert for ${repayment.id}:`, err);
    }
  }

  logger.info(`Overdue detection: marked ${ids.length} overdue, sent ${sent} alerts`);
}

/**
 * Alert users whose subscriptions expire in 7 days.
 * Run this daily at 8 AM IST.
 */
export async function runSubscriptionExpiryJob(): Promise<void> {
  logger.info('Running subscription expiry check...');

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: 'USER',
      OR: [
        { plan: 'TRIAL', trialEndsAt: { gte: new Date(), lte: sevenDaysFromNow } },
        { plan: { in: ['MONTHLY', 'YEARLY'] }, subscriptionEndsAt: { gte: new Date(), lte: sevenDaysFromNow } },
      ],
    },
    select: { id: true, email: true, name: true, plan: true, trialEndsAt: true, subscriptionEndsAt: true },
  });

  for (const user of expiringUsers) {
    const endsAt = user.plan === 'TRIAL' ? user.trialEndsAt : user.subscriptionEndsAt;
    if (!endsAt) continue;
    const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86400000);

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SUBSCRIPTION_EXPIRING',
        channel: 'IN_APP',
        title: `${user.plan === 'TRIAL' ? 'Trial' : 'Subscription'} expiring in ${daysLeft} days`,
        message: `Your VaultFinance ${user.plan === 'TRIAL' ? 'free trial' : 'subscription'} expires in ${daysLeft} days. Upgrade now to keep accessing all your data and features.`,
        status: 'DELIVERED',
      },
    });
  }

  logger.info(`Subscription expiry check: ${expiringUsers.length} users notified`);
}

/**
 * Bootstrap scheduler — call this from server.ts
 * In production use node-cron or BullMQ for reliable scheduling
 */
export function startScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Scheduler disabled in development. Set NODE_ENV=production to enable.');
    return;
  }

  // Simple interval-based scheduler
  // For production: replace with node-cron or BullMQ + Redis
  const HOUR = 60 * 60 * 1000;

  // Run at startup
  setTimeout(() => {
    runEMIReminderJob().catch(logger.error);
    runOverdueDetectionJob().catch(logger.error);
    runSubscriptionExpiryJob().catch(logger.error);
  }, 5000);

  // Run every 24 hours
  setInterval(() => {
    runEMIReminderJob().catch(logger.error);
  }, 24 * HOUR);

  setInterval(() => {
    runOverdueDetectionJob().catch(logger.error);
  }, 24 * HOUR);

  setInterval(() => {
    runSubscriptionExpiryJob().catch(logger.error);
  }, 24 * HOUR);

  logger.info('✅ Scheduler started — EMI reminders, overdue detection, subscription alerts');
}
