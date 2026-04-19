// VaultFinance — Payment Routes (Razorpay)
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { createSubscriptionOrder, verifyPayment } from '../services/paymentService';

const router = Router();
router.use(authenticate, requireActiveUser);

const paymentLimiter = rateLimit({ windowMs: 60000, max: 10 });

router.post('/create-order', paymentLimiter, createSubscriptionOrder);
router.post('/verify', paymentLimiter, verifyPayment);

export default router;
