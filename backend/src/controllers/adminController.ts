// VaultFinance — Admin Controller
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';

export async function getPlatformStats(req: Request, res: Response): Promise<void> {
  const [totalUsers, activeUsers, trialUsers, subscribedUsers, totalCustomers, totalLoans, totalDisbursed, loanTypes] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', isActive: true } }),
    prisma.user.count({ where: { role: 'USER', plan: 'TRIAL' } }),
    prisma.user.count({ where: { role: 'USER', plan: { in: ['MONTHLY', 'YEARLY', 'ENTERPRISE'] } } }),
    prisma.customer.count({ where: { user: { role: 'USER' } } }),
    prisma.loan.count({ where: { user: { role: 'USER' } } }),
    prisma.loan.aggregate({ where: { user: { role: 'USER' } }, _sum: { principalAmount: true } }),
    prisma.loanType.count({ where: { isEnabled: true } }),
  ]);

  res.json({ success: true, data: { totalUsers, activeUsers, trialUsers, subscribedUsers, totalCustomers, totalLoans, totalDisbursed: totalDisbursed._sum.principalAmount || 0, activeLoanTypes: loanTypes } });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '20', search, plan } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = {
    role: 'USER',
    ...(plan && { plan }),
    ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { companyName: { contains: search, mode: 'insensitive' } }] }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, companyName: true, phone: true,
        role: true, plan: true, isActive: true, trialEndsAt: true,
        subscribedAt: true, subscriptionEndsAt: true,
        failedLoginCount: true, lastLoginAt: true, createdAt: true,
        _count: { select: { customers: true, loans: true, applications: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
}

export async function getUserDetail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, companyName: true, phone: true,
      plan: true, isActive: true, trialEndsAt: true, subscriptionEndsAt: true,
      createdAt: true, lastLoginAt: true, lastLoginIp: true,
      customers: { select: { id: true, name: true, phone: true, kycStatus: true }, take: 20 },
      loans: {
        select: { id: true, loanNumber: true, principalAmount: true, status: true, loanType: { select: { name: true, icon: true } } },
        take: 20, orderBy: { createdAt: 'desc' },
      },
      auditLogs: { select: { action: true, severity: true, createdAt: true, details: true }, take: 20, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: user });
}

export async function updateUserPlan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { plan, daysToAdd } = z.object({ plan: z.enum(['TRIAL', 'MONTHLY', 'YEARLY', 'ENTERPRISE']), daysToAdd: z.number().optional() }).parse(req.body);

  const subscriptionEndsAt = daysToAdd ? new Date(Date.now() + daysToAdd * 86400000) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: { plan, ...(subscriptionEndsAt && { subscriptionEndsAt, subscribedAt: new Date() }) },
    select: { id: true, email: true, plan: true, subscriptionEndsAt: true },
  });

  await createAuditLog(req.user!.userId, 'ADMIN_ACTION', 'User', id, `Plan updated to ${plan}`, 'MEDIUM', req);
  res.json({ success: true, data: user });
}

export async function toggleUserActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, name: true } });
  if (!user) throw new AppError('User not found', 404);

  const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive }, select: { id: true, isActive: true } });
  await createAuditLog(req.user!.userId, 'ADMIN_ACTION', 'User', id, `Account ${updated.isActive ? 'activated' : 'deactivated'}: ${user.name}`, 'HIGH', req);
  res.json({ success: true, data: updated });
}

// ─── LOAN TYPES ───
const loanTypeSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z_]+$/).min(2).max(50),
  icon: z.string().max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().max(500).optional(),
  minRate: z.number().min(0).max(100),
  maxRate: z.number().min(0).max(100),
  defaultRate: z.number().min(0).max(100),
  assetFields: z.array(z.object({ key: z.string(), label: z.string(), type: z.string(), placeholder: z.string().optional(), options: z.array(z.string()).optional() })).default([]),
  tenureOptions: z.array(z.number()).default([6, 12, 24, 36, 48, 60]),
  sortOrder: z.number().int().default(0),
});

export async function listLoanTypes(req: Request, res: Response): Promise<void> {
  const types = await prisma.loanType.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: types });
}

export async function createLoanType(req: Request, res: Response): Promise<void> {
  const data = loanTypeSchema.parse(req.body);
  const existing = await prisma.loanType.findFirst({ where: { OR: [{ name: data.name }, { slug: data.slug }] } });
  if (existing) throw new AppError('Loan type with this name or slug already exists', 409);
  const lt = await prisma.loanType.create({ data });
  await createAuditLog(req.user!.userId, 'LOAN_TYPE_CREATED', 'LoanType', lt.id, `Created: ${lt.name}`, 'LOW', req);
  res.status(201).json({ success: true, data: lt });
}

export async function updateLoanType(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = loanTypeSchema.partial().parse(req.body);
  const lt = await prisma.loanType.update({ where: { id }, data });
  await createAuditLog(req.user!.userId, 'LOAN_TYPE_UPDATED', 'LoanType', id, `Updated: ${lt.name}`, 'LOW', req);
  res.json({ success: true, data: lt });
}

export async function toggleLoanType(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const lt = await prisma.loanType.findUnique({ where: { id } });
  if (!lt) throw new AppError('Loan type not found', 404);
  const updated = await prisma.loanType.update({ where: { id }, data: { isEnabled: !lt.isEnabled } });
  res.json({ success: true, data: updated });
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { userId, severity, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = { ...(userId && { userId }), ...(severity && { severity }) };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  res.setHeader('X-Total-Count', total);
  res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
}
