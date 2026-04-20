// VaultFinance — Auth Controller
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import {
  generateAccessToken,
  generateRefreshTokenValue,
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';
import { sendEmail, generatePasswordResetEmail, generatePINResetEmail } from '../services/emailService';
import { sendPasswordResetSMS, sendPINResetSMS } from '../services/smsService';
import { logger } from '../utils/logger';
import { hashPin } from '../utils/encryption';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  name: z.string().min(2).max(100),
  companyName: z.string().min(2).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  securityPin: z
    .string()
    .regex(/^\d{4}$/, 'Security PIN must be exactly 4 digits')
    .optional(),
  plan: z.enum(['TRIAL', 'MONTHLY', 'YEARLY']).default('TRIAL'),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
});

const forgotPinSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const resetPinSchema = z.object({
  token: z.string().min(1),
  newPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const data = registerSchema.parse(req.body);

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Hash PIN if provided
  let pinData: { hash: string; salt: string } | null = null;
  if (data.securityPin) {
    pinData = await hashPin(data.securityPin);
  }

  // Calculate trial end date
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      companyName: data.companyName,
      phone: data.phone,
      plan: 'TRIAL',
      trialEndsAt,
      securityPinHash: pinData ? `${pinData.hash}:${pinData.salt}` : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      role: true,
      plan: true,
      trialEndsAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshTokenValue();
  await saveRefreshToken(user.id, refreshToken, req.ip, req.headers['user-agent']);

  setAuthCookies(res, accessToken, refreshToken);

  await createAuditLog(user.id, 'REGISTER', undefined, undefined, 'Account created', 'LOW', req);

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
      accessToken, // Also send in body for API clients
    },
  });
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      role: true,
      plan: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      passwordHash: true,
      isActive: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  // Check account lockout
  if (user?.lockedUntil && new Date() < user.lockedUntil) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(
      `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      429,
      'ACCOUNT_LOCKED',
    );
  }

  // Validate credentials (use constant-time comparison)
  const isValidPassword =
    user && user.isActive
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2a$12$placeholder.hash.for.timing.safety');

  if (!user || !user.isActive || !isValidPassword) {
    // Increment failed attempts
    if (user) {
      const newCount = (user.failedLoginCount || 0) + 1;
      const updates: any = { failedLoginCount: newCount };

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger.warn(`Account locked after ${MAX_FAILED_ATTEMPTS} attempts: ${email}`);
      }

      await prisma.user.update({ where: { id: user.id }, data: updates });

      await createAuditLog(
        user.id,
        'FAILED_LOGIN',
        undefined,
        undefined,
        `Failed login attempt ${newCount}/${MAX_FAILED_ATTEMPTS} from ${ipAddress}`,
        newCount >= MAX_FAILED_ATTEMPTS ? 'HIGH' : 'MEDIUM',
        req,
      );
    }

    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Reset failed attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshTokenValue();
  await saveRefreshToken(user.id, refreshToken, ipAddress, req.headers['user-agent']);

  setAuthCookies(res, accessToken, refreshToken);

  await createAuditLog(user.id, 'LOGIN', undefined, undefined, `Login from ${ipAddress}`, 'LOW', req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
      },
      accessToken,
    },
  });
}

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
  }

  const { userId, valid } = await validateRefreshToken(token);

  if (!valid) {
    clearAuthCookies(res);
    throw new AppError('Invalid or expired refresh token', 401, 'TOKEN_INVALID');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    clearAuthCookies(res);
    throw new AppError('Account not found', 401, 'UNAUTHORIZED');
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(token);
  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = generateRefreshTokenValue();
  await saveRefreshToken(user.id, newRefreshToken, req.ip, req.headers['user-agent']);
  setAuthCookies(res, newAccessToken, newRefreshToken);

  res.json({
    success: true,
    data: { accessToken: newAccessToken },
  });
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) await revokeRefreshToken(token);

  clearAuthCookies(res);

  if (req.user?.userId) {
    await createAuditLog(req.user.userId, 'LOGOUT', undefined, undefined, 'User logged out', 'LOW', req);
  }

  res.json({ success: true, message: 'Logged out successfully' });
}

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      phone: true,
      role: true,
      plan: true,
      trialEndsAt: true,
      subscribedAt: true,
      subscriptionEndsAt: true,
      alertPrefs: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: {
          customers: true,
          loans: true,
          applications: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, data: user });
}

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) throw new AppError('User not found', 404);

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Revoke all tokens (force re-login)
  await revokeAllUserTokens(user.id);
  clearAuthCookies(res);

  await createAuditLog(
    user.id,
    'PASSWORD_CHANGED',
    undefined,
    undefined,
    'Password changed — all sessions invalidated',
    'HIGH',
    req,
  );

  res.json({ success: true, message: 'Password changed. Please log in again.' });
}

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phone: true },
  });

  // Always return success for security (avoid user enumeration)
  if (!user) {
    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent to the email.',
    });
    return;
  }

  // Generate token and expiry (1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: expiresAt,
    },
  });

  // Send email
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const emailHTML = generatePasswordResetEmail(user.name, resetLink);
  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: emailHTML,
  });

  // Send SMS if phone available
  if (user.phone) {
    await sendPasswordResetSMS(user.phone, user.name, resetLink);
  }

  await createAuditLog(
    user.id,
    'PASSWORD_RESET_REQUESTED',
    undefined,
    undefined,
    `Password reset requested for ${user.email}`,
    'MEDIUM',
    req,
  );

  res.json({
    success: true,
    message: 'If an account exists, a reset link has been sent to the email.',
  });
}

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: { gt: new Date() },
    },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  // Revoke all tokens (force re-login)
  await revokeAllUserTokens(user.id);

  await createAuditLog(
    user.id,
    'PASSWORD_RESET_COMPLETED',
    undefined,
    undefined,
    'Password reset completed — all sessions invalidated',
    'HIGH',
    req,
  );

  res.json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
}

// ─────────────────────────────────────────────
// FORGOT SECURITY PIN
// ─────────────────────────────────────────────
export async function forgotPin(req: Request, res: Response): Promise<void> {
  const { email } = forgotPinSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phone: true, securityPinHash: true },
  });

  // Always return success for security
  if (!user || !user.securityPinHash) {
    res.json({
      success: true,
      message: 'If an account with a PIN exists, a reset link has been sent.',
    });
    return;
  }

  // Generate token and expiry (1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinResetToken: resetToken,
      pinResetExpiresAt: expiresAt,
    },
  });

  // Send email
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-pin/${resetToken}`;
  const emailHTML = generatePINResetEmail(user.name, resetLink);
  await sendEmail({
    to: user.email,
    subject: 'Security PIN Reset Request',
    html: emailHTML,
  });

  // Send SMS if phone available
  if (user.phone) {
    await sendPINResetSMS(user.phone, user.name, resetLink);
  }

  await createAuditLog(
    user.id,
    'PIN_RESET_REQUESTED',
    undefined,
    undefined,
    `PIN reset requested for ${user.email}`,
    'MEDIUM',
    req,
  );

  res.json({
    success: true,
    message: 'If an account with a PIN exists, a reset link has been sent.',
  });
}

// ─────────────────────────────────────────────
// RESET SECURITY PIN
// ─────────────────────────────────────────────
export async function resetPin(req: Request, res: Response): Promise<void> {
  const { token, newPin } = resetPinSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      pinResetToken: token,
      pinResetExpiresAt: { gt: new Date() },
    },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  // Hash new PIN
  const pinData = await hashPin(newPin);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      securityPinHash: `${pinData.hash}:${pinData.salt}`,
      pinResetToken: null,
      pinResetExpiresAt: null,
    },
  });

  await createAuditLog(
    user.id,
    'PIN_RESET_COMPLETED',
    undefined,
    undefined,
    'Security PIN reset completed',
    'MEDIUM',
    req,
  );

  res.json({ success: true, message: 'PIN reset successful.' });
}
