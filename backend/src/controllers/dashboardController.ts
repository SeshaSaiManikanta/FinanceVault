// VaultFinance — Dashboard Controller
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [
    totalDisbursed,
    activeLoans,
    overdueLoans,
    totalCustomers,
    pendingApps,
    pendingKyc,
    dueToday,
    overdueTotals,
    loanTypeBreakdown,
    recentLoans,
    monthlyCollections,
  ] = await Promise.all([
    // Total disbursed
    prisma.loan.aggregate({ where: { userId }, _sum: { principalAmount: true } }),

    // Active loan count
    prisma.loan.count({ where: { userId, status: 'ACTIVE' } }),

    // Overdue loan count
    prisma.loan.count({ where: { userId, status: 'OVERDUE' } }),

    // Total customers
    prisma.customer.count({ where: { userId, isActive: true } }),

    // Pending applications
    prisma.loanApplication.count({ where: { userId, status: 'PENDING' } }),

    // Pending KYC
    prisma.customer.count({ where: { userId, kycStatus: 'PENDING', isActive: true } }),

    // EMIs due today
    prisma.repayment.findMany({
      where: {
        loan: { userId },
        status: 'PENDING',
        dueDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        loan: {
          select: {
            loanNumber: true,
            loanType: { select: { name: true, icon: true, color: true } },
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),

    // Overdue totals
    prisma.repayment.aggregate({
      where: { loan: { userId }, status: 'OVERDUE' },
      _sum: { totalAmount: true },
      _count: true,
    }),

    // Loan type breakdown
    prisma.loan.groupBy({
      by: ['loanTypeId'],
      where: { userId, status: { not: 'CLOSED' } },
      _sum: { principalAmount: true },
      _count: true,
    }),

    // Recent loans
    prisma.loan.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        loanType: { select: { name: true, icon: true, color: true } },
      },
    }),

    // Monthly collections (last 6 months)
    prisma.repayment.groupBy({
      by: ['paidAt'],
      where: {
        loan: { userId },
        status: 'PAID',
        paidAt: { gte: new Date(Date.now() - 180 * 86400000) },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  // Fetch loan type details for breakdown
  const loanTypeIds = loanTypeBreakdown.map(b => b.loanTypeId);
  const loanTypes = await prisma.loanType.findMany({
    where: { id: { in: loanTypeIds } },
    select: { id: true, name: true, icon: true, color: true, slug: true },
  });
  const loanTypeMap = Object.fromEntries(loanTypes.map(lt => [lt.id, lt]));

  // Group monthly collections by month
  const collectionsMap: Record<string, number> = {};
  for (const rec of monthlyCollections) {
    if (rec.paidAt) {
      const key = `${rec.paidAt.getFullYear()}-${String(rec.paidAt.getMonth() + 1).padStart(2, '0')}`;
      collectionsMap[key] = (collectionsMap[key] || 0) + (rec._sum.totalAmount || 0);
    }
  }

  res.json({
    success: true,
    data: {
      kpis: {
        totalDisbursed: totalDisbursed._sum.principalAmount || 0,
        activeLoans,
        overdueLoans,
        totalCustomers,
        pendingApplications: pendingApps,
        pendingKyc,
        emiDueToday: dueToday.reduce((s, r) => s + r.totalAmount, 0),
        emiDueTodayCount: dueToday.length,
        overdueAmount: overdueTotals._sum.totalAmount || 0,
        overdueCount: overdueTotals._count,
      },
      loanTypeBreakdown: loanTypeBreakdown.map(b => ({
        loanType: loanTypeMap[b.loanTypeId],
        total: b._sum.principalAmount || 0,
        count: b._count,
      })),
      dueToday: dueToday.map(r => ({
        repaymentId: r.id,
        loanId: r.loanId,
        loanNumber: r.loan.loanNumber,
        customerName: r.loan.customer.name,
        customerPhone: r.loan.customer.phone,
        loanType: r.loan.loanType,
        amount: r.totalAmount,
        dueDate: r.dueDate,
        installmentNo: r.installmentNo,
      })),
      recentLoans,
      monthlyCollections: collectionsMap,
    },
  });
}
