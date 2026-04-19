// VaultFinance — JWT Token Management
// Access tokens: 15 minutes | Refresh tokens: 7 days
// © 2025 VaultFinance. All Rights Reserved.

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from './prisma';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  if (!ACCESS_TOKEN_SECRET) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'vaultfinance.app',
    audience: 'vaultfinance.users',
  });
}

export function generateRefreshTokenValue(): string {
  return crypto.randomBytes(40).toString('hex');
}

export async function saveRefreshToken(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      ipAddress,
      userAgent,
    },
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'vaultfinance.app',
      audience: 'vaultfinance.users',
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('TOKEN_INVALID');
  }
}

export async function validateRefreshToken(
  token: string,
): Promise<{ userId: string; valid: boolean }> {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored) return { userId: '', valid: false };
  if (stored.isRevoked) return { userId: stored.userId, valid: false };
  if (new Date() > stored.expiresAt) {
    await prisma.refreshToken.update({ where: { token }, data: { isRevoked: true } });
    return { userId: stored.userId, valid: false };
  }

  return { userId: stored.userId, valid: true };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

export function setAuthCookies(
  res: any,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/api/auth/refresh',
  });
}

export function clearAuthCookies(res: any): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
}
