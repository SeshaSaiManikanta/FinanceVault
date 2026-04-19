// VaultFinance — Authentication & Authorization Middleware
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        dbUser?: any;
      };
      ipAddress?: string;
    }
  }
}

/**
 * Extract and verify JWT from HttpOnly cookie or Authorization header.
 * Attaches decoded payload to req.user.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Try cookie first (preferred — HttpOnly, not accessible by JS)
    let token = req.cookies?.accessToken;

    // Fallback to Authorization header (for API clients)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    req.ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    next();
  } catch (err: any) {
    if (err.message === 'TOKEN_EXPIRED') {
      res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Session expired. Please refresh your token.',
      });
      return;
    }
    next(new AppError('Invalid authentication token', 401, 'UNAUTHORIZED'));
  }
}

/**
 * Verify the user exists and account is active.
 * Also checks trial/subscription status.
 */
export async function requireActiveUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.userId) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      plan: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  if (!user || !user.isActive) {
    next(new AppError('Account not found or deactivated', 403, 'ACCOUNT_INACTIVE'));
    return;
  }

  // Check subscription/trial for non-admin users
  if (user.role !== 'ADMIN') {
    const now = new Date();
    const trialExpired = user.plan === 'TRIAL' && user.trialEndsAt && now > user.trialEndsAt;
    const subExpired =
      user.plan !== 'TRIAL' && user.subscriptionEndsAt && now > user.subscriptionEndsAt;

    if (trialExpired || subExpired) {
      res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your trial or subscription has expired. Please upgrade to continue.',
      });
      return;
    }
  }

  req.user.dbUser = user;
  next();
}

/**
 * Guard that requires ADMIN role.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'ADMIN') {
    next(new AppError('Admin access required', 403, 'FORBIDDEN'));
    return;
  }
  next();
}

/**
 * Guard that ensures the resource belongs to the requesting user.
 * Use after authenticate + requireActiveUser.
 */
export function requireOwnership(resourceUserIdPath: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Admins can access everything
    if (req.user?.role === 'ADMIN') {
      next();
      return;
    }

    const resourceUserId = req.params[resourceUserIdPath] || req.body[resourceUserIdPath];

    if (resourceUserId && resourceUserId !== req.user?.userId) {
      next(new AppError('Access denied to this resource', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
}
