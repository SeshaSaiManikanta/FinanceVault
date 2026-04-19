// VaultFinance — Loan Application Controller
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';

const createAppSchema = z.object({
  customerId: z.string().min(1),
  loanTypeId: z.string().min(1),
  principalAmount: z.number().positive().max(10000000),
  interestRate: z.number().min(1).max(50),
  tenureMonths: z.number().int().min(1).max(360),
  processingFee: z.number().min(0).default(0),
  assetDetails: z.record(z.any()).default({}),
});

function calcEMI(p: number, r: number, n: number): number {
  const mr = r / 12 / 100;
  return mr === 0 ? p / n : (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
}

export async function listApplications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = { userId, ...(status && { status }) };
  const [apps, total] = await Promise.all([
    prisma.loanApplication.findMany({
      where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true, kycStatus: true } },
        loanType: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      },
    }),
    prisma.loanApplication.count({ where }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json({ success: true, data: apps, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
}

export async function createApplication(req: Request, res: Response): Promise<void> {
  const data = createAppSchema.parse(req.body);
  const userId = req.user!.userId;

  const [customer, loanType] = await Promise.all([
    prisma.customer.findFirst({ where: { id: data.customerId, userId, isActive: true } }),
    prisma.loanType.findFirst({ where: { id: data.loanTypeId, isEnabled: true } }),
  ]);

  if (!customer) throw new AppError('Customer not found', 404);
  if (!loanType) throw new AppError('Loan type not found', 404);

  const emiAmount = calcEMI(data.principalAmount, data.interestRate, data.tenureMonths);
  const applicationNo = `APP-${Date.now()}`;

  const app = await prisma.loanApplication.create({
    data: {
      applicationNo,
      userId,
      customerId: data.customerId,
      loanTypeId: data.loanTypeId,
      principalAmount: data.principalAmount,
      interestRate: data.interestRate,
      tenureMonths: data.tenureMonths,
      processingFee: data.processingFee,
      assetDetails: data.assetDetails,
      emiAmount: Math.round(emiAmount * 100) / 100,
      stage: customer.kycStatus === 'VERIFIED' ? 'DOC_VERIFICATION' : 'KYC_CHECK',
    },
    include: {
      customer: { select: { name: true } },
      loanType: { select: { name: true } },
    },
  });

  await createAuditLog(userId, 'APPLICATION_SUBMITTED', 'Application', app.id, `${loanType.name} ₹${data.principalAmount} for ${customer.name}`, 'LOW', req);
  res.status(201).json({ success: true, data: app });
}

export async function approveApplication(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const app = await prisma.loanApplication.findFirst({
    where: { id, userId, status: 'PENDING' },
    include: {
      customer: { select: { name: true, kycStatus: true } },
      loanType: { select: { name: true, slug: true } },
    },
  });

  if (!app) throw new AppError('Application not found or already processed', 404);
  if (app.customer.kycStatus !== 'VERIFIED') throw new AppError('Customer KYC must be verified first', 400, 'KYC_REQUIRED');

  // Generate repayment schedule
  const emi = calcEMI(app.principalAmount, app.interestRate, app.tenureMonths);
  const prefix = app.loanType.slug.slice(0, 2).toUpperCase();
  const loanNumber = `${prefix}${Date.now().toString().slice(-6)}`;
  const disbursedAt = new Date();

  let balance = app.principalAmount;
  const schedule = Array.from({ length: app.tenureMonths }, (_, i) => {
    const interest = balance * (app.interestRate / 12 / 100);
    const principal = emi - interest;
    balance = Math.max(0, balance - principal);
    const dueDate = new Date(disbursedAt);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    return {
      installmentNo: i + 1,
      principalAmount: Math.round(principal * 100) / 100,
      interestAmount: Math.round(interest * 100) / 100,
      totalAmount: Math.round(emi * 100) / 100,
      dueDate,
      status: 'PENDING' as const,
    };
  });

  // Create loan + update application atomically
  const [loan] = await prisma.$transaction([
    prisma.loan.create({
      data: {
        loanNumber,
        userId,
        customerId: app.customerId,
        loanTypeId: app.loanTypeId,
        applicationId: app.id,
        principalAmount: app.principalAmount,
        interestRate: app.interestRate,
        tenureMonths: app.tenureMonths,
        processingFee: app.processingFee,
        emiAmount: Math.round(emi * 100) / 100,
        disbursedAt,
        assetDetails: app.assetDetails as any,
        repayments: { createMany: { data: schedule } },
      },
    }),
    prisma.loanApplication.update({
      where: { id },
      data: { status: 'APPROVED', stage: 'MANAGER_APPROVAL', reviewedBy: userId, reviewedAt: new Date() },
    }),
  ]);

  await createAuditLog(userId, 'APPLICATION_APPROVED', 'Application', id, `Approved — ${app.loanType.name} ₹${app.principalAmount} for ${app.customer.name}. Loan: ${loanNumber}`, 'LOW', req);
  res.json({ success: true, message: `Loan ${loanNumber} disbursed`, data: { loanId: loan.id, loanNumber } });
}

export async function rejectApplication(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
  const userId = req.user!.userId;

  const app = await prisma.loanApplication.findFirst({ where: { id, userId, status: 'PENDING' } });
  if (!app) throw new AppError('Application not found', 404);

  await prisma.loanApplication.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason, reviewedBy: userId, reviewedAt: new Date() },
  });

  await createAuditLog(userId, 'APPLICATION_REJECTED', 'Application', id, `Rejected: ${reason}`, 'MEDIUM', req);
  res.json({ success: true, message: 'Application rejected' });
}
