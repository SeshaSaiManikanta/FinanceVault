// VaultFinance — Admin Routes (ADMIN role only)
import { Router } from 'express';
import { authenticate, requireActiveUser, requireAdmin } from '../middleware/auth';
import { getPlatformStats, listUsers, getUserDetail, updateUserPlan, toggleUserActive, listLoanTypes, createLoanType, updateLoanType, toggleLoanType, getAuditLogs } from '../controllers/adminController';

const router = Router();
router.use(authenticate, requireActiveUser, requireAdmin);

router.get('/stats', getPlatformStats);
router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/toggle', toggleUserActive);
router.get('/loan-types', listLoanTypes);
router.post('/loan-types', createLoanType);
router.put('/loan-types/:id', updateLoanType);
router.put('/loan-types/:id/toggle', toggleLoanType);
router.get('/audit-logs', getAuditLogs);

export default router;
