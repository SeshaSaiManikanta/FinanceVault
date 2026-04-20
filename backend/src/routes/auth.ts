// VaultFinance — Auth Routes
// © 2025 VaultFinance. All Rights Reserved.

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireActiveUser } from '../middleware/auth';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  forgotPin,
  resetPin,
} from '../controllers/authController';

const router = Router();

// ─── STRICT rate limiter for auth endpoints ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    code: 'RATE_LIMIT',
    message: 'Too many auth attempts. Please wait 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    code: 'RATE_LIMIT',
    message: 'Too many login attempts. Account may be locked.',
  },
});

router.post('/register', authLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, requireActiveUser, getMe);
router.put('/change-password', authenticate, requireActiveUser, changePassword);

// Password & PIN Reset Routes (public, rate-limited)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/forgot-pin', authLimiter, forgotPin);
router.post('/reset-pin', authLimiter, resetPin);

export default router;
