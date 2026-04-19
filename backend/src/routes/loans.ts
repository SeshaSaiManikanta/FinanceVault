// VaultFinance — Loan Routes
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { listLoans, getLoan, createLoan, getRepaymentSchedule, recordPayment } from '../controllers/loanController';
import { prisma } from '../utils/prisma';

const router = Router();

// Public endpoint - get all active loan types
router.get('/types', async (req, res) => {
  const types = await prisma.loanType.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      description: true,
      minRate: true,
      maxRate: true,
      defaultRate: true,
      tenureOptions: true,
      assetFields: true,
    },
  });
  res.json({ success: true, data: types });
});

// Protected routes
router.use(authenticate, requireActiveUser);
router.get('/', listLoans);
router.post('/', createLoan);
router.get('/:id', getLoan);
router.get('/:id/schedule', getRepaymentSchedule);
router.post('/:loanId/repayments/:repaymentId/pay', recordPayment);

export default router;
