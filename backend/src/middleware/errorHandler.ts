// VaultFinance — Global Error Handler
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log all errors
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code || 'ERROR',
      message: err.message,
    });
    return;
  }

  // Prisma errors
  const prismaError = err as any;
  if (prismaError.code === 'P2002') {
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: 'A record with these details already exists',
    });
    return;
  }

  if (prismaError.code === 'P2025') {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Record not found',
    });
    return;
  }

  // JWT errors handled by middleware
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      code: 'TOKEN_INVALID',
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  // Unknown errors — don't expose internals in production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'An unexpected error occurred. Please try again.',
    ...(isDev && { stack: err.stack }),
  });
}
