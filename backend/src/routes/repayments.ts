// VaultFinance — Repayments Route
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { prisma } from '../utils/prisma';
const router = Router();
router.use(authenticate, requireActiveUser);

router.get('/overdue', async (req, res) => {
  const userId = req.user!.userId;
  const overdue = await prisma.repayment.findMany({
    where: {
      loan: { userId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    include: {
      loan: {
        select: {
          loanNumber: true, status: true,
          customer: { select: { name: true, phone: true, email: true } },
          loanType: { select: { name: true, icon: true, color: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Auto-mark as overdue
  const overdueIds = overdue.map(r => r.id);
  if (overdueIds.length > 0) {
    await prisma.$transaction([
      prisma.repayment.updateMany({ where: { id: { in: overdueIds } }, data: { status: 'OVERDUE' } }),
      prisma.loan.updateMany({ where: { repayments: { some: { id: { in: overdueIds } } } }, data: { status: 'OVERDUE' } }),
    ]);
  }

  res.json({ success: true, data: overdue });
});

router.get('/due-today', async (req, res) => {
  const userId = req.user!.userId;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const due = await prisma.repayment.findMany({
    where: { loan: { userId }, status: 'PENDING', dueDate: { gte: today, lte: todayEnd } },
    include: { loan: { select: { loanNumber: true, customer: { select: { name: true, phone: true } }, loanType: { select: { name: true, icon: true, color: true } } } } },
    orderBy: { dueDate: 'asc' },
  });
  res.json({ success: true, data: due });
});

export default router;
