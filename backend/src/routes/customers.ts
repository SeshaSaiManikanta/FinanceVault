// VaultFinance — Customer Routes
// © 2025 VaultFinance. All Rights Reserved.

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireActiveUser } from '../middleware/auth';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  revealSensitiveData,
} from '../controllers/customerController';

const router = Router();
router.use(authenticate, requireActiveUser);

// Strict rate limit for sensitive data reveal
const sensitiveDataLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many sensitive data requests.' },
});

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/reveal', sensitiveDataLimiter, revealSensitiveData);

export default router;
