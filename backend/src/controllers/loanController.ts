// VaultFinance — Loan Controller
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';

function calcEMI(principal: number, ratePercent: number, months: number): number {
  const r = ratePercent / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function generateLoanNumber(prefix: string): string {
  const ts = Date.now().toString().slice(-6);
  return `${prefix}${ts}`;
}

const createLoanSchema = z.object({
  customerId: z.string().min(1),
  loanTypeId: z.string().min(1),
  principalAmount: z.number().positive().max(10000000),
  interestRate: z.number().min(1).max(50),
  tenureMonths: z.number().int().min(1).max(360),
  processingFee: z.number().min(0).default(0),
  disbursedAt: z.string().datetime().optional(),
  assetDetails: z.record(z.any()).default({}),
});

export async function listLoans(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { page = '1', limit = '20', status, loanTypeId, search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {
    userId,
    ...(status && { status }),
    ...(loanTypeId && { loanTypeId }),
    ...(search && {
      OR: [
        { loanNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        loanType: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        repayments: { select: { status: true, installmentNo: true, dueDate: true } },
      },
    }),
    prisma.loan.count({ where }),
  ]);

  const enriched = loans.map(l => ({
    ...l,
    paidCount: l.repayments.filter(r => r.status === 'PAID').length,
    overdueCount: l.repayments.filter(r => r.status === 'OVERDUE').length,
    nextDue: l.repayments.find(r => r.status === 'PENDING')?.dueDate || null,
    repayments: undefined,
  }));

  res.setHeader('X-Total-Count', total);
  res.json({ success: true, data: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
}

export async function getLoan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';

  const loan = await prisma.loan.findFirst({
    where: { id, ...(isAdmin ? {} : { userId }) },
    include: {
      customer: { select: { id: true, name: true, phone: true, kycStatus: true } },
      loanType: true,
      repayments: { orderBy: { installmentNo: 'asc' } },
    },
  });

  if (!loan) throw new AppError('Loan not found', 404);
  res.json({ success: true, data: loan });
}

export async function createLoan(req: Request, res: Response): Promise<void> {
  const data = createLoanSchema.parse(req.body);
  const userId = req.user!.userId;

  const [customer, loanType] = await Promise.all([
    prisma.customer.findFirst({ where: { id: data.customerId, userId, isActive: true } }),
    prisma.loanType.findFirst({ where: { id: data.loanTypeId, isEnabled: true } }),
  ]);

  if (!customer) throw new AppError('Customer not found', 404);
  if (!loanType) throw new AppError('Loan type not found or disabled', 404);
  if (customer.kycStatus !== 'VERIFIED') throw new AppError('Customer KYC must be verified before loan disbursement', 400, 'KYC_NOT_VERIFIED');

  const emiAmount = calcEMI(data.principalAmount, data.interestRate, data.tenureMonths);
  const prefix = loanType.slug.slice(0, 2).toUpperCase();
  const loanNumber = generateLoanNumber(prefix);
  const disbursedAt = data.disbursedAt ? new Date(data.disbursedAt) : new Date();

  // Generate full repayment schedule
  let balance = data.principalAmount;
  const schedule = [];
  for (let i = 1; i <= data.tenureMonths; i++) {
    const interest = balance * (data.interestRate / 12 / 100);
    const principal = emiAmount - interest;
    balance = Math.max(0, balance - principal);
    const dueDate = new Date(disbursedAt);
    dueDate.setMonth(dueDate.getMonth() + i);
    schedule.push({
      installmentNo: i,
      principalAmount: Math.round(principal * 100) / 100,
      interestAmount: Math.round(interest * 100) / 100,
      totalAmount: Math.round(emiAmount * 100) / 100,
      dueDate,
      status: 'PENDING' as const,
    });
  }

  const loan = await prisma.loan.create({
    data: {
      loanNumber,
      userId,
      customerId: data.customerId,
      loanTypeId: data.loanTypeId,
      principalAmount: data.principalAmount,
      interestRate: data.interestRate,
      tenureMonths: data.tenureMonths,
      processingFee: data.processingFee,
      emiAmount: Math.round(emiAmount * 100) / 100,
      disbursedAt,
      assetDetails: data.assetDetails,
      repayments: { createMany: { data: schedule } },
    },
    include: { customer: { select: { name: true } }, loanType: { select: { name: true } } },
  });

  await createAuditLog(userId, 'LOAN_CREATED', 'Loan', loan.id, `${loanType.name} ₹${data.principalAmount} to ${customer.name}`, 'LOW', req);
  res.status(201).json({ success: true, data: loan });
}

export async function getRepaymentSchedule(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const loan = await prisma.loan.findFirst({
    where: { id, userId },
    include: { repayments: { orderBy: { installmentNo: 'asc' } } },
  });

  if (!loan) throw new AppError('Loan not found', 404);
  res.json({ success: true, data: loan.repayments });
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const { loanId, repaymentId } = req.params;
  const { paymentMethod = 'cash', receiptNo, remarks } = req.body;
  const userId = req.user!.userId;

  const repayment = await prisma.repayment.findFirst({
    where: { id: repaymentId, loanId, loan: { userId } },
    include: { loan: { select: { loanNumber: true, tenureMonths: true } } },
  });

  if (!repayment) throw new AppError('Repayment not found', 404);
  if (repayment.status === 'PAID') throw new AppError('This EMI is already paid', 400);

  await prisma.repayment.update({
    where: { id: repaymentId },
    data: { status: 'PAID', paidAt: new Date(), paymentMethod, receiptNo, remarks },
  });

  // Check if all EMIs paid → close loan
  const unpaid = await prisma.repayment.count({ where: { loanId, status: { notIn: ['PAID', 'WAIVED'] } } });
  if (unpaid === 0) {
    await prisma.loan.update({ where: { id: loanId }, data: { status: 'CLOSED', closedAt: new Date() } });
  }

  await createAuditLog(userId, 'PAYMENT_RECORDED', 'Loan', loanId, `EMI ${repayment.installmentNo} paid — ${repayment.loan.loanNumber}`, 'LOW', req);
  res.json({ success: true, message: 'Payment recorded', loanClosed: unpaid === 0 });
}
