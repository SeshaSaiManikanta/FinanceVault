// VaultFinance — Request Logger Middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms — ${req.ip}`);
  });
  next();
}
