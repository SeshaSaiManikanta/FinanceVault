// VaultFinance — Dashboard Route
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { getDashboardSummary } from '../controllers/dashboardController';
const r1 = Router();
r1.use(authenticate, requireActiveUser);
r1.get('/summary', getDashboardSummary);
export default r1;
