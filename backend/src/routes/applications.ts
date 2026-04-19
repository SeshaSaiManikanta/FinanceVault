// VaultFinance — Application Routes
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { listApplications, createApplication, approveApplication, rejectApplication } from '../controllers/applicationController';
const router = Router();
router.use(authenticate, requireActiveUser);
router.get('/', listApplications);
router.post('/', createApplication);
router.put('/:id/approve', approveApplication);
router.put('/:id/reject', rejectApplication);
export default router;
