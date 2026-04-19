// VaultFinance — Audit Service
// © 2025 VaultFinance. All Rights Reserved.

import { Request } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGED' | 'PIN_CHANGED' | 'PIN_VERIFICATION_FAILED'
  | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' | 'CUSTOMER_DELETED'
  | 'SENSITIVE_DATA_VIEWED'
  | 'LOAN_CREATED' | 'LOAN_UPDATED' | 'LOAN_CLOSED'
  | 'APPLICATION_SUBMITTED' | 'APPLICATION_APPROVED' | 'APPLICATION_REJECTED'
  | 'PAYMENT_RECORDED' | 'SUBSCRIPTION_CHANGED'
  | 'LOAN_TYPE_CREATED' | 'LOAN_TYPE_UPDATED'
  | 'ADMIN_ACTION';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export async function createAuditLog(
  userId: string,
  action: AuditAction | string,
  entityType?: string,
  entityId?: string,
  details?: string,
  severity: AuditSeverity = 'LOW',
  req?: Request,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        severity,
        ipAddress: req?.ip || req?.socket?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      },
    });
  } catch (err) {
    // Audit log failure should never crash the main operation
    logger.error('Failed to create audit log:', err);
  }
}
